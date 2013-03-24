var fs = require('fs');
var commands = require('./commands');
var units = require('./units');
var upgrades = require('./upgrades');
var research = require('./research');
var abbrevs = require('./abbrevs');

var pyaiText;
var aiscript;
var currentRace;

var binaryFilename = 'build/aiscript.bin';

fs.writeFileSync(binaryFilename, '');

function reset() {
    pyaiText = '';
    aiscript = {
        buf: new Buffer(32000),
        length: 0,
        cursor: 0
    };
    currentRace = '';
}
reset();

// Add ai commands
Object.keys(commands).forEach(function (command, i) {
    exports[command] = generateCommandFunction(command, commands[command].params);
});

// Add abbreviations
Object.keys(abbrevs).forEach(function (abbrev, i) {
    function clean(str) {
        str = str.toLowerCase();
        str = str.replace(/ /g, '_');
        return str;
    }
    
    exports[clean(abbrev)] = abbrev;
    abbrevs[abbrev].forEach(function(shortcut) {
        exports[clean(shortcut)] = abbrev;
    });
});

function checkParams(validParams, params) {
    var ret = [];
    
    validParams.forEach(function (validParam, i) {
        if(validParam === 'priority' && params[i] === undefined) {
            params[i] = 80;
        }
        
        ret.push(params[i]);
    });
    
    return ret;
}

function append(str) {
    pyaiText += str;
}

function binWrite(b) {
    aiscript.buf[aiscript.cursor] = b;
    aiscript.cursor += 1;
    aiscript.length += 1;
}

function binWriteWord(w) {
    aiscript.buf.writeUInt16LE(w, aiscript.cursor)
    aiscript.cursor += 2;
    aiscript.length += 2;
}

function appendCommand(command) {
    pyaiText += command + '(';
    binWrite(commands[command].op);
}

function appendArg(val, type) {
    pyaiText += val + ',';
    
    switch (type) {
        case 'byte':
        case 'priority':
            binWrite(val);
            break;
        case 'address':
        case 'word':
            binWriteWord(val);
            break;
        case 'building':
        case 'unit':
        case 'military':
            binWriteWord(units[val].id);
            break;
        default:
            console.log(type);
    }
}

function closeCommand() {
    pyaiText = pyaiText.replace(/,$/, '');
    pyaiText += ')\n';
}

addresses = {};

/* Creates a block and returns its address */
// Blocks are created inline and skipped over using a goto
// If true, isUnique causes the block to be added without a check to see if it already exists
function createBlock(block, isUnique) {
    if (isUnique || !addresses[block]) {
        var skipAddressLocation = aiscript.cursor + 1;
        console.log('create block: ' + skipAddressLocation);
        exports.goto(0);
        addresses[block] = aiscript.cursor + 4;
        block();
        console.log('overwrite: ' + skipAddressLocation);
        aiscript.buf.writeUInt16LE(aiscript.cursor + 4, skipAddressLocation)
    }
    
    return addresses[block];
}

function generateCommandFunction(command, validParams) {
    return function () {
        var params = checkParams(validParams, arguments);

        if (params) {
            // Translate functions to addresses and insert contents
            validParams.forEach(function (type, i) {
                if (type == 'address' && typeof(params[i]) == 'function') {
                    params[i] = createBlock(params[i]);
                }
            });
            
            appendCommand(command);
            validParams.forEach(function addParam(type, i) {
                // Evaluate functions to get a simple value
                if (type != 'address' && typeof(params[i]) == 'function') {
                    params[i] = params[i]();
                }
                
                appendArg(params[i], type);
            });
            closeCommand();
        }
    }
}

/* Macros */

exports.build_start = function(quantity, building, priority) {
    exports.build(quantity, building, priority);
    exports.wait_buildstart(quantity, building);
}

exports.build_finish = function(quantity, building, priority) {
    exports.build_start(quantity, building, priority);
    exports.wait_build(quantity, building);
}

exports.loop = function(block) {
    var inner = function () {
        block();
        exports.wait(10);
        exports.goto(inner);
    };
    
    exports.goto(inner);
}

exports.pick = function(blocks) {
    console.log('pick start: ' + (aiscript.cursor + 4).toString(16));

    if (typeof blocks.length == 'undefined') {
        var blocks_obj = blocks;
        blocks = [];
        Object.keys(blocks_obj).forEach(function (key) {
            blocks.push(blocks_obj[key]);
        });
    }

    var finishJumpLocations = [];
    
    exports.loop(function() {
        blocks.forEach(function(block) {
            var newBlock = function() {
                block();
                finishJumpLocations.push(aiscript.cursor + 1);
                exports.goto(0xffff);
            };
            
            exports.random_jump(5, createBlock(newBlock, true));
        });
    });
    
    finishJumpLocations.forEach(function(address) {
        console.log(address.toString(16));
        console.log((aiscript.cursor + 4).toString(16));
        aiscript.buf.writeUInt16LE(aiscript.cursor + 4, address)
    });
    
    console.log('pick done');
}

/* 
 * Due to a bug in SC, only one return address can be stored at once,
 * meaning that call + multiple threads is completely broken. Call is
 * overloaded here to just inline the function content.
 */
exports.call = function(block) {
    block();
}

/* Helpers */

exports.simple_header = function(race) {
    exports.race = race;
    
    switch (race) {
        case 'terran':
            append('TMCx(1342, 101, aiscript):\n');
            exports.peon = 'Terran SCV';
            exports.town_hall = 'Terran Command Center';
            exports.gas = 'Terran Refinery';
            break;
    }
}

exports.header = function(race) {
    exports.simple_header(race);
    
    exports.start_town();
    exports.transports_off();
    exports.farms_notiming();
    exports.defaultbuild_off();
    exports.default_min(7);

    exports.build_start(1, exports.town_hall);
    exports.build_start(4, exports.peon);
}

exports.flush = function (filename) {
    exports.stop();
    fs.writeFileSync(filename, pyaiText);
    
    var len = new Buffer(4);
    len.writeUInt32LE(aiscript.length + 4, 0);
    fs.appendFileSync(binaryFilename, len);
    
    var buf = aiscript.buf.slice(0, aiscript.length);
    fs.appendFileSync(binaryFilename, buf);
    
    switch (exports.race) {
        case 'terran':
            fs.appendFileSync(binaryFilename, 'TMCx\x04\x00\x00\x00\x3f\x05\x00\x00\x05\x00\x00\x00\x00\x00\x00\x00\x00');
    }
    
    reset();
};
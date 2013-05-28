var fs = require('fs');
var commands = require('./commands');
var units = require('./units');
var upgrades = require('./upgrades');
var research = require('./research');
var abbrevs = require('./abbrevs.json');

var aiscript;

var scripts = {};
var addresses = {};

var binaryFilename = 'build/aiscript.bin';

var verbosity = 10;

fs.writeFileSync(binaryFilename, '');

function reset() {
    var start = 0;
    addresses = {};

    if (exports.race && aiscript) {
        exports.stop();
        start = aiscript.cursor;
        scripts[exports.race] = aiscript;
    }

    aiscript = {
        buf: new Buffer(32000),
        length: 0,
        start: start,
        cursor: start,
        getAddress: function () {
            return this.cursor + 4;
        }
    };
    exports.race = '';
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

function binWrite(b) {
    aiscript.buf[aiscript.cursor - aiscript.start] = b;
    aiscript.cursor += 1;
    aiscript.length += 1;
}

function binWriteWord(w) {
    aiscript.buf.writeUInt16LE(w, aiscript.cursor - aiscript.start);
    aiscript.cursor += 2;
    aiscript.length += 2;
}

function appendCommand(command) {
    binWrite(commands[command].op);
}

function appendArg(val, type) {
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
        case 'technology':
            binWriteWord(research[val].id);
            break;
        case 'upgrade':
            binWriteWord(upgrades[val].id);
            break;
        case 'string':
            for (var i = 0; i < val.length; i++) {
                binWrite(val.charCodeAt(i))
            }
            binWrite(0x00);
            break;
        default:
            console.error('Type not recognized: ' + type);
    }
}

/* Creates a block and returns its address */
// Blocks are created inline and skipped over using a goto
// If true, isUnique causes the block to be added without a check to see if it already exists
function createBlock(block, isUnique) {
    var address = addresses[block];

    if (isUnique || !addresses[block]) {
        var skipAddressLocation = aiscript.cursor + 1;
        exports.goto(0);
        address = aiscript.cursor + 4;
        block();
        aiscript.buf.writeUInt16LE(aiscript.cursor + 4, skipAddressLocation - aiscript.start);
    }

    if (!isUnique) {
        addresses[block] = address
    };

    return address;
}

exports.createBlock = createBlock;

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
        }
    };
}

/* Macros */

exports.say = function (str) {
    var jumpAddr = aiscript.cursor + 4 + 3 + str.length + 1;

    exports.debug(jumpAddr, str)
};

exports.build_start = function(quantity, building, priority) {
    exports.build(quantity, building, priority);
    exports.wait_buildstart(quantity, building);
};

exports.build_finish = function(quantity, building, priority) {
    exports.build_start(quantity, building, priority);
    exports.wait_build(quantity, building);
};

exports.loop = function(block) {
    var startAddr;
    var gotoAddr;

    var inner = function () {
        block();
        exports.wait(10);
        gotoAddr = aiscript.cursor + 1;
        exports.goto(0xffff);
    };

    startAddr = createBlock(inner, true);
    aiscript.buf.writeUInt16LE(startAddr, gotoAddr - aiscript.start);
    exports.goto(startAddr);
};

exports.pick = function(blocks) {
    if (typeof blocks.length == 'undefined') {
        var blocks_obj = blocks;
        blocks = [];
        Object.keys(blocks_obj).forEach(function (key) {
            blocks_obj[key].displayName = key;
            blocks.push(blocks_obj[key]);
        });
    }

    var startAddress = aiscript.cursor;
    var startJumpLocations = [];
    var finishJumpLocations = [];

    exports.loop(function() {
        blocks.forEach(function(block) {
            var newBlock = function() {
                if (block.options && block.options.versus) {
                    var raceAddr = [
                        block.options.versus.terran ? aiscript.cursor + 4 + 7 : 0xffff,
                        block.options.versus.zerg ? aiscript.cursor + 4 + 7 : 0xffff,
                        block.options.versus.protoss ? aiscript.cursor + 4 + 7 : 0xffff
                    ];

                    raceAddr.forEach(function (addr, index) {
                        if (addr == 0xffff) {
                            startJumpLocations.push(aiscript.cursor + 1 + ( 2 * index ));
                        }
                    });

                    exports.race_jump(raceAddr[0], raceAddr[1], raceAddr[2]);
                }

                if (verbosity > 5 && block.displayName) {
                    exports.say(block.displayName);
                }

                block();
                finishJumpLocations.push(aiscript.cursor + 1);
                exports.goto(0xffff);
            };

            exports.random_jump(5, createBlock(newBlock, true));
        });
    });

    startJumpLocations.forEach(function(address) {
        aiscript.buf.writeUInt16LE(startAddress, address - aiscript.start);
    });

    finishJumpLocations.forEach(function(address) {
        aiscript.buf.writeUInt16LE(aiscript.cursor + 4, address - aiscript.start);
    });
};

/*
 * Due to a bug in SC, only one return address can be stored at once,
 * meaning that call + multiple threads is completely broken. Call is
 * overloaded here to just inline the function content.
 */
exports.call = function(block) {
    block();
};

/* Helpers */

exports.init_shortcuts = function(race) {
    exports.race = race;

    switch (race) {
        case 'terran':
            exports.peon = 'Terran SCV';
            exports.town_hall = 'Terran Command Center';
            exports.gas = 'Terran Refinery';
            break;
        case 'zerg':
            exports.peon = 'Zerg Drone';
            exports.town_hall = 'Zerg Hatchery';
            exports.gas = 'Zerg Extractor';
            break;
        case 'protoss':
            exports.peon = 'Protoss Probe';
            exports.town_hall = 'Protoss Nexus';
            exports.gas = 'Protoss Assimilator';
            break;
    }
};

exports.header = function(race) {
    reset();

    exports.init_shortcuts(race);

    exports.start_town();
    exports.transports_off();
    exports.farms_notiming();
    exports.defaultbuild_off();
    exports.default_min(7);

    switch (race) {
        case 'terran':
            exports.define_max(80, 'Terran SCV')
            exports.define_max(96, 'Terran Marine')
            exports.define_max(32, 'Terran Medic')
            exports.define_max(48, 'Terran Vulture')
            exports.define_max(48, 'Terran Siege Tank')
            break;
    }

    exports.build_start(1, exports.town_hall);
    exports.build_start(4, exports.peon);

    exports.say('BWMetaAI 2.0');
};

function flush() {
    reset();

    var totalLength = 4;

    Object.keys(scripts).forEach(function (race) {
        totalLength += scripts[race].length;
    })

    // Write the total length
    var len = new Buffer(4);
    len.writeUInt32LE(totalLength, 0);
    fs.appendFileSync(binaryFilename, len);

    // Write the scripts
    Object.keys(scripts).forEach(function (race) {
        var buf = scripts[race].buf.slice(0, scripts[race].length);
        fs.appendFileSync(binaryFilename, buf);
    });
    // Write the script table
    var currentOffset = 4;

    Object.keys(scripts).forEach(function (race) {
        var name, id;

        switch (race) {
            case 'terran':
                id = 'TMCx';
                label = '\x3f\x05';
                //fs.appendFileSync(binaryFilename, 'TMCx\x04\x00\x00\x00\x3f\x05');
                break;
            case 'zerg':
                id = 'ZMCx';
                label = '\x41\x05';
                break;
            case 'protoss':
                id = 'PMCx';
                label = '\x40\x05';
                break;
        }

        fs.appendFileSync(binaryFilename, id);

        var offset = new Buffer(4);
        offset.writeUInt32LE(currentOffset, 0);
        fs.appendFileSync(binaryFilename, offset);
        currentOffset += scripts[race].length;

        fs.appendFileSync(binaryFilename, label);
        fs.appendFileSync(binaryFilename, '\x00\x00\x05\x00\x00\x00');
    });

    // Write final table entry with null id
    fs.appendFileSync(binaryFilename, '\x00\x00\x00\x00');

    reset();
};

exports.flush = flush;

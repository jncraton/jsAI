var fs = require('fs');

var units = require('./units.json');
var ai = require('./ai.js');
var abbrevs = require('./abbrevs.js');

function isUnit(unit) {
    return (units[unit].supply > 0);
}

function defaultExpansion() {
    with (ai) {
        start_town();
        build_finish(1, town_hall);
        
        for (var i = 1; i <= 8; i += 1) {
            build_finish(i, peon);
        }
        
        build_start(1, gas);
        
        for (var i = 1; i <= 20; i += 1) {
            build_finish(i, peon);
        }
        
        stop();
    }
}

var parseArray = function parseArray(lines) {
    var owned = {};
    var supplyFromUnits = 0;
    
    lines.forEach(function (line) {
        var supply = line[0];
        var unit = line[1];
        var ret = "";
        
        if(!owned[unit]) {
            owned[unit] = 0;
        }
        owned[unit] += 1;

        var waitForWorker = supply - supplyFromUnits;
        
        ai.build_start(waitForWorker, ai.peon);
        
        if (isUnit(unit)) {
            supplyFromUnits += parseInt(units[unit].supply);
            
            ai.train(owned[unit], unit);
        } else if (unit == 'Terran Command Center' || unit == 'Zerg Hatchery' || unit == 'Protoss Nexus') {
            ai.expand(1, defaultExpansion);
        } else {
            ai.build_start(owned[unit], unit);
        }
    });
};

exports.parseArray = parseArray;

var parseFromFile = function (filename) {
    var builds = {};
        
    fs.readFileSync(filename, 'utf-8').split('\n#').forEach(function(buildText) {
        var options = {};
        var lines = buildText.split('\n');
        
        // Clean up white space
        lines.forEach(function (line, i) {
            lines[i] = lines[i].replace(/^ +/, '');
            lines[i] = lines[i].replace(/ +$/, '');
            lines[i] = lines[i].replace(/  +$/, ' ');
        });
        
        var name = lines.splice(0,1)[0];
        var matchups
        
        if(!name.match(/\(.*\)/)) { 
            matchups = 'vT, vZ, vP'
        } else {
            matchups = name.replace(/.*\((.*)\)/, '$1');
        }
        
        options.versus = {
            terran: !!matchups.match(/vt/i),
            zerg: !!matchups.match(/vz/i),
            protoss: !!matchups.match(/vp/i)
        };
        
        lines = lines.filter(function (line) {
            return parseInt(line) > 0;
        });
        
        var buildArray = []; 
        
        lines.forEach(function (line) {
            var supply = parseInt(line);
            var unit = abbrevs.expand(line.replace(supply, ''));
            
            buildArray.push([supply, unit]);
        });
        
        builds[name] = function() {
            parseArray(buildArray);
        };
        
        builds[name].options = options;
    });
    
    return builds;
}

exports.parseFromFile = parseFromFile;
var units = require('./units.json');
var ai = require('./ai.js');

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

var parse = function parse(lines) {
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

exports.parse = parse;
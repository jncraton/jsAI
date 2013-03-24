var units = require('./units.json');
var ai = require('./ai.js');

function isUnit(unit) {
    return (units[unit].supply > 0);
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
        } else if (unit === 'Expand' || unit === 'expand') {
            console.error('Expanding not yet supported');
        } else {
            ai.build_start(owned[unit], unit);
        }
    });
};

exports.parse = parse;
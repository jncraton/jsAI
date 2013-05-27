var units = require('./units.json');
var upgrades = require('./upgrades.json');
var research = require('./research.json');
var ai = require('./ai.js');

exports.paramType = function (param) {
    if (units[param] && units[param].supply > 0) {
        return 'unit'
    }
    if (units[param]) {
        return 'building'
    }
    if (upgrades[param]) {
        return 'upgrade'
    }
    if (research[param]) {
        return 'tech'
    }
};


exports.defaultExpansion = function () {
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
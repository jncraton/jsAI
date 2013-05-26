var units = require('./units.json');
var upgrades = require('./upgrades.json');
var research = require('./research.json');

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
var fs = require('fs');

var units = require('./units.json');
var ai = require('./ai.js');
var abbrevs = require('./abbrevs.js');
var helpers = require('./helpers.js')

var parseArray = function parseArray(lines) {
    ai.multirun(ai.createBlock(function () {
        lines.forEach(function (line) {

            switch (helpers.paramType(line.param)) {
                case 'building':
                    ai.build_finish(line.quantity, line.param);
                    break;
                case 'tech':
                    ai.tech(line.param);
                    break;
                case 'upgrade':
                    ai.upgrade(line.quantity, line.param);
                    break;
            }
        });

        ai.stop();
    }, true));

    var composition = {};
    lines.forEach(function (line) {
        if (helpers.paramType(line.param) == 'unit') {
            composition[line.param] = line.quantity;
        }
    });

    ai.loop(function () {
        ai.attack_clear()
        Object.keys(composition).forEach(function (unit) {
            var quantity = composition[unit];

            ai.train(quantity, unit);
            ai.attack_add(quantity, unit);
        })
        ai.attack_prepare()
        ai.wait(1000)
        ai.attack_do()
        ai.attack_clear()

        ai.expand(99, helpers.defaultExpansion);
    });
};

exports.parseArray = parseArray;

var parseFromFile = function (filename) {
    var builds = {};

    fs.readFileSync(filename, 'utf-8').split('\n# ').forEach(function(buildText) {
        var options = {};
        var lines = buildText.split('\n');

        // Clean up white space
        lines.forEach(function (line, i) {
            lines[i] = lines[i].replace(/^\- +/, '');
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
            var quantity = parseInt(line);
            var param = abbrevs.expand(line.replace(quantity, ''));

            buildArray.push({quantity: quantity, param: param});
        });

        builds[name] = function() {
            parseArray(buildArray);
        };

        builds[name].options = options;
    });

    return builds;
}

exports.parseFromFile = parseFromFile;
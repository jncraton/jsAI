var ai = require('./lib/ai');
var bo = require('./lib/bo');
var midgame = require('./lib/midgame');

with (ai) {
    header('terran');

    pick(bo.parseFromFile('terranBuilds.md'));
    pick(midgame.parseFromFile('terranMidgame.md'));

    header('zerg');

    //pick(bo.parseFromFile('zergBuilds.md'));

    flush();
}
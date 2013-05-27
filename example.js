var ai = require('./lib/ai');
var bo = require('./lib/bo');
var midgame = require('./lib/midgame');

with (ai) {
    header('terran');

    var builds = bo.parseFromFile('terranBuilds.md');

    pick(builds);

    var mid = midgame.parseFromFile('terranMidgame.md');

    pick(mid);

    flush();
}
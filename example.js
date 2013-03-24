var ai = require('./lib/ai');
var bo = require('./lib/bo');

with (ai) {
    header('terran');
    
    // Functions provide a higher order replacement for blocks
    var simpleExpo = function() {
        start_town();
        build_finish(1, cc);
        
        for (var i = 1; i <= 20; i+=1) {
            build_finish(i, scv);
        }
        stop();
    };
    
    var builds = bo.parseFromFile('terranBuilds.md');
    
    pick(builds);
    
    flush('build/terran.pyai');
}
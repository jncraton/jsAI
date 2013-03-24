var ai = require('./lib/ai');

with (ai) {
    // Functions provide a higher order replacement for blocks
    var simpleExpo = function() {
        start_town();
        build_finish(1, cc);
        
        for (var i = 1; i <= 20; i+=1) {
            build_finish(i, scv);
        }
        stop();
    };
    
    var builds = {
        'bbs': function () {
            build_start(8, scv);
            build_start(1, rax);
            build_start(2, rax);
            build_start(9, scv);
            build_start(1, depot);
            build_start(11, scv);
        },
        '14cc': function () {
            build_start(9, scv);
            build_start(1, depot);
            build_start(14, scv);
            expand(1, simpleExpo);
        },
    }
    
    header('terran');
    
    pick(builds);
    
    flush('build/terran.pyai');
}
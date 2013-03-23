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
    
    header('terran');
    build_finish(9, scv);
    build_start(1, depot);
    build_start(15, scv);
    
    expand(1, simpleExpo);
    
    call(function addBarracks() {
        build_start(1, rax);
        farms_timing();
        build_start(18, scv);
        // This is JavaScript, so you can use loops
        for (var i = 2; i <= 8; i+=1) {
            build_start(i, rax);
        }
    });

    pick([
        function() {
            train(1, marine);
            send_suicide(0);
        },
        function() {
            train(4, marine);
            send_suicide(0);
        },
        function() {
            train(8, marine);
            send_suicide(0);
        }
    ]);
            
    loop(function () {
        train(8, marine);
        send_suicide(0);
    });
    
    flush('build/terran.pyai');
}
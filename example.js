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

    pick({
        bio: function () {
            for (var i = 1; i <= 8; i += 1) {
                build_start(i, rax);
            }

            loop(function() {
                train(24, marine);

                attack_clear();
                attack_add(24, marine);
                attack_prepare();
                wait(150);
                attack_do();
                attack_clear();
            });
        }
    });

    flush();
}
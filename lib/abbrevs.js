var abbrevs = require('./abbrevs.json');
var replacements = {};

Object.keys(abbrevs).forEach(function(name) {
    abbrevs[name].forEach(function(abbrev) {
        replacements[abbrev.toLowerCase()] = name;
    });
});

var expand = function expand(abbrev) {
    abbrev = abbrev.replace(/^ +/, '');
    abbrev = abbrev.replace(/ +$/, '');
    abbrev = abbrev.toLowerCase();

    if (!replacements[abbrev]) {
        console.error('Abbreviation not found: ' + abbrev);
    }

    return replacements[abbrev];
}

exports.expand = expand;
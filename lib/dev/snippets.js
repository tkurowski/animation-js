String.prototype.format = function () {
    var SPECIFIER = /(%+)([sdfa])/g;
    var PARSER = {
        // to string
        s: function (v) {return '' + v;},
        // to integer
        d: parseInt,
        // to float
        f: parseFloat,
        // to array str
        a: function (list) {
            return "(" + Array.prototype.join.call(list, " ") + ")";
        },
        toString: function () {return "[object PARSER]";}
    };
    var i = 0;
    var args = arguments;
    return this.replace(SPECIFIER, function (match, pre, specifier) {
        if (pre.length % 2) {
            // escape paired % and apply the specifier
            return pre.substr(0, pre.length - 1).replace(/%%/g, '%') +
                PARSER[specifier](args[i++]);
        }
        else {
            // escape % only
            return pre.replace(/%%/g, '%') + specifier;
        }
    }).replace(/%%/g, '%');
};

//assert("%s %d to %f%%".format("from", 0, 99.9) === "from 0 to 99.9%");
//assert("%%%d".format(1) === "%1");

String.prototype.log = function() {
    console.log(this.format.apply(this, arguments));
};

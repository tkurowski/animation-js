if (!window.assert) {
    window.assert = function(condition, message) {
        if (!condition) {
            throw new Error(message || "AssertionError");
        }
    };
}

function is_in_range(v, from, to) {
    return v >= from && v <= to;
}

function is_number(value) {
    return typeof value === "number" && !isNaN(value);
}

function is_ordered(/*...*/) {
    if (arguments.length < 3) return true;

    var totalOrder = '?';

    for (var i = 0; i < arguments.length - 1; i++) {
        var a = arguments[i],
            b = arguments[i + 1],
            localOrder = a > b ? '>' : (a < b ? '<' : '?');
        switch (totalOrder) {
        case '>':
        case '<':
            if (localOrder !== '?' && localOrder !== totalOrder) {
                return false;
            }
            break;
        case '?':
            totalOrder = localOrder;
            break;
        }
    }
    return true;
}

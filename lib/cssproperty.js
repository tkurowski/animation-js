function CSSProperty(cssname, unit) {
    if (!arguments.length) return; // subclassing?
    this.cssname = cssname;
    this.name = cssname.replace(/-([a-z])/g, function (m, p, offset) {
        // return offset > 0 ? p.toUpperCase() : p;
        // opera uses "OTransform" rather than "oTransform"
        // webkit seems to accept both "webkitTransform" and "WebkitTransform"
        return p.toUpperCase();
    });
    this.unit = unit;
}

CSSProperty.new = function (prop, unit) {
    if (typeof prop === 'string') {
        if (unit === undefined) unit = prop === 'opacity' ? '' : 'px';
        return new CSSProperty(prop, unit);
    }
    else if (prop instanceof this) {
        return prop;
    }
    else throw new TypeError("Bad argument for CSSPropertty: " + prop);
};

CSSProperty.prototype = {
    volatileValue: function (el) {
        var computed = parseFloat(window.getComputedStyle(el)[this.name]);
        return isNaN(computed) ? 0 : computed;
    },
    set: function (el, value) {
        el.style[this.name] = value + this.unit;
    },
    // get: function (el) {return parseFloat(el.style[this.name];},

    toString: function () {return "[object Property(" + this.name + ")]";}
};


(function () {

    var _cssprop;
    for (_cssprop in {'transform': 0,
                   '-webkit-transform': 0,
                   '-o-transform': 0})
        if (_cssprop in document.documentElement.style) break;

    // NOTE, for Opera that uses '-o-transform'
    // the condition above returns 'false' but as it's the last one
    // we land with expected property name

    var X = 4, Y = 5;

    /**
     * Note, it currently supports only 'px' units and *discards*
     * all other transformations
     */
    function Translate(axis, unit) {
        switch (axis.toLowerCase()) {
        case 'x':
            // index in "matrix(...)" rule; see .volatileValue
            this._INDEX = X;
            break;
        case 'y':
            this._INDEX = Y;
            break;
        default:
            throw new Error("Bad axis falue '" + axis +
                            "'; expected 'x' or 'y'");
        }

        if (unit && unit !== 'px') {
            throw new Error("Sorry, currenlty only 'px' are supported units");
        }
        unit = 'px';

        CSSProperty.call(this, _cssprop, unit);
    };

    Translate.prototype = new CSSProperty;

    Translate.prototype.volatileValue = function (el) {
        var matrix = window.getComputedStyle(el)[this.name];

        if (matrix === "none") return 0;
        else {
            matrix = matrix.substr(6, // "matrix(".length
                                   matrix.length - 1).split(', ');
            return parseFloat(matrix[this._INDEX]);
        }
    };

    Translate.prototype.set = function (el, value) {
        // var matrix = [1, 0, 0, 1, /*x=*/0, /*y=*/0];
        // matrix[this._INDEX] = value;
        if (this._INDEX === X) {
            el.style[this.name] = 'translateX(' + value + 'px)';
        }
        else {
            el.style[this.name] = 'translateY(' + value + 'px)';
        }
    };

    CSSProperty.Translate = Translate;
})();


CSSProperty.TranslateX = new CSSProperty.Translate('x');
CSSProperty.TranslateY = new CSSProperty.Translate('y');

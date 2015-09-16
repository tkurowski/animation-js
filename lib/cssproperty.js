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

    var X = 4, Y = 5, COS = 0, SIN = 1; // actualy m[1] = -sin, and m[2] = sin
                                        // but css rotate goes clockwise...

    function transformMatrix(el) {
        var matrix = window.getComputedStyle(el)[_cssprop];

        if (matrix === "none")
            return null;
        else
            return matrix.substring(7, // "matrix(".length
                                    matrix.length - 1).split(', ');
    }

    /**
     * Note, it currently supports only 'px' units and *discards*
     * all other transformations
     * @param {Number} axis' index to transform matrix
     */
    function Translate(axisindex) {
        this._INDEX = axisindex;
        CSSProperty.call(this, _cssprop, 'px');
    };

    Translate.prototype = new CSSProperty;

    Translate.prototype.volatileValue = function (el) {
        var matrix = transformMatrix(el);
        if (!matrix) return 0;
        return parseFloat(matrix[this._INDEX]);
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

    CSSProperty.TranslateX = new Translate(X);
    CSSProperty.TranslateY = new Translate(Y);

    CSSProperty.Rotate = new CSSProperty(_cssprop, 'deg');
    CSSProperty.Rotate.volatileValue = function (el) {
        var matrix = transformMatrix(el);
        if (!matrix) return 0;
        var angle = Math.atan2(parseFloat(matrix[SIN]),
                               parseFloat(matrix[COS])) * 180 / Math.PI,
            match = el.style[this.name].match(/rotate\((\d+)deg\)/),
            cycles = (match ? parseFloat(match[1]) : 0) / 360 | 0;
        return cycles * 360 + angle;
    };
    CSSProperty.Rotate.set = function (el, value) {
        el.style[this.name] = 'rotate(' + value + 'deg)';
    };
})();


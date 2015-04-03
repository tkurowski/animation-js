function CSSProperty(name, unit) {
    this.name = name;
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

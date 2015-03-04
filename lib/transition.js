//! requires CubicBezier, assert

function Transition() {
    this.from = 0;
    this.to = 0;
    this._duration = 0;
    this._timing = null;
}

Transition.new = function (from, to, duration, timing) {
    return new this().init(from, to, duration, timing);
};


Transition.prototype = {
    constructor: Transition,

    init: function (from, to, duration, timing) {
        this.from = from;
        this.to = to;
        this.duration = duration;
        this.timing = timing;
        return this;
    },

    get duration() {return this._duration;},
    set duration(duration) {
        assert(duration >= 0, "Duration (" + duration + ") must be >= 0");
        this._duration = duration;
    },

    get distance() {
        return this.to - this.from;
    },

    get timing() {
        return this._timing;
    },

    set timing(cubicBezier) {
        assert(cubicBezier.isFunctionOfX,
               "Invalid cubicBezier: progress must be f(time). " +
               "Ensure: P[x] is in [0, 1]");
        this._timing = cubicBezier;
    },

    slice: function (from, to) {
        var yFrom = this.yOfValue(from),
            yTo = this.yOfValue(to),
            interval = this.timing.xOfY(yTo) - this.timing.xOfY(yFrom);

        return Transition.new(
            from,
            to,
            this.duration * interval,
            this.timing.sliceY(yFrom, yTo)
        );
    },

    /**
     * @return {Transition} sub-transition starting at given value
     */
    sliceAtValue: function (from) {
        var yFrom = this.yOfValue(from);

        return Transition.new(
            from,
            this.to,
            this.duration * (1 - this.timing.xOfY(yFrom)),
            this.timing.sliceY(yFrom, 1).ensureInjective(1e-4)
        );
    },

    /**
     * @return {Transition} sub-transition starting at given time
     */
    sliceAtTime: function (time) {
        var xSince = this.xOfTime(time);

        return Transition.new(
            this.from + this.distance * this.timing.yOfX(xSince),
            this.to,
            this.duration * (1 - xSince),
            this.timing.sliceX(xSince, 1).ensureInjective(1e-4)
        );
    },

    branchAtTimeToValue: function (time, to) {
        return this.sliceAtTime(time).moveTo(to);
    },

    branchAtTimeWithDuration: function (time, duration) {
        return this.sliceAtTime(time).moveInTime(duration);
    },

    branchAtTimeToValueWithDuration: function (time, to, duration) {
        return this.sliceAtTime(time).moveToInTime(to, duration);
    },


    branchAtValueToValue: function (from, to) {
        return this.sliceAtValue(from).moveTo(to);
    },

    branchAtValueWithDuration: function (from, duration) {
        return this.sliceAtValue(from).moveInTime(duration);
    },

    branchAtValueToValueWithDuration: function (from, to, duration) {
        return this.sliceAtValue(from).moveToInTime(to, duration);
    },

    moveToInTime: function (to, duration) {
        var scaleY = (to - this.from) / this.distance,
            scaleX = duration / this.duration;

        this.to = to;
        this.duration = duration;

        this.timing.scale(scaleX, scaleY);
        return this;
    },

    /**
     * set new to (dest) value, while preserving duration and in-/out-slopes
     */
    moveTo: function (to) {
        var scaleY = (to - this.from) / this.distance;
        this.to = to;
        this.timing.scale(1, scaleY);
        return this;
    },

    /**
     * set new duration, while preserving `to` and in-/out-slopes
     */
    moveInTime: function (duration) {
        var scaleX = duration / this.duration;
        this.duration = duration;
        this.timing.scale(scaleX, 1);
        return this;
    },

    // --- helpers

    yOfValue: function (value) {
        assert(is_ordered(this.from, value, this.to),
               "Value (" + value + ") out of range [" + this.from + ", " +
               this.to + "]");
        return (value - this.from) / this.distance;
    },

    xOfTime: function (time) {
        assert(time <= this.duration,
               "Cannot branch from outside transition time. " +
               "Forgot to adjust units? (1s is 1000ms)");
        return time / this.duration;
    },

    // --- (unused?)

    valueAtTime: function (time) {
        return this.from +
            this.distance * this.timing.yOfX(this.xOfTime(time));
    },

    timeAtValue: function (value) {
        return this.duration * this.timing.xOfY(this.yOfValue(value));
    },

    // ---

    css: function () {
        return this.duration + 's ' + this.timing.css();
    },

    json: function () {
        return {
            from: this.from,
            to: this.to,
            duration: this.duration,
            timing: this.timing.json()
        };
    },

    desc: function () {
        var data = this.json();
        data.timing = this.timing.desc();
        return this.constructor.name + "(" + JSON.stringify(data) + ")";
    },

    toString: function () {return "[object " + this.desc() + "]";}
};

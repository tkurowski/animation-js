
function StepTransition() {
    Transition.apply(this);
}
StepTransition.new = function (from, to, duration) {
    return new this().init(from, to, duration);
};
//StepTransition.prototype = new Transition;
(function () {
    this.init = function (from, to, duration) {
        this.from = from;
        this.to = to;
        this.duration = duration;
        this.timing = 'step(1, end)';
        return this;
    }; 

    this.branchAtValueToValue =
    this.branchAtValueToValueWithDuration = 
    this.slice = function (from, to) {
        return StepTransition.new(from, to, this.duration);
    };

    this.css = function () {
        return this.duration + 's steps(1, end)';
    };
}).call(StepTransition.prototype);

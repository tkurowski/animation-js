//
function deprecated() {
    "DEPRECATED! %s".log(arguments[0]);
};


function assert_method(obj, method) {
    if (! (obj && typeof obj[method] === 'function')) {
        throw new TypeError("Object " + obj + " does not implement ." +
                            method + "()");
    }
}

function Animation() {
    this.el = null;
    this.property = '';

    this.duration = 0;

    this._transition = null;
    this._next = undefined;
    this._delegate = null;
}

Animation.new = function (el, property, duration) {
    var animation;

    if (!el._anim) el._anim = {};

    if ((animation = el._anim[property])) {
        throw new Error("Animation for given (el, property) " +
                        "has already been defined. Redeclaration " +
                        "is currently unsupported");
    }
    else {
        animation = new this().__init(el, property, duration);
        if (Object.keys(el._anim).length) {
            throw new Error("Combining multiple animations on " +
                            "one element is currently unsupported");
        }
        el._anim[property] = animation;
    }

    return animation;
};

Animation.__transitionend = function(evt) {
    var el = evt.currentTarget,
        animation = el._anim && el._anim[evt.propertyName];
    if (animation) {
        animation.transitionend(evt);
    }
};

Animation.prototype = {
    constructor: Animation,

    __init: function (el, property, duration) {
        this.el = el;
        this.property = property;

        // TODO handle different properties here:
        if (this.property === 'opacity') this.unit = '';

        this.duration = duration;

        this.el.addEventListener('transitionend',
                                 Animation.__transitionend,
                                 false);
        this.el.addEventListener('oTransitionEnd',
                                 Animation.__transitionend,
                                 false);
        return this;
    },

    volatileValue: function () {
        var computed = parseFloat(
            window.getComputedStyle(this.el)[this.property]
        );
        return isNaN(computed) ? 0 : computed;
    },

    get transition() {
        return this._transition;
    },

    /**
     * @private
     * Set a new transition for the animation
     */
    set transition(transition) {
        var isStartingNewAnimation = !this._transition;

        this._transition = transition;

        if (isStartingNewAnimation) {
            this.__delegate('animationWillStart');
        }
        else {
            this.__delegate('animationWillChange');
        }
    },

    __delegate: function(type, arg0) {
        if (typeof this._delegate[type] === 'function') {
            return this._delegate[type](this, arg0);
        }
        return undefined;
    },

    set delegate(delegate) {
        assert_method(delegate, 'animationReachedPoint');
        this._delegate = delegate;
    },

    // get delegate() {return this._delegate;},

    get dest() {
        return this.transition ? this.transition.to : this.volatileValue();
    },

    //set dest(dest) {
    /**
     * Run animation to given destination.
     *
     * If the new destination is in the same direction that the current one,
     * the animation transition will change smoothly; otherwize it will
     * initialize a new ease-in-out transition
     *
     * @param {Number} dest new destination
     */
    runTo: function (dest) {
        // TODO if (dest === this.dest) return;
        assert(is_number(dest));

        var value = this.volatileValue(),
            now = Date.now();

        // animation is running *and* we're moving on in the same direction
        if (this.transition && (this.dest >= value) === (dest >= value)) {

            // branch new transition
            var factor = (dest - value) / (this.dest - value);
            if (factor > 1) {
                this.transition =
                    this.transition.branchAtValueToValueWithDuration(
                        value, dest, this.duration
                    );
            }
            else {
                this.transition = this.transition.branchAtValueToValue(
                    value, dest
                );
            }
        }
        else {
            this.transition = Transition.new(value,
                                             dest,
                                             this.duration,
                                             CubicBezier.EaseInOut);
        }

        this.__check(value, true);
    },

    /**
     * @private
     * Notify delegate of a checkpoint. The delegate is expected to
     * set the next checkpoint's value.
     *
     * Called with a current property value when the subtransition ended
     * or when the current one was interrupted (with a call to .runTo).
     */
    __check: function (value, interrupted) {
        assert(is_number(value), "Checked value must be a number: " + value);

        var next = this.__delegate('animationReachedPoint', value),
            finished = value === this.dest;

        // TODO throw new Error
        // these are *not* [programmer's] assertions
        // as the `next` value is provided by the client
        assert(finished || is_number(next), "`next` is not a number");
        assert(is_ordered(value, next, this.dest),
               "Can't go from " + value + " through " + next +
               " to " + this.dest + "; `next` is improperly set");

        if (finished) {
            this.transition = null;
            this.__delegate('animationEnded');
        }
        else {
            this._next = next;
            var subtransition = this.transition.slice(value, next);
            // output
            this.__delegate('animationWillContinue', subtransition);

            var csstransition = this.css(subtransition);
            this.el.style.transition = csstransition;
            this.el.style.OTransition = csstransition;

            //if (currentValue !== undefined) {
            if (interrupted) {
                // it's *not* 'transitionend', so pause the animation
                // (with kudos to Sarah Parker)
                this.el.style[this.property] = value + this.unit;
                var _ = this.volatileValue();
            }

            this.el.style[this.property] = subtransition.to + this.unit;
        }
    },

    unit: 'px',

    transitionend: function (evt) {
        this.__check(this._next, false);
    },

    css: function (transition) {
        return this.property + ' ' + transition.css();
    },

    toString: function () {return "[object Animation]";}
};


// Animation.DelegateInterface = {
//     /**
//      * @optional
//      */
//     animationWillStart: function (animation) {},

//     /**
//      * @optional
//      */
//     animationWillChange: function (animation) {},

//     /**
//      * unless finished must return `next` point value
//      */
//     animationReachedPoint: function (animation, checkpoint) {},

//     /**
//      * @optional
//      */
//     animationWillContinue: function (animation/*, subtransition*/) {},

//     /**
//      * @optional
//      */
//     animationEnded: function (animation) {},

//     toString: function () {return "[object AnimationDelegate]";}
// };

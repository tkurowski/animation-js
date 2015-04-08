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
    this.property = null;
    this.duration = 0;
    this._staticrules = '';

    this._transition = null;
    this._next = undefined;
    this._delegate = this;
}

Animation.new = function (el, property, duration) {
    var animation;

    property = CSSProperty.new(property);

    if (!el._anim) el._anim = {};

    if ((animation = el._anim[property.cssname])) {
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
        el._anim[property.cssname] = animation;
    }

    return animation;
};

/**
 * Parse el's not-animated transition rules (i.e. all but for property)
 * @param {Element} el
 * @param {CSSProperty} property
 */
Animation.__staticrules = function (el, property) {
    var style = window.getComputedStyle(el),
        rule = style['transition'] || style['-o-transition'] ||
            style['-webkit-transition'];

    if (!rule) return "";

    // extract cubic-bezier(...)
    var beziers = [];
    rule = rule.replace(/cubic-bezier\([^)]+\)/g, function (m) {
        return '&' + (beziers.push(m) - 1);
    });

    var subrules = rule.split(', ').filter(function (subrule, index, subrules) {
        var values = subrule.split(' '),
            prop = subrule.split(' ')[0];
        // NOTE, Opera 12 forbids combining 'all' with other properties.
        // We'll ignore 'all 0 0 ...' and warn if there's
        // non-zero `all` combined with other properties
        if (prop === 'all') {
            if (/*duration=*/parseFloat(values[1]) ||
                    /*delay=*/parseFloat(values[2])) {
                if (subrules.length > 1) {
                    console.warn("Opera 12 forbids combining 'all' with " +
                                 "other properties in `transition` rule");
                }
                return true;
            }
            else {
                // it's effectively *no* transition
                return false; // ignore `all 0 0 ...`
            }
        }
        else return prop !== property.cssname;
    }, this).join(' ');

    // bring back cubic-beziers
    return subrules.replace(/&(\d+)/g, function (m, p1) {
        return beziers[+p1];
    });
};

Animation.__transitionend = function(evt) {
    // we're only interested in 'own' events
    if (evt.currentTarget !== evt.target) return;

    var el = evt.target,
        animation = el._anim && el._anim[evt.propertyName];

    if (animation) {
        animation.transitionend(evt);
    }
};

Animation.prototype = {
    constructor: Animation,

    /**
     * @param {Element} el
     * @param {CSSProperty} property
     * @param {Number} duration
     */
    __init: function (el, property, duration) {
        this.el = el;
        this.property = property;
        this.duration = duration;
        this._staticrules = Animation.__staticrules(el, property);

        this.el.addEventListener('transitionend',
                                 Animation.__transitionend,
                                 false);
        this.el.addEventListener('oTransitionEnd',
                                 Animation.__transitionend,
                                 false);
        return this;
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

        if (transition) {
            this.__delegate(isStartingNewAnimation ?
                            'animationWillStart' :
                            'animationWillChange');
        }
        else {
            this.__delegate('animationEnded');
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
        return this.transition ? this.transition.to :
            this.property.volatileValue(this.el);
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
        assert(is_number(dest));

        var value = this.property.volatileValue(this.el),
            now = Date.now();

        if (this.dest === dest) {
            ; // nothing needs to be changed; still: call .__check
        }
        //else if (dest === value) ...
        else if (this.transition && (this.dest > value) === (dest > value)) {
            // animation is running *and* we're moving on in the same direction

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

    setTo: function (value) {
        this.csstransition = this.css(null);
        this.property.set(this.el, value);
        this.__delegate('animationReachedPoint', value);
        this.transition = null;
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
            this._next = undefined;
            this.transition = null; // -> fire 'animationEnded'
        }
        else {
            this._next = next;
            var subtransition = this.transition.slice(value, next);
            // output
            this.__delegate('animationWillContinue', subtransition);

            this.csstransition = this.css(subtransition);

            //if (currentValue !== undefined) {
            if (interrupted) {
                // it's *not* 'transitionend', so pause the animation
                // (with kudos to Sarah Parker)
                this.property.set(this.el, value);
                var _ = this.property.volatileValue(this.el);
            }

            this.property.set(this.el, subtransition.to);
        }
    },

    transitionend: function (evt) {
        if (this._next !== undefined) this.__check(this._next, false);
    },

    css: function (transition) {
        if (!transition) return this._staticrules || 'none';

        var rule = this.property.cssname + ' ' + transition.css();
        if (this._staticrules) rule = this._staticrules + ', ' + rule;
        return rule;
    },

    set csstransition(csstransition) {
        var style = this.el.style;

        style.transition = csstransition;
        style.OTransition = csstransition;
    },

    // --- animation can be its own delegate

    animationReachedPoint: function (animation, value) {
        // by default, the `next` point is the destination
        return animation.dest;
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

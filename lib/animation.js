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
    this._dest = null;
}

/**
 * @param {Element} el
 * @param {CSSProperty} property
 * @param {Number} duration In seconds
 */
Animation.new = function (el, property, duration) {

    property = CSSProperty.new(property);

    if (!el._anim) el._anim = {};

    if (el._anim[property.cssname]) {
        throw new Error("Animation for given (el, property) " +
                        "has already been defined. Redefinition " +
                        "is currently unsupported");
    }
    else {
        if (Object.keys(el._anim).length) {
            throw new Error("Combining multiple animations on " +
                            "one element is currently unsupported");
        }
        return el._anim[property.cssname] =
            new this().__init(el, property, duration);
    }
};

/**
 * Extract/hide cubic-bezier from a string with .hide();
 * put them back with .show();
 * TODO rename methods (extract, put?) and class (extractor?)
 */
Animation._BezierParser = function () {
    this._beziers = null;
}
Animation._BezierParser.prototype = {
    hide: function (str) {
        var beziers = this._beziers = [];
        return str.replace(/cubic-bezier\([^)]+\)/g, function (m) {
            return '&' + (beziers.push(m) - 1);
        });
    },
    show: function (str) {
        var beziers = this._beziers;
        return str.replace(/&(\d+)/g, function (m, p1) {
            return beziers[+p1];
        });
    }
};


/**
 * Parse el's not-animated transition rules (i.e. all but for property)
 * @param {Element} el
 * @param {CSSProperty} property
 */
Animation.__staticrules = function (el, property) {
    var style = window.getComputedStyle(el),
        bezierParser = new this._BezierParser,
        parts = {
            property: style.transitionProperty.split(", "),
            duration: style.transitionDuration.split(", "),
            timing: bezierParser.hide(
                style.transitionTimingFunction).split(", "),
            delay: style.transitionDelay.split(", ")
        };

    if (!(parts.property[0])) {
        console.warn("Expected at least 'all'; using old browser?");
        return '';
    }

    return bezierParser.show(parts.property.map(function (_, i) {
        var subrule = {};
        Object.keys(parts).forEach(function (key) {
            subrule[key] = parts[key][i];
        });
        return subrule;
    }).filter(function (subrule) {
        if (subrule.property === 'all') {
            if (parseFloat(subrule.duration) || parseFloat(subrule.delay)) {
                // Some(?) browsers improperly(?) block overriding
                // the non-0 'all' value with subsequent non-0 properties, e.g
                // transition: all .3s, top 0s
                // retult: 'top' will animate with duration .3s
                // expected(?): 'top' will *not* animate
                // (NOTE: 'all .3s, top .4s' will work)
                console.warn("Handling 'all' transition property is " +
                             "currently unsupported (" + el.tagName +
                             (el.id ? "#" + el.id + ")": ")"));
                return true;
            }
            else return false; // ignore 'all 0 ... 0'
        }
        else return subrule.property !== property.cssname;
    }).map(function (subrule) {
        return [subrule.property, subrule.duration, subrule.timing,
                subrule.delay].join(' ');
    }).join(', '));
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
        this.el.addEventListener('webkitTransitionEnd',
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
        if (this.transition)
            this._dest = this.transition.to;
        else if (this._dest === null)
            this._dest = this.property.volatileValue(this.el);
        return this._dest;
    },

    __destAtValue: function (value) {
        return this.transition ? this.transition.to : value;
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

        var currentdest = this.__destAtValue(value);
        if (currentdest === dest) {
            ; // nothing needs to be changed; still: call .__check
        }
        else if (dest === value) {
            // animation is finished *but* actual css points to currentdest
            this.property.set(this.el, dest);
            // 'trick' transition to point to the new destination
// WARN, it may be that transition.to only be a getter in which 
// case you may do this.transition && this.[_]transition = {to: dest};
            this.transition && (this.transition.to = dest);
        }
        else if (this.transition && (currentdest > value) === (dest > value)) {
            // animation is running *and* we're moving on in the same direction
            // branch new transition
            var factor = (dest - value) / (currentdest - value);
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
            this.transition = this._newtransition(value, dest);
        }

        this.__check(value, true);
    },

    _newtransition: function (value, dest) {
        return Transition.new(value,
                              dest,
                              this.duration,
                              CubicBezier.EaseInOut);
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
            dest = this.__destAtValue(value),
            finished = value === dest/* || Math.abs(value - dest) < 1e-3*/;

        // TODO throw new Error
        // these are *not* [programmer's] assertions
        // as the `next` value is provided by the client
        assert(finished || is_number(next), "`next` is not a number");
        assert(is_ordered(value, next, dest),
               "Can't go from " + value + " through " + next +
               " to " + dest + "; `next` is improperly set");

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

    /**
     * Creates css rule for given transition
     * TODO rename! (transitioncss?)
     * @return {String} transition rule
     */
    css: function (transition) {
        // TODO FF doesn't understand 'none' :(
        if (!transition) return this._staticrules || 'none';

        // NOTE iff overriding 'all' worked, and 'all' was in `_staticrules`,
        // then the following would be most proper:
        // if (!transition) {
        //     return this._staticrules ?
        //         this._staticrules + ', ' + this.property.cssname + ' 0s' :
        //         'none';
        // }

        var rule = this.property.cssname + ' ' + transition.css();
        if (this._staticrules) rule = this._staticrules + ', ' + rule;
        return rule;
    },

    set csstransition(csstransition) {
        var style = this.el.style;

        style.transition = csstransition;
        style.OTransition = csstransition;
        style.webkitTransition = csstransition;
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

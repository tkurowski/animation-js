/**
 * Simple fading element
 *
 * .hide() // 1. fade out
 * .show(data) // 0. if data already rendered, goto 3
 *             // 1. fade out (unless already hidden)
 *             // 2. call .render(data)
 *             // 3. fade in
 * .render(data) // abstract; draw/render the data
 *               // (called when the el's hidden)
 */
Animation.FadingView = function(el, duration) {
    this._el = el;
    this._animation = null;
    this.duration = duration || .4;
    this._data = null;      // data to be rendered
    this._rendered = null;   // data that's been rendered
};

Animation.FadingView.prototype = {

    DISPLAY_NONE_WHEN_HIDDEN: false,

    HIDDEN: 0,
    VISIBLE: 1,

    get el() {
        if (!(this._el instanceof Element)) {
            this._el = elementize(this._el);
        }
        return this._el;
    },


    // lazy animation
    get animation() {
        if (! this._animation) {
            this._animation = Animation.new(this.el,
                                            'opacity',
                                            this.duration);
            this._animation.delegate = this;
        }
        return this._animation;
    },

    // eql: function (data, other) {return data === other;}

    show: function (data/*, forceRedraw*/) {
        var usedata = arguments.length !== 0;

        if (this.DISPLAY_NONE_WHEN_HIDDEN) this.el.style.display = 'block';

        // TODO this.eql(this._rendered, data)
        if (usedata && this._rendered === data && !arguments[1]) {
            // we've already got the data and we're *not* forcing redraw
            this.animation.runTo(this.VISIBLE);
        }
        else {
            this._data = usedata ? data : true;
            this.animation.runTo(this.HIDDEN);
        }
    },

    hide: function () {
        this._data = null;
        this.animation.runTo(this.HIDDEN);
    },

    /**
     * The reason it's a separate method (not inlined in .animationEnded)
     * is that it's useful for a Fading element inside another Fading element
     * (TODO a good example's what's needed here)
     */
    renderAndShow: function (data) {
        this._data = null;
        this.render(this._rendered = data);
        this.animation.runTo(this.VISIBLE);
    },

    // animation delegate
    animationReachedPoint: Animation.prototype.animationReachedPoint,

    animationEnded: function (animation) {
        if (animation.dest === this.HIDDEN) {
            if (this._data) {
                this.renderAndShow(this._data);
            }
            else {
                if (this.DISPLAY_NONE_WHEN_HIDDEN) {
                    this.el.style.display = 'none';
                }
            }
        }
    },

    render: function (data) {
        //if (typeof data === 'function') data(); else
        throw new Error(".render method missing");
    },

    toString: function () {return '[object Animation.FadingView]';}
};


// TODO this shall *not* lie in global scope!
function elementize(arg) {
    var el = arg;
    if (typeof el === 'string') {
        if (/[#.~>:\s]/.test(el)) {
            el = document.querySelector(el);
        }
        else {
            el = document.getElementById(el);
        }
    }

    if (!(el instanceof Element))
        throw new TypeError("Can't find element: " + arg);
    return el;
}


/**
 * Animation delegate for simple element fading
 *
 * .hide() // 1. fade out
 * .show(data) // 0. if data already rendered, goto 3
 *             // 1. fade out (unless already hidden)
 *             // 2. call .render(data)
 *             // 3. fade in
 * .render(data) // abstract; draw/render the data
 *               // (called when the el's hidden)
 */
Animation.FadingDelegate = function(el, duration) {
    this.el = el;
    this.animation = null;
    this.duration = duration || .4;
    this._data = null;      // data to be rendered
    this._rendered = NaN;   // data that's been rendered
    this._show = false;
};

Animation.FadingDelegate.prototype = {

    DISPLAY_NONE_WHEN_HIDDEN: false,

    HIDDEN: 0,
    VISIBLE: 1,

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

    // get isVisible() {return this._show;},
    // eql: function (data, other) {return data === other;}

    show: function (data/*, forceRedraw*/) {
        // as NaN is never equal to itself, it's a good choice
        // for 'undefined data': it will always force redraw
        if (arguments.length === 0) data = NaN;

        this._show = true;
        if (this.DISPLAY_NONE_WHEN_HIDDEN) this.el.style.display = 'block';

        // TODO this.eql(this._rendered, data)
        if (this._rendered === data && !arguments[1]) {
            // we've already got the data and we're *not* forcing redraw
            this.animation.runTo(this.VISIBLE);
        }
        else {
            this._data = data;
            this.animation.runTo(this.HIDDEN);
        }
    },

    hide: function () {
        this._show = false;
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
            if (this._show) {
                this.renderAndShow(this._data);
            }
            else {
                if (this.DISPLAY_NONE_WHEN_HIDDEN) {
                    this.el.style.display = 'none';
                }
            }
        }
    },

    render: function (data) {throw new Error(".render method missing");},

    toString: function () {return '[object Animation.FadingDelegate]';}
};

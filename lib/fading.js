/**
 * Animation delegate for simple element fading
 *
 * .hide() // 1. fade out
 * .show(data) // 1. fade out (unless already hidden)
 *             // 2. call .render(data)
 *             // 3. fade in
 * .render(data) // abstract; draw/render the data
 *               // (called when the el's hidden)
 */
Animation.FadingDelegate = function(el, duration) {
    this.el = el;
    this.animation = null;
    this.duration = duration || .4;
    this._showdata = null;
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

    // get isVisible() {return !!this._showdata;}

    show: function (data) {
        this._showdata = data || true;
        if (this.DISPLAY_NONE_WHEN_HIDDEN) this.el.style.display = 'block';
        this.animation.runTo(this.HIDDEN);
    },

    hide: function () {
        this._showdata = false;
        this.animation.runTo(this.HIDDEN);
    },

    /**
     * The reason it's a separate method (not inlined in .animationEnded)
     * is that it's useful for a Fading element inside another Fading element
     * (a good example's what's needed)
     */
    renderAndShow: function (data) {
        this.render(this._showdata = data);
        this.animation.runTo(this.VISIBLE);
    },

    // animation delegate
    animationReachedPoint: Animation.prototype.animationReachedPoint,

    animationEnded: function (animation) {
        if (animation.dest === this.HIDDEN) {
            if (this._showdata) {
                this.renderAndShow(this._showdata);
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

Animation.ScrollDelegate = function (init) {
    this._state = undefined;

    this._stepper = null;
    this._stepsize = null;

    // max state values (when going forward or backward)
    this.maxForward = 0;
    this.maxBackward = 0;

    this._animation = null;
    this.value0 = 0;

    this.tiles = null;
    this.tileValue0 = 0;

    this.FORWARD_BUFFER = 0;
    this.BACKWARD_BUFFER = 0;

    // i don't like this init function...
    if (typeof init === 'function') init.apply(this);
};

Animation.ScrollDelegate.prototype = {

    /**
     * return {Number} positive number
     */
    _stepsize: function (state) {
        throw new Error('stepsize method not implemented');
    },

    set stepsize(stepsize) {
        this._stepsize = stepsize;
        switch (typeof stepsize) {
        case 'number':
            this._stepper = Animation.ScrollDelegate.CONST_STEPPER;
            break;
        case 'function':
            this._stepper = Animation.ScrollDelegate.CHANGING_STEPPER;
            break;
        default:
            throw new Error("setpsize must either be number or function");
        }
    },

    get stateByValue() {return this._stepper.stateByValue;},
    get valueByState() {return this._stepper.valueByState;},
    get positionTile() {return this._stepper.positionTile;},

    animationReachedPoint: function (animation, value) {
        var state = this.stateByValue(value),
            destState = this.stateByValue(animation.dest),
            nextState;
        // TODO not nice: this assumes that we must reach each
        // step point, but it only makes sense for buffersize eq. 1
        // what about nextState = state + buffer?
        if (destState > state) {
            nextState = (Math.floor(state) + 1);
            nextState = Math.min(nextState, destState);
        }
        else if (destState < state) {
            nextState = (Math.ceil(state) - 1);
            nextState = Math.max(nextState, destState);
        }
        else {
            nextState = state;
        }

        // TODO The following condition may be *not enough* in a case
        // when one calls animation.setTo(vaule) where value
        // does not evaluate to an integer state
        if (state === state >> 0) {
            this.__changeState(animation, state, nextState);
        }

        return this.valueByState(nextState);
    },

    __changeState: function (animation, state, nextState) {
        var newState = undefined;

        if (this._state === undefined) {
            newState = state;
        }
        else if (nextState > this._state + this.FORWARD_BUFFER) {
            newState = nextState - this.FORWARD_BUFFER;
        }
        else if (nextState < this._state - this.BACKWARD_BUFFER) {
            newState = nextState + this.BACKWARD_BUFFER;
        }

        if (newState !== undefined) {
            // TODO shall the state be set here? so that .drawTile sees
            // proper _state value?
            this.animationEnteredState(animation, newState, this._state);
            this._state = newState;
        }
    },

    // scroll

    animationEnteredState: function (animation, state, prev) {
        this.draw(state);
    },

    draw: function (state) {
        var numtiles = this.tiles.length,
            shift = -state % numtiles,
            pos0 = (-state / numtiles >> 0) * numtiles;

        Array.prototype.forEach.call(this.tiles, function (tile, i) {
            // i += this.FORWARD_BUFFER;
            var correction = shift > i ? numtiles : 0,
                pos = pos0 + i + correction;
            // position tile
            this.positionTile(tile, pos);
            // draw tile
            this.drawTile(tile, pos); // TODO needs update
        }, this);
    },

    redraw: function () {this.draw(this._state);},

    set animation(animation) {
        this._animation = animation;
        this._animation.delegate = this;
        this.value0 = animation.property.volatileValue(animation.el);
        // TODO assert .tiles are set
        this.tileValue0 = animation.property.volatileValue(this.tiles[0]);
    },

    forward: function () {return this.scrollBy(1);},
    backward: function () {return this.scrollBy(-1);},

    /**
     * @param {Number} dest
     * @param {Bool} force Optional. Force animation.run
     * @return {Bool} Whether scrolling was started
     */
    scrollTo: function (dest, force) {
        dest = Math.min(dest, this.maxForward);
        dest = Math.max(dest, -this.maxBackward);
        var change = dest !== this.dest;
        if (change || force) {
            this._animation.runTo(this.valueByState(dest));
        }
        return change;
    },

    setTo: function (state) {
        this._animation.setTo(this.valueByState(state));
        this.redraw();
    },

    scrollBy: function (steps) {
        return this.scrollTo(this.dest + steps);
    },

    drawTile: function (tile, pos) {
        throw new Error(".drawTile missing implementation");
    },

    get dest() {
        return this.stateByValue(this._animation.dest);
    },

    // ?
    get el() {return this._animation.el;},

    /**
     * Get tile element by it's visibile position
     */
    tile: function (vpos) {
        return this.tiles[(-this.dest + vpos) % this.tiles.length];
    },

    toString: function () {return "[object Animation.ScrollDelegate]";}
};

Animation.ScrollDelegate.CONST_STEPPER = {
    stateByValue: function (value) {
        return (value - this.value0) / this._stepsize;
    },

    valueByState: function (state) {
        return this.value0 + state * this._stepsize;
    },

    positionTile: function (tile, pos) {
        this._animation.property.set(tile,
                                     this.tileValue0 + pos * this._stepsize);
    }
};


Animation.ScrollDelegate.CHANGING_STEPPER = {
    stateByValue: function (value) {
        // (value - value0) / STEP

        value -= this.value0;

        // assume all 'steps' are > 0
        var sign = 1;
        if (value <= 0) {
            value = -value; // abs
            sign = -1;
        }

        var state = 0, step;

        var count = 0; // assertion counter
        // loop invariant: value >= 0
        while (true) {
            step = this._stepsize(state);
            // note: if value > 0 and step <= 0
            // we get infinite loop
            assert(++count < 3456,
                   "Looks like the step size is too small; check " +
                   "the stepsize or increase the assertion counter");
            if (value === 0) {
                return state * sign;
            }
            else if (value - step > 0) {
                value -= step;
                state += 1;
            }
            else {
                state += value / step;
                return state * sign;
            }
        }
    },

    valueByState: function (state) {
        // value0 + state * STEP

        var sign = state > 0 ? 1 : -1,
            value = 0;

        // compute 'state * STEP'
        state = state > 0 ? state : -state;
        var i = 0;
        while (i < state) {
            value += this._stepsize(i++);
        }
        if (i > state) {
            value += (state - (i - 1)) * this._stepsize(i);
        }
        return this.value0 + sign * value;
    },

    positionTile: function (tile, pos) {
        var value = this.tileValue0;
        assert(pos >= 0, "pos < 0 is not yet handled, sorry!");
        // var sign = pos > 0 ? 1 : -1;
        // pos *= sign;
        // TODO remember last (pos, value) and compute from that point!
        while (pos--) {
            value += this._stepsize(pos); // * sign;
        }
        this._animation.property.set(tile, value);
    }
};

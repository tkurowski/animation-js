Animation.ScrollDelegate = function (init) {
    this._state = undefined;

    this._stepper = null;
    this._stepsize = null;

    // max state values (when going forward or backward)
    this.MAX_FORWARD = 0;
    this.MAX_BACKWARD = 0;

    this._animation = null;
    this.value0 = 0;

    this.tiles = null;

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

    animationReachedCheckpoint: function (animation, checkpoint) {

        var state = this.stateByValue(checkpoint.value),
            destState = this.stateByValue(animation.dest),
            nextState;

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

        if (state === state >> 0)
            this.__changeState(animation, state, nextState);

        checkpoint.next = this.valueByState(nextState);
    },

    __changeState: function (animation, state, nextState) {
        var newState = undefined;

        if (this._state === undefined) {
            newState = state;
        }
        else if (nextState > this._state + this.FORWARD_BUFFER) {
            newState = this._state + 1; // TODO = state?
        }
        else if (nextState < this._state - this.BACKWARD_BUFFER) {
            newState = this._state - 1; // TODO = state?
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
        var numtiles = this.tiles.length,
            shift = -state % numtiles,
            pos0 = (-state / numtiles >> 0) * numtiles;

        Array.prototype.forEach.call(this.tiles, function (tile, i) {
            var correction = shift > i ? numtiles : 0,
                pos = pos0 + i + correction;
            // position tile
            this.positionTile(tile, pos);
            // draw tile
            this.drawTile(tile, pos); // TODO needs update
        }, this);
    },

    set animation(animation) {
        this._animation = animation;
        this._animation.delegate = this;
        this.value0 = this._animation.volatileValue();
    },

    forward: function () {return this.move(1);},
    backward: function () {return this.move(-1);},

    move: function (dir) {
        var destState = this.stateByValue(this._animation.dest),
            newDestState;
        if (dir === 1) {
            newDestState = Math.min(destState + 1, this.MAX_FORWARD);
        }
        else if (dir === -1) {
            newDestState = Math.max(destState - 1, -this.MAX_BACKWARD);
        }
        else throw new Error("Direction must be 1 or -1");

        if (newDestState !== destState) {
            this._animation.runTo(this.valueByState(newDestState));
            return true;
        }
        return false;
    },

    drawTile: function () {
        throw new Error(".drawTile missing implementation");
    },

    get dest() {
        return this.stateByValue(this._animation.dest);
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
        tile.style[this._animation.property] = pos * this._stepsize + this.unit;
    }
};


Animation.ScrollDelegate.CHANGING_STEPPER = {
    stateByValue: function (value) {
        // (value - value0) / STEP

        value -= this.value0;

        // assume all 'steps' are > 0
        var sign = value > 0 ? 1 : -1;

        value = value > 0 ? value : -value; // abs

        var state = 0, step;
        while (true) {
            step = this._stepsize(state);
            if (value - step >= 0) {
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
        var value = 0;
        while (pos--) {
            value += this._stepsize(pos);
        }
        tile.style[this.property] = value + this.unit;
    }
};

//! requires assert

// # http://en.wikipedia.org/wiki/B%C3%A9zier_curve
// B(t) = (1-t)^3 P0 + 3(1-t)^2 t P1 + 3(1-t)t^2 P2 + t^3 P3
// CSS-like cubic bezier is enclosed between:
// P0 = [0 0]
// P3 = I = [1 1]
// B(t) = 3(1-t)^2 t P1 + 3(1-t)t^2 P2 + t^3 I
// B(t) = 3(t - 2t^2 + t^3) P1 + 3(t^2-t^3) P2 + t^3 I
// B(t) = 3P1 t^3 - 6P1 t^2 + 3P1 t - 3P2 t^3 + 3P2 t^2 + t^3 I
// B(t) = t^3 (3P1 - 3P2 + I) + t^2 (3P2 - 6P1) + t 3P1
// B(t) = t (3P1 + t (3P2 - 6P1 + t (3P1 - 3P2 + I)))
// B(t) = t (C + t (B + tA))
//
// C := 3P1
// B := 3P2 - 6P1
// A := 3P1 - 3P2 + I
//
// # B'(t)
// B(t) = At^3 + Bt^2 +  Ct
// B'(t) = 3At^2 + 2Bt + C
// B'(t) = C + t (2B + t 3A)
//
//
// # slice [a, b]
// t := a + t(b - a) -- so that t* in [0, 1] is like t in [a, b]
// B(t) = (a + t(b-a)) (C + (a + t(b-a)) (B + (a + t(b-a))A))
// B(t) = (a + t(b-a)) (C + (a + t(b-a)) (B + aA + t(b-a)A))
// B(t) = (a + t(b-a))
//        (C + a(B + aA) + t(b-a)aA + t(b-a)(B + aA) + t^2 (b-a)^2 A)
// C* := C + a(B + aA) = C + aB + aaA
// B* := (b-a)aA + (b-a)(B + aA) = baA - aaA + bB + baA - aB - aaA
// A* := A (b-a)^2 = b^2 A - 2abA + a^2 A = bbA - 2baA + aaA
// B(t) = (a + t(b-a)) (C* + t(B* + t A*))
// B(t) = aC* + t(aB* + t aA*) + t ((b-a)C* + t((b-a)B* + t(b-a)A*))
// B(t) = aC* + t(aB* + (b-a)C* + t(aA* + (b-a)B* + t(b-a)A*)
// C^ = aB* + (b-a)C*
// B^ = aA* + (b-a)B*
// A^ = (b-a)A*
// B(t) = t (C^ + t(B^ + tA^)) + aC*
// ignore aC* (so that slice(0) is 0)
// /= C^ + B^ + A^ -- so that slice(1) is 1

/**
 * @class
 * It's CSS-like cubic bezier, meaning that points P0 and P3
 * are assumed to be [0, 0] and [1, 1] respectively
 *
 * P1 and P2 can be anywhere, but you can use .isFunctionOfX
 * property to check if y (css progress) is indeed a function of x
 * (css time)
 *
 * http://en.wikipedia.org/wiki/B%C3%A9zier_curve
 */
function CubicBezier() {
    this.P1 = null;
    this.P2 = null;
    this._A = null;
    this._B = null;
    this._C = null;
}

(function (predefined) {
    var _parsed = {};

    Object.keys(predefined).forEach(function (curve) {
        Object.defineProperty(CubicBezier, curve, {
            get: function () {
                var parsed = _parsed[curve];
                if (!parsed) {
                    parsed = _parsed[curve] = this.cubicBezierWithCoords.apply(
                        this,
                        predefined[curve]
                    );
                    // free no-more-needed memory
                    predefined[curve] = null;
                }
                return parsed;
            }
        });
    });

})({
    'Ease': [0.25, 0.1, 0.25, 1],
    'Linear': [0, 0, 1, 1],
    'EaseIn': [0.42, 0, 1, 1],
    'EaseOut': [0, 0, 0.58, 1],
    'EaseInOut': [0.42, 0, 0.58, 1]
});

CubicBezier.cubicBezierWithP1P2 = function (P1, P2) {
    return new this().initWithP1P2(P1, P2);
};

CubicBezier.cubicBezierWithABC = function (A, B, C) {
    return new this().initWithABC(A, B, C);
};

CubicBezier.cubicBezierWithCoords = function (P1x, P1y, P2x, P2y) {
    return new this().initWithP1P2([P1x, P1y], [P2x, P2y]);
};


function assert_axis(axis) {
    assert(axis === 0 || axis === 1,
           "Axis index must be either 0 for x or 1 for y; " +
           "it is: " + axis);
}

function ensure_in_range(v, from, to) {
    return v < from ? from : (v > to ? to : v);
}

CubicBezier.prototype = {
    constructor: CubicBezier,

    /** @constructor */
    initWithP1P2: function (P1, P2) {
        // 3P1 - 3P2 + I
        this._A = [3 * (P1[0] - P2[0]) + 1,
                   3 * (P1[1] - P2[1]) + 1];
        // 3P2 - 6P1
        this._B = [3 * P2[0] - 6 * P1[0],
                   3 * P2[1] - 6 * P1[1]];
        // 3P1
        this._C = [3 * P1[0], 3 * P1[1]];

        this.P1 = P1;
        this.P2 = P2;

        return this;
    },

    /** @constructor */
    initWithABC: function (A, B, C) {
        this._A = A;
        this._B = B;
        this._C = C;

        // C = 3P1
        this.P1 = [C[0] / 3, C[1] / 3];
        // B = 3P2 - 2C
        this.P2 = [(B[0] + 2 * C[0]) / 3, (B[1] + 2 * C[1]) / 3];

        return this;
    },

    __isFunctionOf: function(axis) {
        return is_in_range(this.P1[axis], 0, 1) &&
            is_in_range(this.P2[axis], 0, 1);
    },

    get isFunctionOfX() {return this.__isFunctionOf(/*axisX=*/0);},
    get isFunctionOfY() {return this.__isFunctionOf(/*axisY=*/1);},

    get isInjective() {return this.isFunctionOfX && this.isFunctionOfY;},

    __ensureFunctionOf: function (axis, E) {
        assert(is_in_range(this.P1[axis], -E, 1 + E) &&
               is_in_range(this.P2[axis], -E, 1 + E),
               "Values exeed range by more than E = " + E);

        this.P1[axis] = ensure_in_range(this.P1[axis], 0, 1);
        this.P2[axis] = ensure_in_range(this.P2[axis], 0, 1);
    },

    ensureFunctionOfX: function (E) {
        this.__ensureFunctionOf(0, E);
        return this;
    },
    ensureFunctionOfY: function (E) {
        this.__ensureFunctionOf(1, E);
        return this;
    },
    ensureInjective: function (E) {
        this.ensureFunctionOfX(E).ensureFunctionOfY(E);
        return this;
    },

    /**
     * B(t)
     * @private
     */
    B: function (axis, t) {
        // shortcuts
        if (t === 0) return 0;
        if (t === 1) return 1;
        return t * (this._C[axis] + t * (this._B[axis] + t * this._A[axis]));
    },

    x: function (t) {
        // assert(
        return this.B(0, t);
    },

    y: function (t) {
        return this.B(1, t);
    },

    /**
     * B'(t) = C + t (2B + t 3A)
     * @private
     */
    dB: function (axis, t) {
        return this._C[axis] + t * (2 * this._B[axis] + t * 3 * this._A[axis]);
    },

    dx: function (t) {
        return this.dB(0, t);
    },

    dy: function (t) {
        return this.dB(1, t);
    },

    EPSILON: 1e-4,

    // TODO out of prototype
    labelForAxis: ["x = time", "y = progress"],

    /**
     * find t by value (along `axis`) using Newton-Raphelson method
     */
    t: function (axis, v) {
        assert_axis(axis);
        assert(is_in_range(v, 0, 1), "Value (" + v + ") out of range [0, 1]");
        assert(this.__isFunctionOf(axis),
               "This cubic bezier is not a function of " +
               this.labelForAxis[axis]);

        var guess = v, // first guess for t is v itself (hot shot for linear)
            err = v - this.B(axis, guess);
        // var count = 0;
        while (err > this.EPSILON || err < -this.EPSILON) {
            // assert(count++ < 100, "Can't find t(" + this.labelForAxis[axis] +
            //        " = " + v + ") in " + this.desc());
            guess += err / this.dB(axis, guess);
            err = v - this.B(axis, guess);
        }
        return ensure_in_range(guess, 0, 1);
    },

    /**
     * t(x)
     */
    tx: function (x) {
        return this.t(0, x);
    },

    /**
     * t(y)
     */
    ty: function (y) {
        return this.t(1, y);
    },

    /**
     * y(x)
     */
    yOfX: function (x) {
        return this.y(this.tx(x));
    },

    /**
     * x(y)
     */
    xOfY: function (y) {
        return this.x(this.ty(y));
    },

    /**
     * New cubic bezier object as a slice in t-domain
     * @private
     */
    __slice: function (a, b) {
        var aa = a * a, bb = b * b, ab = a * b, b_a = b - a,
            aaA = [aa * this._A[0], aa * this._A[1]],
            baA = [ab * this._A[0], ab * this._A[1]];

        // C* = C + aB + aaA
        var C = [this._C[0] + a * this._B[0] + aaA[0],
                 this._C[1] + a * this._B[1] + aaA[1]],
            // B* = 2(baA - aaA) + (b-a)B
            B = [2*(baA[0] - aaA[0]) + b_a * this._B[0],
                 2*(baA[1] - aaA[1]) + b_a * this._B[1]],
            // A* = bbA - 2baA + aaA
            A = [bb * this._A[0] - 2 * baA[0] + aaA[0],
                 bb * this._A[1] - 2 * baA[1] + aaA[1]];

        // C^ = aB* + (b-a)C*
        C[0] = a * B[0] + b_a * C[0]; C[1] = a * B[1] + b_a * C[1];
        // B^ = aA* + (b-a)B*
        B[0] = a * A[0] + b_a * B[0]; B[1] = a * A[1] + b_a * B[1];
        // A^ = (b-a)A*
        A[0] *= b_a; A[1] *= b_a;

        // scale (so that slice(t=1) = 1
        var S0 = A[0] + B[0] + C[0], S1 = A[1] + B[1] + C[1];

        A[0] /= S0; A[1] /= S1;
        B[0] /= S0; B[1] /= S1;
        C[0] /= S0; C[1] /= S1;

        return this.constructor.cubicBezierWithABC(A, B, C);
    },

    /**
     * New cubic bezier as a slice along `axis`
     */
    slice: function (axis, va, vb) {
        assert(arguments.length == 3,
               "Did you forget to specify slice axis?");
        assert_axis(axis);
        return this.__slice(this.t(axis, va), this.t(axis, vb));
    },

    sliceX: function (xa, xb) {
        return this.slice(0, xa, xb);
    },

    sliceY: function (ya, yb) {
        return this.slice(1, ya, yb);
    },


    /**
     * @private
     * Move P3 along given axis, preserving slope at P0
     * Doesn't "save" changes!
     * @return {Boolean} if the curve was ineed modified
     */
    __scale: function (axis, factor) {
        if (factor === 1) return false;

        var P1 = this.P1[axis] / factor;
        if (P1 > 1) {
            // preserve slope by scaling the other axis appropriately
            this.P1[/*otheraxis=*/1 - axis] /= P1;
            P1 = 1;
        }
        this.P1[axis] = P1;
        return true;
    },

    /**
     * 'Move' P3 so as to preserve slope at P0.
     */
    scale: function (scaleX, scaleY) {
        var modified = false;
        if (scaleX !== 1) {
            this.__scale(0, scaleX);
            modified = true;
        }
        if (scaleY !== 1) {
            this.__scale(1, scaleY);
            modified = true;
        }
        if (modified) {
            // P1 changed => recompute A, B, C
            return this.initWithP1P2(this.P1, this.P2);
        }
        return this;
    },

    // --- description & representation

    css: function () {
        return "cubic-bezier(" + this.coords().join(',') + ")";
    },

    coords: function () {
        return this.P1.concat(this.P2);
    },

    get json() {return this.coords;},

    desc: function () {
        return this.constructor.name + "(" + JSON.stringify(this.json()) + ")";
    },

    toString: function () {return "[object " + this.desc() + "]";}
};

// TODO move somewhere else?

/**
 * Have the descriptor object inherit the 'defaults' keys
 * unless they're overridden by data
 */
function describe(defaults, descriptor/*, datakey*/) {
    descriptor = descriptor || {};
    var datakey = arguments[2] || '_data';

    Object.keys(defaults).forEach(function (key) {
        Object.defineProperty(descriptor, key, {
            get: function () {
                return key in this[datakey] ?
                    this[datakey][key] : defaults[key];
            }
        });
    });
    return descriptor;
};



(function () {

    // --- [plot] helpers

    /**
     * Coordinates for drawing the curve in given rectangle
     * @return Array of 6 coordinates: [P1.x, P1.y, P2.x, P2.y, P3.x, P3.y]
     * as expected e.g. by .bezierCurveTo()
     */
    this.coordsInRect = function(x, y, w, h) {
        return [
            this.P1[0] * w + x, this.P1[1] * h + y,
            this.P2[0] * w + x, this.P2[1] * h + y,
            w + x,
            h + y
        ];
    };


//    DEFAULT_STYLE = {}

    function parseStyle(style) {
        if (typeof style === "string") {
            style = {strokeStyle: style, fillStyle: style};
        }
        else if (typeof style === "number") {
            style = {lineWidth: style};
        }
    }

    var DEFAULT_STYLE = {
        strokeStyle: "gray",
        fillStyle: "gray", // color for controlPoints/vertices
        lineWidth: 2,
        controlPoints: true,
        edgePoints: true
    };


    this.drawInRect = function (ctx, x, y, w, h, style) {
        ctx.save();

        var coords = this.coordsInRect(x, y, w, h);

        var color = arguments[5] || 'gray';
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

//        drawPoint(ctx, x, y);
//        drawPoints(ctx, coords);

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.bezierCurveTo.apply(ctx, coords);
        ctx.stroke();

        ctx.lineWidth = 1;
        ctx.strokeStyle = "#ddd";
//        ctx.strokeRect(x, y, w, h);

        ctx.restore();
    };

    function drawPoint(ctx, x, y) {
        ctx.fillRect(x-2, y-2, 5, 5);
    }

    function drawPoints(ctx, coords) {
        for (var i = 0; i < coords.length - 1; i += 2) {
            drawPoint(ctx, coords[i], coords[i+1]);
        }
    }

}).call(CubicBezier.prototype);



(function () {

    var FRAME_DESCRIPTOR = describe({
        x0: 0,
        y0: 0,
        sx: 1,
        sy: 1
    }, {
        x: function(x) {
            return (this.x0 + x) * this.sx;
        },
        y: function(y) {
            return (this.y0 + y) * this.sy;
        },
        w: function(w) {
            return w * this.sx;
        },
        h: function(h) {
            return h * this.sy;
        },
        set frame(frame) {
            this._data = frame;
        }
    });

    this.drawInFrame = function(ctx, frame, color) {
        FRAME_DESCRIPTOR.frame = frame;

        this.timing.drawInRect(
            ctx,
            FRAME_DESCRIPTOR.x(0),
            FRAME_DESCRIPTOR.y(this.from),
            FRAME_DESCRIPTOR.w(this.duration),
            FRAME_DESCRIPTOR.h(this.distance),
            color
        );
    };

}).call(Transition.prototype);


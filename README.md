Animate HTML element with `CSS transitions` (from current position to destination) checking at arbitrary chosen frames.

Animation
--------------
```js
var animation = Animation.new(myElement, 'left', .4);
```

In order to create an `Animation` object you use `Animation.new` method (_do not_ use `Animation` constructor directly). It takes three parameters:

- `el` - `Element` node
- `property` - a `String` or `CSSProperty`
- `duration` - in seconds

To start animation you call `runTo` method
```js
animation.runTo(1000);
```
This will animate `myElement` from current CSS `left` value to `1000px`;

Animation.Delegate Interface
----------------------------------------
```js
animation.delegate = myAnimationDelegate;
```
The `Animation.Delegate` interface looks like this:
```js
Animation.Delegate = {
    /**
     * @optional
     * @param {Animation} animation
     */
    animationWillStart: function (animation) {},

    /**
     * @optional
     * @param {Animation} animation
     */
    animationWillChange: function (animation) {},

    /**
     * @param {Animation} animation
     * @param {Number} value
     * @return {Number} nextValue
     */
    animationReachedPoint: function (animation, value) {},

    /**
     * @optional
     * @param {Animation} animation
     */
    animationEnded: function (animation) {}
};
```
The only required method is `animationReachedPoint` that, given the
current value (of element's CSS property) *must* return the `nextValue` to reach.
(The only exception is when `value` equals `animation.dest`, meaning the animation came to its end; the return value is then ignored).

E.g. if we want to animate element to `left = "1000px"` and have it do something on each full hundred, we could do:
```js
// on every 'full hundred' frame, change text and color
animation.delegate = {
    animationReachedPoint: function (animation, value) {
        var count = Math.floor(value / 100);

        // do something; e.g. display counter and change color
        var el = animation.el;
        el.textContent = "It's now " + count;
        style.backgroundColor = ['red', 'green', 'blue'][count % 3];

        // important! return where the next 'stop' is
        return (count + 1) * 100;
    }
};
// start animation
animation.runTo(1000);
```
When animation is not running, `runTo` will call `animationWillStart` method.
When `runTo` is called while the animation is running, `animationWillChange`
will be called instead.
Only after reaching the most recent destination value (the parameter passed to
`runTo`), the delegate's `aniamtionEnded` method is called.

Note that `animationReachedPoint` must be prepared to handle any `value`:
it will not necessarily be the one returned by the previous call to
`animationReachedPoint`; in particular, when `runTo` is called while
the animation's running, the `value` will be the current (computed)
value of `el`'s `property`.

Animation.ScrollDelegate
----------------------------------

The `Animation.ScrollDelegate` implements `Animation.Delegate` to create an efficient scrolling mechanism.

The scrolling is being done by animating container [element's position]
and changing tiles[' position] as needed (a `tile` is an absolutely positioned child/descendant of the container). The number of tiles is determined solely by how many of them are visible and not by the number of items you want to display.
```js
var scroller = new Animation.ScrollDelegate;

// set the tiles sequence (Array, Collection, etc.)
scroller.tiles = myContainer.querySelectorAll('.my-tile');

// set animated container; this will automatically
// set animation's delegate to the scroller itself
scroller.animation = new Animation(myContainer, 'top', .4);

// the size of a tile (width of a column or height of a row)
scroller.stepsize = 100;

scroller.drawTile = function (tile, pos) {
    // the pos is the index of an item to display
    if (pos < 0 || pos >= myCollection.length) {
        tile.style.visibility = 'hidden';
    }
    else {
        tile.textContent = "Item#" + pos + ": " + myCollection[pos];
        tile.style.visibility = 'visible';
    }
};
```
`Animation.ScrollDelegate` provides an implementation
for `animationReachedPoint` such that the tiles are properly updated
before they appear. It needs `stepsize` to know how wide each tiles is.
You can provide a number (as in the example above) if all tiles are of equal size, or a function, that - given tile's position - returns its size:
```js
scroller.stepsize = function (pos) {
    return myCollection[pos].size;
};
```
To specify scroll range use `maxForward` and `maxBackward` properties:
```js
// specify scroll range
scroller.maxBackward = 0;
scroller.maxForward = myCollection.length;
```

### BUFFERS

If there are `N` items visible at once on the screen, then you'll need
at least `N` or `N+1` tile elements. The number of tiles that are hidden
(waiting to be used) is what I here call a `buffer`. There are two of them: `FORWARD_BUFFER` and `BACKWARD_BUFFER`. The _forward_ relates to situations when the `dest` value _increases_, and _backward_ for when it _decreases_ (which is, more often than not, _very_ inconvinient). The buffers' values depend on:

- how many items are visible
- how many tiles elements are there to be used
- where the 'visible-position:0' is
- the animated property's 'direction'

These buffers are just as unintuitive as they are important, so I'm
thinking of providing a better interface for setting them.
For now, I hope the two most common examples will suffice:
```js
/*
Ex 1. propery: 'left'; BACKWARD_BUFFER = 1; FORWARD_BUFFER = 0;
# state 0
    | [0]  [1]  [2] | [3]
# state -1 (going left => backward)
[0] | [1]  [2]  [3] |
       ^--------------------------- visible-position: 0
 */
scroller.FORWARD_BUFFER = 0;
```
In the example above the viewport is denoted by the bars `||` - only what's
between them is visible. In `state 0` we see that we have `R = 1` extra tile lurking on the right ready to show-up when the container goes left. In such case the `left` property value (`aniamtion.dest`) decreases, so its 'backward' direction, hence `BACKWARD_BUFFER = R = 1`.
Similarly as there's nothing there for the 'forward' direction: `FORWARD_BUFFER` is 0.
```js
/*
Ex 2. property: 'left'; BACKWARD_BUFFER = 2; FORWARD_BUFFER = -1;
# state 0
  |  [0] [1] [2] [|3] [4] [5]
# state -1
[0|] [1] [2] [3] [|4] [5]
      ^---------------------------- visible-position: 0
 */
scroller.BACKWARD_BUFFER = 2;
scroller.FORWARD_BUFFER = -1;
```
In the second example we have `R = 2` additional (invisible)  tiles on the right. So `BACKWARD_BUFFER = 2`.
Now, when moving [the container] left, the tile at 'visible-position:0'
does not hide completely, so we need to tell the `scroller` that not only there's no additional tile (to the left) but that the `L = 1` leftmost tiles must stay intact when moved away: `FORWARD_BUFFER = -L = -1`.

Note, that if we animated `right` property, then the 'forward' direction
would move the container to the left and 'backward' to the right, so
the buffers would have to be swapped.

### scrolling

Now that the `scroller`'s been properly set up, we can begin scrolling:
```js
scroller.scrollTo(-1);
scroller.backward();
scroller.forward();
scroller.scrollBy(-3);
```
- `scrollTo(dest)` - scroll to given destination, where the `dest` is given as number of items/steps, and _not_ as a css value
- `scrollBy(steps)` - scroll by number of items

### some other methods and properties

- `el` - the animated container
- `dest` - the scroll destination: number of steps/items [to be] scrolled
- `tile(vpos)` - returns a tile `Element` that is currently used
at given _visible position_. A _visible position_ is an *on-the-screen*
position (_not_ the item's index as in `drawTile`).

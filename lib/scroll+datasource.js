(function () {

    Object.defineProperties(Animation.ScrollDelegate.prototype, {
        dataSource: {
            get: function () {return this._dataSource;},
            set: function (dataSource) {
                // TODO dataSource interface validation:
                // typeof dataSource.count === 'number'
                // typeof dataSource.dataAtIndex === 'function'
                // optional:
                // typeof dataSource.hashAtIndex === 'function'
                if (this._dataSource) {
                    if (typeof this.saveState === 'function') {
                        this.saveState(this.dest);
                    }
                }

                this._dataSource = dataSource;
                if (typeof this.loadState === 'function') {
                    this.setTo(this.loadState());
                }
                else this.setTo(0);
            }
        },
        maxBackward: {
            get: function () {return this.dataSource.count - 1;}
        }
    });

    var UNDEFINED = {};

    this.drawTile = function (tile, pos) {
        if (pos >= this._dataSource.count) {
            this.hideTile(tile);
            return;
        }
        this.showTile(tile);

        var hash, data = UNDEFINED;
        // we assume that dataSource.dataAtIndex() function may be costly
        if (typeof this._dataSource.hashAtIndex === 'function') {
            hash = this._dataSource.hashAtIndex(pos);
        }
        else {
            data = this._dataSource.dataAtIndex(pos);
            hash = 'hash' in data ? data.hash : pos;
        }
        hash += '';

        if (tile.dataset.hash === hash) return; // no need to update

        if (data === UNDEFINED) data = this._dataSource.dataAtIndex(pos);

        this.drawTileWithData(tile, pos, data);

        tile.dataset.hash = hash;
    };

    this.hideTile = function (tile) {
        tile.style.display = "none";
    };
    this.showTile = function (tile) {
        tile.style.display = "";
    };

    this.drawTileWithData = function (tile, pos, data) {
        throw new Error(".drawTileWithData missing implementation");
    };

}).call(Animation.ScrollDelegate.prototype);

(function () {

    Object.defineProperties(Animation.ScrollDelegate.prototype, {
        dataSource: {
            get: function () {return this._dataSource;},
            set: function (dataSource) {
                this.dataSourceWillChange(dataSource);
                this.setDataSource(dataSource);
                this.dataSourceDidChange(dataSource);
            }
        },
        maxBackward: {
            get: function () {return this.dataSource.count - 1;}
        }
    });

    /**
     * @param {Object} dataSource New dataSource
     */
    this.dataSourceWillChange = function (dataSource) {
        if (this._dataSource) {
            if (typeof this.saveState === 'function') {
                this.saveState(this.dest);
            }
        }
    };

    /**
     * @param {Object} dataSource New dataSource
     */
    this.setDataSource = function (dataSource) {
        // TODO dataSource interface validation:
        // typeof dataSource.count === 'number'
        // typeof dataSource.dataAtIndex === 'function'
        // optional:
        // typeof dataSource.hashAtIndex === 'function'

        this._dataSource = dataSource;
    };

    /**
     * @param {Object} dataSource Old dataSource
     */
    this.dataSourceDidChange = function (dataSource) {
        // TODO this should rather be called '.savedState()'
        if (typeof this.loadState === 'function') {
            this.setTo(this.loadState());
        }
        else this.setTo(0);
    };

    var UNDEFINED = {};

    this.drawTile = function (tile, pos) {
        if (pos >= this._dataSource.count) {
            this.hideTile(tile);
            return;
        }
        this.showTile(tile);

        var hash = UNDEFINED, data = UNDEFINED;
        // we assume that dataSource.dataAtIndex() function may be costly
        if (typeof this._dataSource.hashAtIndex === 'function')
            hash = this._dataSource.hashAtIndex(pos) + '';
        else if (this.autohash)
            hash = this.autohash(
                (data = this._dataSource.dataAtIndex(pos)),
                pos
            );

        if (hash !== UNDEFINED && tile.dataset.hash === hash + '')
            return; // no need to update

        if (data === UNDEFINED) data = this._dataSource.dataAtIndex(pos);

        this.drawDataOnTile(data, tile, pos);

        if (hash !== UNDEFINED) tile.dataset.hash = hash + '';
    };

    this.autohash = function (data, pos) {
        do {
            switch (typeof data) {
            case 'string':
            case 'number':
                return data.hash + '';
            case 'object':
                if (data) {
                    data = data.hash;
                    break;
                }
                else return pos + '';
            case 'function':
                data = data();
                break;
            default:
                return pos + '';
            }
        }
        while(true);
    };

    this.hideTile = function (tile) {
        tile.style.display = "none";
    };
    this.showTile = function (tile) {
        tile.style.display = "";
    };

    this.drawDataOnTile = function (data, tile, pos) {
        throw new Error(".drawDataOnTile missing implementation");
    };

}).call(Animation.ScrollDelegate.prototype);

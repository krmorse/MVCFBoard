Ext.define('Rally.apps.board.CollectionColumn', {
    extend: 'Rally.ui.cardboard.Column',
    alias: 'widget.collectioncolumn',

    loadStore: function() {
        if (this._isCollectionField()) {
            this.on('beforecarddroppedsave', this._onBeforeCardDroppedSave, this);
        }

        this.callParent(arguments);
    },

    getStoreFilter: function () {
        if (this._isCollectionField()) {
            if (this.value) {
                return [
                    {
                        property: this.attribute,
                        operator: 'contains',
                        value: this.value
                    }
                ];
            } else {
                return [
                    {
                        property: this.attribute + '.ObjectID',
                        operator: '=',
                        value: this.value
                    }
                ];
            }
        } else {
            return this.callParent(arguments);
        }
    },

    isMatchingRecord: function (record) {
        if (this._isCollectionField()) {
            var value = record.get(this.attribute),
                values = (value && value._tagsNameArray) || [];
            
            return (!this.value && !values.length) ||
                _.contains(_.pluck(values, 'Name'), this.value) ||
                _.contains(_.pluck(values, '_ref'), this.value);
        } else {
            return this.callParent(arguments);
        }
    },

    _isCollectionField: function () {
        return !!this.store.model.getField(this.attribute).isCollection();
    },

    assign: function() {
        if (this._isCollectionField()) {
            //no-op, handled in _onBeforeCardDroppedSave
        } else {
            this.callParent(arguments);
        }
    },

    _onBeforeCardDroppedSave: function(column, card, type, sourceColumn) {
        var record = card.getRecord(),
            currentValue = record.get(this.attribute),
            currentValues = (currentValue && currentValue._tagsNameArray) || [],
            newValues = _.reject(_.pluck(currentValues, '_ref'), function(val) {
                return val === sourceColumn.getValue();
            }).concat([column.getValue()]);

        card.getRecord().set(this.attribute, _.map(_.compact(newValues, function(val) {
            return {
                _ref: val
            };
        })));
    }
});
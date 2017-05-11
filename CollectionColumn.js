Ext.define('Rally.apps.board.CollectionColumn', {
    extend: 'Rally.ui.cardboard.Column',
    alias: 'widget.collectioncolumn',

    getStoreFilter: function() {
        if (this._isCollectionField()) {
            return [
                {
                    property: this.attribute,
                    operator: 'contains',
                    value: this.value
                }
            ];
        } else {
            return this.callParent(arguments);
        }
    },

    isMatchingRecord: function(record) {
        if (this._isCollectionField()) {
            var value = record.get(this.attribute),
            values = (value && value._tagsNameArray) || [];
            
            return (!this.value && !values.length) ||
            _.contains(_.pluck(values, 'Name'), this.value);
        } else {
            return this.callParent(arguments);
        }
    },

    _isCollectionField: function() {
        return !!this.store.model.getField(this.attribute).isMultiValueCustom();
    }
});
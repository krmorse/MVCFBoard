Ext.define('Rally.apps.board.CollectionColumn', {
    extend: 'Rally.ui.cardboard.Column',
    alias: 'widget.collectioncolumn',

    getStoreFilter: function() {
        return [
            {
                property: this.attribute,
                operator: 'contains',
                value: this.value
            }
        ];
    },

    isMatchingRecord: function(record) {
        var value = record.get(this.attribute),
          values = (value && value._tagsNameArray) || [];
        
        return (!this.value && !values.length) ||
          _.contains(_.pluck(values, 'Name'), this.value);
    }
});
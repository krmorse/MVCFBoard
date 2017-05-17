(function () {
    var Ext = window.Ext4 || window.Ext;

    Ext.define('Rally.apps.board.BoardApp', {
        extend: 'Rally.app.App',
        alias: 'widget.boardapp',

        requires: [
            'Rally.ui.cardboard.plugin.FixedHeader',
            'Rally.ui.gridboard.GridBoard',
            'Rally.ui.gridboard.plugin.GridBoardAddNew',
            'Rally.ui.gridboard.plugin.GridBoardInlineFilterControl',
            'Rally.ui.gridboard.plugin.GridBoardFieldPicker',
            'Rally.data.util.Sorter',
            'Rally.apps.board.Settings',
            'Rally.clientmetrics.ClientMetricsRecordable'
        ],
        mixins: [
            'Rally.clientmetrics.ClientMetricsRecordable'
        ],

        helpId: 287,
        cls: 'customboard',
        autoScroll: false,
        layout: 'fit',

        config: {
            defaultSettings: {
                type: 'HierarchicalRequirement',
                groupByField: 'ScheduleState',
                showRows: false
            }
        },

        launch: function () {
            Rally.data.ModelFactory.getModel({
                type: this.getSetting('type'),
                context: this.getContext().getDataContext()
            }).then({
                success: function (model) {
                    this.model = model;
                    this._loadColumns();
                },
                scope: this
            });
        },

        _loadColumns: function() {
            var groupByField = this.getSetting('groupByField');
            
            if (groupByField === 'Milestones') {
                var timeboxScope = this.getContext().getTimeboxScope();
                if (!timeboxScope || timeboxScope.getType() === 'milestone') {
                    Rally.ui.notify.Notifier.showError({ message: 'This app must be scoped to a valid timebox.'});
                    return;
                }

                Ext.create('Rally.data.wsapi.Store', {
                    model: 'Milestone',
                    filters: [
                        {
                            property: 'TargetDate',
                            operator: '>=',
                            value: timeboxScope.getStartDate()
                        },
                        {
                            property: 'TargetDate',
                            operator: '<=',
                            value: timeboxScope.getEndDate()
                        },
                        Rally.data.wsapi.Filter.or([
                            {
                                property: 'Projects',
                                operator: 'contains',
                                value: this.getContext().getProjectRef()
                            },
                            {
                                property: 'Projects.ObjectID',
                                value: null
                            }
                        ])
                    ],
                    autoLoad: true,
                    listeners: {
                        load: function(store, records) {
                            var columns = [null];
                            this.columns = columns.concat(_.map(records, function(record) {
                                return {
                                    value: record.get('_ref'),
                                    displayValue: record.get('_refObjectName')
                                };
                            }));
                            this._addBoard();
                        },
                        scope: this
                    }
                });
            } else {
                var field = this.model.getField(groupByField);
                field.getAllowedValueStore().load({
                    callback: function(records) {
                        var columns = _.map(records, function(record) {
                            return record.get('StringValue');
                        });
                        if (field.isMultiValueCustom()) {
                            columns = _.compact(columns);
                        }
                        this.columns = columns;
                        this._addBoard();
                    },
                    scope: this
                });
            }
        },

        _getGridBoardConfig: function () {
            var context = this.getContext(),
                modelNames = [this.getSetting('type')],
                blackListFields = ['Successors', 'Predecessors', 'DisplayColor'],
                whiteListFields = ['Milestones', 'Tags'],
                config = {
                    xtype: 'rallygridboard',
                    stateful: false,
                    toggleState: 'board',
                    cardBoardConfig: this._getBoardConfig(),
                    plugins: [
                        {
                            ptype: 'rallygridboardaddnew',
                            addNewControlConfig: {
                                stateful: true,
                                stateId: context.getScopedStateId('board-add-new')
                            }
                        },
                        {
                            ptype: 'rallygridboardinlinefiltercontrol',
                            inlineFilterButtonConfig: {
                                stateful: true,
                                stateId: context.getScopedStateId('board-inline-filter'),
                                modelNames: modelNames,
                                legacyStateIds: [
                                    context.getScopedStateId('board-owner-filter'),
                                    context.getScopedStateId('board-custom-filter-button')
                                ],
                                filterChildren: true,
                                inlineFilterPanelConfig: {
                                    quickFilterPanelConfig: {
                                        defaultFields: ['ArtifactSearch', 'Owner'],
                                        addQuickFilterConfig: {
                                            blackListFields: blackListFields,
                                            whiteListFields: whiteListFields
                                        }
                                    },
                                    advancedFilterPanelConfig: {
                                        advancedFilterRowsConfig: {
                                            propertyFieldConfig: {
                                                blackListFields: blackListFields,
                                                whiteListFields: whiteListFields
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        {
                            ptype: 'rallygridboardfieldpicker',
                            headerPosition: 'left',
                            boardFieldBlackList: blackListFields,
                            modelNames: modelNames
                        },
                        {
                            ptype: 'rallygridboardactionsmenu',
                            menuItems: [
                                {
                                    text: 'Print...',
                                    handler: this._onPrint,
                                    scope: this
                                }
                            ],
                            buttonConfig: {
                                iconCls: 'icon-export',
                                toolTipConfig: {
                                    html: 'Print',
                                    anchor: 'top',
                                    hideDelay: 0
                                }
                            }
                        },
                    ],
                    context: context,
                    modelNames: modelNames,
                    storeConfig: {
                        filters: this._getFilters()
                    },
                    listeners: {
                        load: this._onLoad,
                        scope: this
                    }
                };
            if (this.getEl()) {
                config.height = this.getHeight();
            }
            return config;
        },

        _onLoad: function () {
            this.recordComponentReady({
                miscData: {
                    type: this.getSetting('type'),
                    columns: this.getSetting('groupByField'),
                    rows: (this.getSetting('showRows') && this.getSetting('rowsField')) || ''
                }
            });
        },

        _getBoardConfig: function () {
            var boardConfig = {
                margin: '10px 0 0 0',
                attribute: this.getSetting('groupByField'),
                context: this.getContext(),
                cardConfig: {
                    editable: true,
                    showIconMenus: true
                },
                loadMask: true,
                plugins: [
                    { ptype: 'rallyfixedheadercardboard' },
                    { ptype: 'rallycardboardprinting' }
                ],
                storeConfig: {
                    sorters: Rally.data.util.Sorter.sorters(this.getSetting('order'))
                },
                columnConfig: {
                    xtype: 'collectioncolumn',
                    fields: (this.getSetting('fields') &&
                        this.getSetting('fields').split(',')) || [],
                    columnHeaderConfig: {
                        headerTpl: '{displayValue}'
                    }
                },
                columns: _.map(this.columns, function(col) {
                    var value = col,
                        header = col || 'None';
                        if (col && col.value) {
                            value = col.value;
                        }
                        if (col && col.displayValue) {
                            header = col.displayValue;
                        }
                    return { 
                        value: value,
                        columnHeaderConfig: {
                            headerData: {displayValue: header}
                        } 
                    };
                })
            };
            if (this.getSetting('showRows')) {
                Ext.merge(boardConfig, {
                    rowConfig: {
                        field: this.getSetting('rowsField'),
                        sortDirection: 'ASC'
                    }
                });
            }
            if (this._shouldDisableRanking()) {
                boardConfig.enableRanking = false;
                boardConfig.enableCrossColumnRanking = false;
                boardConfig.cardConfig.showRankMenuItems = false;
            }
            return boardConfig;
        },

        getSettingsFields: function () {
            return Rally.apps.board.Settings.getFields(this.getContext());
        },

        _shouldDisableRanking: function () {
            return this.getSetting('type').toLowerCase() === 'task' &&
                (!this.getSetting('showRows') || this.getSetting('showRows') &&
                    this.getSetting('rowsField').toLowerCase() !== 'workproduct');
        },

        _addBoard: function () {
            var gridBoard = this.down('rallygridboard');
            if (gridBoard) {
                gridBoard.destroy();
            }
            this.add(this._getGridBoardConfig());
        },

        onTimeboxScopeChange: function () {
            this.callParent(arguments);
            this._addBoard();
        },

        _getFilters: function () {
            var queries = [],
                timeboxScope = this.getContext().getTimeboxScope();
            if (this.getSetting('query')) {
                queries.push(Rally.data.QueryFilter.fromQueryString(this.getSetting('query')));
            }
            if (timeboxScope && timeboxScope.isApplicable(this.model)) {
                queries.push(timeboxScope.getQueryFilter());
            }

            return queries;
        },

        _onPrint: function() {
            this.down('rallygridboard').getGridOrBoard().openPrintPage({title: 'MVCF Board'});
        }
    });
})();

Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    items: [
        {
            xtype: 'container',
            itemId: 'controlsContainer',
            columnWidth: 1
        },
        {
            xtype: 'container',
            itemId: 'gridContainer',
            columnWidth: 1
        }
    ],

    _currentUser: null,
    _currentUserName: null,
    _snapshotStore: null,
    _storyRecords: [],
    _storyGrid: null,

    launch: function() {

        var me = this;

        // Get currently logged-in user
        me._currentUser = this.getContext().getUser();
        me._currentUserName = me._currentUser._refObjectName;

        // Query for story snapshot 0's
        me._getStorySnapshots();

    },

    _getStorySnapshots: function() {

        var me = this;

        var currentUserOID = me._currentUser.ObjectID;
        var currentProjectOID = parseInt(me.getContext().getProjectRef().match(/\d+/), 10);

        this._snapshotStore = Ext.create('Rally.data.lookback.SnapshotStore', {
            autoLoad : true,
            limit: Infinity,
            listeners: {
                load: this._processSnapShotData,
                scope : this
            },
            fetch: ['ObjectID','Name','_User','FormattedID','Priority','ScheduleState', 'PlanEstimate','TaskEstimateTotal','TaskRemainingTotal'],
            hydrate: ['FormattedID','ScheduleState','_User'],
            context: {
                workspace: me.getContext().getWorkspaceRef(),
                project: me.getContext().getProjectRef(),
                projectScopeUp: false,
                projectScopeDown: true
            },
            filters: [
                {
                    property: '_TypeHierarchy',
                    operator: 'in',
                    value: ['HierarchicalRequirement']
                },
                {
                    property: '_ProjectHierarchy',
                    value: currentProjectOID
                },
                {
                    property: '_SnapshotNumber',
                    value: 0
                },
                {
                    property: '_User',
                    value: currentUserOID
                }
            ]
        });
    },

    _processSnapShotData : function(store, data, success) {

        var me = this;
        var records = [];

        Ext.Array.each(data, function(record) {
            var creationDateTime = me._nicerDateString(record.get('_ValidFrom'));
            var newRecord = {
                "_ref"          : "/hierarchicalrequirement/" + record.get('ObjectID'),
                "FormattedID"   : record.get('FormattedID'),
                "ObjectID"      : record.get('ObjectID'),
                "Name"          : record.get('Name'),
                "ScheduleState" : record.get('ScheduleState'),
                "CreationDate"  : creationDateTime,
                "Creator"       : me._currentUserName
            };
            records.push(newRecord);
        });

        me._storyRecords = records;
        me._makeGrid();
    },

    _sortArrays: function(arr, sortArr) {
        var result = [];
        for(var i=0; i < arr.length; i++) {
            result[i] = arr[sortArr[i]];
        }
        return result;
    },

    _stringArrayToIntArray: function(stringArray) {
        var result = [];
        Ext.Array.each(stringArray, function(thisString) {
            result.push(parseInt(thisString, 10));
        });
        return result;
    },

    _makeGrid : function() {

        var me = this;

        if (me._storyGrid) {
            me._storyGrid.destroy();
        }


        var gridStore = Ext.create('Rally.data.custom.Store', {
            data: me._storyRecords,
            pageSize: 200,
            remoteSort: false
        });

        me._storyGrid = Ext.create('Rally.ui.grid.Grid', {
            itemId: 'storyGrid',
            store: gridStore,
            columnCfgs: [
                {
                    text: 'Formatted ID', dataIndex: 'FormattedID', xtype: 'templatecolumn',
                    tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate')
                },
                {
                    text: 'Name', dataIndex: 'Name', flex: 1
                },
                {   text: 'ScheduleState', dataIndex: 'ScheduleState'
                },
                {
                    text: 'Date Created', dataIndex: 'CreationDate', flex: 1
                },
                {
                    text: 'Created By', dataIndex: 'Creator'
                }
            ]
        });

        me.down('#gridContainer').add(me._storyGrid);
        me._storyGrid.reconfigure(gridStore);

    },

    _nicerDateString: function(datestring) {

        return datestring.replace(/T/," ").replace(/Z/, " UTC");

    },

    _noArtifactsNotify: function() {

        if (this._storyGrid) {
            this._storyGrid.destroy();
        }

        this._storyGrid = this.down('#gridContainer').add({
            xtype: 'container',
            html: "No Stories found."
        });
    }

});
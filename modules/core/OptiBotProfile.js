const RecordEntry = require(`./OptiBotRecordEntry.js`);

module.exports = class OptiBotProfile {
    constructor(raw) {
        var pd = {
            id: null,
            format: 3,
            ndata: {}, // normal data
            edata: { // essential data
                lastSeen: new Date().getTime()
            }
        };

        if(raw) {
            if(raw.id) pd.id = raw.id;
            if(raw.ndata) pd.ndata = raw.ndata;
            if(raw.edata) pd.edata = raw.edata;
        }

        Object.defineProperty(this, 'raw', {
            get: () => {
                return pd;
            },
            set: (data) => {
                pd = data;
            }
        });

        Object.defineProperty(this, 'ndata', {
            get: () => {
                return pd.ndata;
            },
            set: (data) => {
                pd.ndata = data;
            }
        });

        Object.defineProperty(this, 'edata', {
            get: () => {
                return pd.edata;
            },
            set: (data) => {
                pd.edata = data;
            }
        });
    }

    getRecord(id) {
        // todo, copy stuff from !records command
    }
}
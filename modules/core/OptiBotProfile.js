const RecordEntry = require(`./OptiBotRecordEntry.js`);
const Memory = require(`./OptiBotMemory.js`);

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

        this.raw = pd;
        this.ndata = pd.ndata;
        this.edata = pd.edata;
    }

    getRecord(id) {
        const bot = Memory.core.client;
        const log = bot.log;

        return new Promise((resolve, reject) => {
            if(!this.edata.record) resolve(null);

            let children = [];
            let found = null;
            let record = this.edata.record;

            for(let i = 0; i < record.length; i++) {
                let entry = record[i]

                if(entry.parent === id) {
                    children.push(entry.date);
                } else
                if(entry.date === id) {
                    found = entry;
                    // not using break here because we still need to find any children of this entry
                }

                if(i+1 >= record.length) {
                    if(found === null) {
                        resolve(null)
                    } else {
                        if(children.length > 0) {
                            found.children = children;
                        }
                        
                        bot.users.fetch(found.moderator).then(moderator => {
                            found.moderator = moderator;
                            if(found.pardon) {
                                bot.users.fetch(found.pardon.admin).then(admin => {
                                    found.pardon.admin = admin;
                                    resolve(new RecordEntry(found));
                                }).catch(reject);
                            } else {
                                resolve(new RecordEntry(found));
                            }
                        }).catch(reject);
                    }
                }
            }
        });
    }

    updateRecord(data) {
        const bot = Memory.core.client;
        const log = bot.log;
        
        return new Promise((resolve, reject) => {
            if(!this.edata.record) reject(new Error('This user does not have a record.'));

            let newEntry = (data instanceof RecordEntry) ? data.getRaw() : data;
            let record = this.edata.record;

            for(let i = 0; i < record.length; i++) {
                let entry = record[i]

                if(entry.date === newEntry.date) {
                    entry = newEntry;
                    resolve(entry);
                } else
                if(i+1 >= record.length) {
                    reject(new Error('Invalid case ID.'));
                }
            }
        });
    }
}
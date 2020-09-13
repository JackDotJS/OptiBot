const util = require('util');
const djs = require('discord.js');

const RecordEntry = require('./OptiBotRecordEntry.js');
const Memory = require('./OptiBotMemory.js');

module.exports = class OptiBotProfile {
  constructor(raw) {
    const pd = {
      id: null,
      format: 3,
      ndata: {}, // normal data
      edata: { // essential data
        lastSeen: new Date().getTime()
      }
    };

    if (raw) {
      if (raw.id) pd.id = raw.id;
      if (raw.ndata) pd.ndata = raw.ndata;
      if (raw.edata) pd.edata = raw.edata;
    }

    this.raw = pd;
    this.id = pd.id;
    this.ndata = pd.ndata;
    this.edata = pd.edata;
  }

  getRecord(id) {
    const bot = Memory.core.client;
    const log = bot.log;

    return new Promise((resolve, reject) => {
      if (!this.edata.record) resolve(null);

      let target = id;

      if (!Number.isInteger(parseInt(id))) {
        target = parseInt(id, 36);
      }

      const children = [];
      let found = null;
      let index = null;
      const record = this.edata.record;

      for (let i = 0; i < record.length; i++) {
        const entry = record[i];

        if (entry.parent === target) {
          children.push(entry.date);
        } else
        if (entry.date === target) {
          index = i;
          found = entry;
          // not using break here because we still need to find any children of this entry
        }
      }

      if (!found) {
        resolve(null);
      } else {
        found.index = index;

        if (children.length > 0) {
          found.children = children;
        }

        bot.users.fetch(found.moderator).then(moderator => {
          found.moderator = moderator;
          if (found.pardon) {
            bot.users.fetch(found.pardon.admin).then(admin => {
              found.pardon.admin = admin;
              resolve(new RecordEntry(found));
            }).catch(reject);
          } else {
            resolve(new RecordEntry(found));
          }
        }).catch(reject);
      }
    });
  }

  updateRecord(data) {
    const bot = Memory.core.client;
    const log = bot.log;

    return new Promise((resolve, reject) => {
      if (!this.edata.record) reject(new Error('This user does not have a record.'));

      log(util.inspect(data));
      log(data.constructor === RecordEntry);
      log(util.inspect(data.raw));

      const newEntry = (data.constructor === RecordEntry) ? data.raw : data;
      const record = this.edata.record;

      log(util.inspect(newEntry));

      for (let i = 0; i < record.length; i++) {
        if (record[i].date === newEntry.date) {
          record[i] = newEntry;
          resolve(newEntry);
        } else
        if (i + 1 >= record.length) {
          reject(new Error('Invalid case ID.'));
        }
      }
    });
  }

  getPoints() {
    const bot = Memory.core.client;
    const log = bot.log;
    const now = new Date().getTime();

    const final = {
      maximum: 0,
      current: 0,
      minimum: 0
    };

    const record = this.edata.record;
    if (!record) return final;

    for (let i = 0; i < record.length; i++) {
      const entry = record[i];

      if (entry.action === 5 && !entry.pardon) {
        const points = parseInt(entry.details.match(/(?<=points assigned: \[)\d+(?=\])/i)[0]);

        final.maximum += points;
        final.current += points; // temp
        final.minimum += points; // temp

        // todo: calculate point decay (#154)
      }

      if (i + 1 >= record.length) {
        return final;
      }
    }
  }
};
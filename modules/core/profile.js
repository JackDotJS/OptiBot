const util = require(`util`);
/* const djs = require('discord.js'); */

const RecordEntry = require(`./record_entry.js`);
const memory = require(`./memory.js`);

module.exports = class OptiBotProfile {
  constructor(data) {
    const bot = memory.core.client;
    const log = bot.log;

    if (data instanceof OptiBotProfile) data = data.raw;

    this._id = null;
    this.format = 3;
    this.ndata = {}; // normal data
    this.edata = { // essential data
      lastSeen: new Date().getTime()
    };

    if (data != null && data.constructor === Object) {
      if (data._id != null && typeof data._id === `string`) this._id = data._id;
      if (data.ndata != null && data.ndata.constructor === Object) this.ndata = data.ndata;
      if (data.edata != null && data.edata.constructor === Object) this.edata = data.edata;
    }

    if (this._id == null) throw new Error(`Profile ID must be specified.`);

    Object.defineProperty(this, `raw`, {
      get: () => {
        return {
          _id: this._id,
          format: this.format,
          ndata: this.ndata,
          edata: this.edata
        };
      }
    });
  }
};
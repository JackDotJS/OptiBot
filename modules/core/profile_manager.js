const memory = require(`./memory.js`);
const Profile = require(`./profile.js`);

module.exports = class OptiBotProfileManager {
  constructor() {
    throw new Error(`Why are you doing this? (Cannot instantiate this class.)`);
  }

  static get(id, create) {
    const bot = memory.core.client;
    const log = bot.log;

    return new Promise((resolve, reject) => {
      log(`get profile: ${id}`);
      if (create) log(`allow new profile`);

      memory.db.profiles.find({ id, format: 3 }, (err, docs) => {
        if (err) return reject(err);
        
        if (docs[0]) return resolve(new Profile(docs[0]));
        
        return resolve(new Profile({ id }));
      });
    });
  }

  static update(data) {
    const bot = memory.core.client;
    const log = bot.log;

    return new Promise((resolve, reject) => {
      if (!(data instanceof Profile)) return reject(new TypeError(`OptiBot profile not provided.`));

      const profile = data.raw;

      if (Object.keys(profile.ndata).length === 0 && Object.keys(profile.edata).length === 1 && profile.edata.lastSeen != null) {
        log(`no data worth saving`);
        return resolve(data);
      }

      log(`update profile: ${profile.id}`);

      memory.db.profiles.update({ id: profile.id }, profile, { upsert: true }, (err) => {
        if (err) return reject(err);

        return resolve(data);
      });
    });
  }
};
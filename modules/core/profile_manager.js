const memory = require(`./memory.js`);
const Profile = require(`./profile.js`);

module.exports = class UserProfileManager {
  constructor() {
    throw new Error(`Why are you doing this? (Cannot instantiate this class.)`);
  }

  static async get(id, create) {
    const bot = memory.core.client;
    const log = bot.log;

    log(`get profile: ${id}`);
    if (create) log(`allow new profile`);

    const doc = await memory.db.profiles.findOne({ _id: id });

    if (doc) return new Profile(doc);
      
    if (create) return new Profile({ _id: id });

    return null;
  }

  static async update(data) {
    const bot = memory.core.client;
    const log = bot.log;

    if (!(data instanceof Profile)) return new TypeError(`OptiBot profile not provided.`);

    const profile = data.raw;

    if (Object.keys(profile.ndata).length === 0 && Object.keys(profile.edata).length === 1 && profile.edata.lastSeen != null) {
      log(`no data worth saving`);
      return data;
    }

    log(`update profile: ${profile._id}`);

    await memory.db.profiles.update({ _id: profile._id }, profile, { upsert: true });

    return data;
  }
};
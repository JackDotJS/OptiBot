const Memory = require(`../core/memory.js`);
const Profile = require(`../core/profile.js`);

/**
     * @param {String} id Profile ID to search for.
     * @param {Boolean} [create] If true, and a profile with the given id does not exist, create a new profile. Otherwise, return null.
     * @returns {Promise<Profile>|Promise<null>}
     */
module.exports = (id, create) => {
  const bot = Memory.core.client;
  const log = bot.log;

  return new Promise((resolve, reject) => {
    log(`get profile: ` + id);
    Memory.db.profiles.find({ id, format: 3 }, (err, docs) => {
      if (err) {
        reject(err);
      } else if (docs[0]) {
        resolve(new Profile(docs[0]));
      } else if (create) {
        resolve(new Profile({ id }));
      } else {
        resolve();
      }
    });
  });
};
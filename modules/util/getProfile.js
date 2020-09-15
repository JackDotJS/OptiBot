const Memory = require('../core/OptiBotMemory.js');
const Profile = require('../core/OptiBotProfile.js');

const bot = Memory.core.client;
const log = bot.log;

/**
     * @param {OptiBot} bot OptiBot client.
     * @param {String} id Profile ID to search for.
     * @param {Boolean} [create] If true, and a profile with the given id does not exist, create a new profile. Otherwise, return null.
     * @returns {Promise<Profile>|Promise<null>}
     */
module.exports = (id, create) => {
  return new Promise((resolve, reject) => {
    log('get profile: ' + id);
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
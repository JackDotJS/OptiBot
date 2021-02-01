const Profile = require('../core/profile.js');
const Memory = require('../core/memory.js');

module.exports = (data) => {
  return new Promise((resolve, reject) => {
    let raw = data;

    if (data instanceof Profile) raw = data.raw;

    Memory.db.profiles.update({ id: raw.id }, raw, { upsert: true }, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};
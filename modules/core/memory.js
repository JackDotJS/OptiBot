const Database = require(`nedb-promises`);
const path = require(`path`);

console.log(path.parse(process.cwd()).root);

const memory = {
  core: {
    client: {
      // these are also defined in vector.js
      keys: require(`../../cfg/keys.json`),
      log: console.log
      // see vector.js for additional properties that are added here during initialization
    },
    logfile: null
  },
  assets: {
    needReload: [],
    commands: [],
    optibits: [],
    icons: []
  },
  db: {
    profiles: Database.create({ filename: `./data/profiles.db`, autoload: true }), // user data
    guilds: Database.create({ filename: `./data/guilds.db`, autoload: true }), // guild data
  },
  li: 0, // date of last interaction
  presence: {
    status: `online`
  },
  presenceRetry: 0,
  presenceHour: new Date().getHours(),
  users: [], // ids of every user active today
  audit: {
    log: null, // audit log cache
    time: null,
  },
  mutes: [], // all users scheduled to be unmuted today
  mpc: [], // channel ids where modping is on cooldown,
  wintitle: null, // text used for console title
  targets: {}, // target memory. lists the previous target used by a given user in commands.
  rdel: [], // recent deletions
  rban: {}, // recent bans
  donatorInvites: {}, // donator invite cache
};

module.exports = memory;
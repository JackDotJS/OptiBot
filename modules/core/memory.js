const Database = require(`nedb`);

const memory = {
  core: {
    client: {
      // both of these are also defined in client.js
      keys: require(`../../cfg/keys.json`),
      log: console.log
      // see client.js for additional properties that are added here during initialization
    },
  },
  assets: {
    needReload: [],
    commands: [],
    optibits: [],
    icons: []
  },
  db: {
    profiles: new Database({ filename: `./data/profiles.db`, autoload: true }), // optibot profiles
    info: new Database({ filename: `./data/info.db`, autoload: true }), // info channel data
    bl: new Database({ filename: `./data/blacklist.db`, autoload: true }), // blacklist
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
  firstBoot: true // true until the bot finishes initial boot. used to prevent ready event from running more than once
};

module.exports = memory;
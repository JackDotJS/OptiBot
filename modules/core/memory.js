const path = require(`path`);
const fs = require(`fs`);
const Database = require(`nedb`);

const memory = {
  core: {
    client: {
      keys: require(path.resolve(`./cfg/keys.json`)), // Also defined in OBClient
      log: console.log // Also defined in OBClient
      // Things defined here from OBClient:
      // cfg, mode, pause, exitTime, locked, prefix, prefxies, version
    },
    logfile: null, // filename of running console log
    root: {
      drive: null,
      dir: null,
      folder: null
    },
    bootFunc: null,  // used to hold boot function when bot cant connect
  },
  assets: {
    needReload: [],
    commands: [],
    optibits: [],
    icons: []
  },
  db: {
    profiles: new Database({ filename: `./data/profiles.db`, autoload: true }), // optibot profiles
    stats: new Database({ filename: `./data/statistics.db`, autoload: true }), // server statistics
    bl: new Database({ filename: `./data/blacklist.db`, autoload: true }),
    faq: new Database({ filename: `./data/faq.db`, autoload: true }),
    pol: new Database({ filename: `./data/policies.db`, autoload: true }), // policies search keywords
    rules: new Database({ filename: `./data/rules.db`, autoload: true }) // rules search keywords
  },
  _temp: null, // used to hold boot function when bot cant connect
  sm: {},
  li: 0, // date of last interaction
  presence: {
    status: `online`
  },
  presenceRetry: 0,
  presenceHour: new Date().getHours(),
  vote: {
    issue: null,
    author: null,
    message: null
  },
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
  firstBoot: true
};

/**
 * OptiBot memory Module
 */
module.exports = memory;
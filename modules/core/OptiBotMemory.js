const path = require(`path`);
const fs = require(`fs`);
const database = require('nedb');

const memory = {
    core: {
        client: {
            keys: require(path.resolve('./cfg/keys.json')),
            log: console.log
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
        splash: require(path.resolve('./cfg/splash.json')),
        commands: [],
        optibits: [],
        images: {
            default: fs.readFileSync(path.resolve('./assets/img/default.png')),
            index: []
        }
    },
    db: {
        msg: new database({ filename: './data/messages.db', autoload: true }), // react-deletion cache
        profiles: new database({ filename: './data/profiles.db', autoload: true }), // optibot profiles
        cprofiles: new database({ filename: './data/profiles_original.db', autoload: true }), // OLD optibot profiles
        stats: new database({ filename: './data/statistics.db', autoload: true }), // server statistics
        bl: new database({ filename: './data/blacklist.db', autoload: true }),
        faq: new database({ filename: './data/faq.db', autoload: true }),
        pol: new database({ filename: './data/policies.db', autoload: true })
    },
    _temp: null, // used to hold boot function when bot cant connect
    sm: {},
    li: 0, // date of last interaction
    presence: {
        status: 'online'
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
    mods: [], // all moderators and their current status
    mutes: [], // all users scheduled to be unmuted today
    mpc: [], // channel ids where modping is on cooldown,
    wintitle: null, // text used for console title
    targets: {}, // target memory. lists the previous target used by a given user in commands.
    rdel: [], // recent deletions
    rban: {}, // recent bans
    donatorInvites: {}, // donator invite cache
}

/**
 * OptiBot Memory Module
 */
module.exports = memory;
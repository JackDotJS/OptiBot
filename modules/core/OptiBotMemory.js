const memory = {
    core: {
        client: {
            log: console.log
        },
        logfile: null, // filename of running console log
    },
    _temp: null, // used to hold boot function when bot cant connect
    sm: {},
    li: 0, // date of last interaction
    bot: {
        locked: null,
        init: true,
    },
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
    
}

/**
 * OptiBot Memory Module
 */
module.exports = memory;
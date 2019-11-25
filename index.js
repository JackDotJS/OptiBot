// Written by Kyle Edwards <wingedasterisk@gmail.com>, November 2019
// 6,000+ lines of complete and utter shit coming right up.
// ========================================================================
// Child Node: Main Program

////////////////////////////////////////////////////////////////////////////////
// Dependencies & Configuration files
////////////////////////////////////////////////////////////////////////////////

const discord = require('discord.js');
const request = require('request');
const jimp = require('jimp');
const cstr = require('string-similarity');
const wink = require('jaro-winkler');
const database = require('nedb');
const callerId = require('caller-id');
const archive = require('adm-zip');

const fs = require('fs');
const util = require('util');
const events = require('events');

const cfg = require('./cfg/config.json');
const keys = require('./cfg/keys.json');
const pkg = require('./package.json');
const build = require('./data/build.json');
const serverlist = require('./cfg/servers.json');
const docs_list = require('./cfg/docs.json');

////////////////////////////////////////////////////////////////////////////////
// Pre-initialize
////////////////////////////////////////////////////////////////////////////////

/**
 * Prints a message to the console and saves to the current log file.
 * 
 * @param {*} message The message to be displayed. This can be any type of object, and will be automatically converted to a string.
 * @param {string} [level="info"] The log level this message should appear on.
 * @param {number} [lineNum] The line number to display for this log entry. Defaults to the line number this method was called on.
 */
const log = (message, level, lineNum) => {
    let cid = callerId.getData();
    let path = (cid.evalFlag) ? 'eval()' : cid.filePath;
    let filename = path.substring(path.lastIndexOf('\\')+1);
    let line = cid.lineNumber;

    process.send({
        type: 'log',
        message: message,
        level: level,
        misc: filename+':'+((lineNum) ? lineNum : line) 
    });
}

class ImageIndex {
    constructor() {
        this.index = [];
        this.default = {};
    }

    add(image, name) {
        if (name.toLowerCase().indexOf('default') > -1) {
            this.default = image;
        } else {
            this.index.push({
                filename: name,
                buffer: image
            });
        }
    }

    get(query) {
        for (let i in this.index) {
            if (query === this.index[i].filename) {
                return this.index[i].buffer;
            } else
                if (parseInt(i) + 1 === this.index.length) {
                    return this.default;
                }
        }
    }
}

const memory = {
    db: {
        msg: new database({ filename: './data/messages.db', autoload: true }),
        motd: new database({ filename: './data/motd.db', autoload: true }),
        profiles: new database({ filename: './data/profiles.db', autoload: true }),
        stats: new database({ filename: './data/statistics.db', autoload: true }),
        smr: new database({ filename: './data/smr.db', autoload: true })
    },
    bot: {
        trigger: cfg.basic.trigger,
        debug: false,
        shutdown: false,
        booting: true,
        locked: false,
        lastInt: 0,
        icons: new ImageIndex(),
        images: new ImageIndex(),
        smr: [],
        docs: [],
        docs_cat: {},
        cdb: [],
        alog: 0,
        log: [],
        servers: {},
        avatar: {},
        status: {},
        motd: {},
        actMods: [],
        newUsers: [],
        dataPickup: {},
        botStatus: null,
        botStatusTime: new Date().getTime()
    },
    stats: {
        // todo: update these values in real time, save every 5-10 minutes *and* before shutting down.
        // stats data should be saved in terms of months rather than individual days.

        // also todo: save this note on the github post (#5)
        messages: 0,
        dms: 0,
        commands: 0,
        unique: []
    },
    cd: {
        active: false,
        mult: 1,
        timer: false,
        threshold: 0
    },
    activity: {
        status: 'online',
        game: '',
        type: '',
        url: ''
    },
    debug: [
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null
    ]
}

const TOOLS = {}

/** OptiBot Command */
class Command {
    /**
     * Creates a new command.
     * 
     * @constructor
     * @param {object} md Object containing all relevant data for this command.
     * @param {string} md.trigger String that triggers this command when preceded by OptiBot's command prefix. (memory.bot.trigger)
     * @param {string} [md.short_desc] Short description of this command. Should be only one sentence long, and should only fit on a single line. This is displayed on the !list command. For the sake of consistency, avoid using markdown syntax here.
     * @param {string} [md.long_desc] Long description of this command. This is shown on the !help embed for this command, and can use Discord's markdown. Maximum length 2048 characters.
     * @param {string} [md.usage] Describes this commands arguments.
     * @param {string} [md.image] An image to be shown when viewing this command through !help.
     * @param {string[]} [md.tags] Array of usage tags.
     * @param {function} md.fn Actual code to execute when this command is triggered.
     */
    constructor(md) {
        if (!md.trigger) {
            throw new Error('Command trigger is required.');
        } else
        if (!md.fn) {
            throw new Error('Command function is required.');
        } else {
            this.metadata = {
                trigger: md.trigger,
                short_desc: md.short_desc || 'This command has no set description.',
                long_desc: md.long_desc || md.short_desc || 'This command has no set description.',
                usage: (md.usage) ? memory.bot.trigger + md.trigger + ' ' + md.usage : memory.bot.trigger + md.trigger,
                image: md.image || false,
                tags: {
                    MODERATOR_ONLY: false, // Only moderators and admins can use this command
                    NO_JR_MOD: false, // Junior Moderators not allowed to use this command. Must be paired with MODERATOR_ONLY
                    DEVELOPER_ONLY: false, // Only developers can use this command
                    NO_DM: false, // Cannot be used in Direct Messages
                    DM_OPTIONAL: false, // Can be used in server chat OR Direct Messages
                    DM_ONLY: false, // Can ONLY be used in Direct Messages
                    BOT_CHANNEL_ONLY: false, // If in server, can only be used in the designated bot channels. Mutually exclusive with DM_ONLY and NO_DM
                    MOD_CHANNEL_ONLY: false, // Can only be used in moderator-only channels. 
                    DELETE_ON_MISUSE: false, // Deletes the users message if any restriction results in the command not firing.
                    STRICT: false, // TODO: Restrictions apply to all members, including moderators and developers.
                    HIDDEN: false // TODO: Command is treated as non-existent to any user apart from developers.
                }
            }

            if(Array.isArray(md.tags)) {
                md.tags.forEach(t => {
                    if(typeof this.metadata.tags[t] === 'boolean') {
                        this.metadata.tags[t] = true;
                    }
                });

                if((this.metadata.tags['NO_DM'] && this.metadata.tags['DM_OPTIONAL'])) {
                    throw new Error(`${memory.bot.trigger}${md.trigger}: Command tags NO_DM and DM_OPTIONAL are mutually exclusive.`);
                }
                if(this.metadata.tags['DM_OPTIONAL'] && this.metadata.tags['DM_ONLY']) {
                    throw new Error(`${memory.bot.trigger}${md.trigger}: Command tags DM_OPTIONAL and DM_ONLY are mutually exclusive.`);
                }
                if(this.metadata.tags['NO_DM'] && this.metadata.tags['DM_ONLY']) {
                    throw new Error(`${memory.bot.trigger}${md.trigger}: Command tags NO_DM and DM_ONLY are mutually exclusive.`);
                }
                if(this.metadata.tags['BOT_CHANNEL_ONLY'] && this.metadata.tags['DM_ONLY']) {
                    throw new Error(`${memory.bot.trigger}${md.trigger}: Command tags BOT_CHANNEL_ONLY and DM_ONLY are mutually exclusive.`);
                }
                if(this.metadata.tags['BOT_CHANNEL_ONLY'] && this.metadata.tags['NO_DM']) {
                    throw new Error(`${memory.bot.trigger}${md.trigger}: Command tags BOT_CHANNEL_ONLY and NO_DM are mutually exclusive.`);
                }
                if(this.metadata.tags['MODERATOR_ONLY'] && this.metadata.tags['DEVELOPER_ONLY']) {
                    throw new Error(`${memory.bot.trigger}${md.trigger}: Command tags MODERATOR_ONLY and DEVELOPER_ONLY are mutually exclusive.`);
                }
                if(this.metadata.tags['NO_JR_MOD'] && !this.metadata.tags['MODERATOR_ONLY']) {
                    throw new Error(`${memory.bot.trigger}${md.trigger}: Command tag NO_JR_MOD must be paired with MODERATOR_ONLY.`);
                }
            } else {
                this.metadata.tags['DEVELOPER_ONLY'] = true;
                this.metadata.tags['DM_OPTIONAL'] = true;
            }

            this.fn = md.fn;
        }
    }

    /**
     * Executes this command.
     * 
     * @param {discord.Message} m The Discord message that triggered this command.
     * @param {string[]} [args] User-defined arguments for this command.
     * @param {discord.GuildMember} [member] The server member who executed this command.
     * @param {object} [misc] Extra data to be passed to the command. Currently this only defines permission levels. (isAdmin, isSuper)
     */
    exec(...args) {
        this.fn(...args);
    }

    /**
     * Returns metadata for this command.
     * 
     * @return {object} Metadata of this command.
     */
    getMetadata() {
        return this.metadata;
    }
}

/** OptiBot Command Registry */
const CMD = {
    index: [],
    /**
     * Register a new command.
     * 
     * @param {Command} cmd The command to register. Must be an instance of the Command class.
     */
    register(cmd) {
        if (cmd instanceof Command) {
            log('command registered: ' + cmd.getMetadata().trigger, 'trace');
            this.index.push(cmd);
        } else {
            throw new Error('Command must be an instance of class Command');
        }
    },
    /** Sorts all commands in the registry by their trigger in alphabetical order. */
    sort() {
        this.index.sort((a, b) => a.getMetadata().trigger.localeCompare(b.getMetadata().trigger));
    },
    /**
     * Get all commands in the registry.
     * 
     * @param {function(Command[])} cb {}
     */
    getAll(cb) {
        cb(this.index);
    },
    /** */
    get(query, cb) {
        for (let i in this.index) {
            if (query.toLowerCase() === this.index[i].getMetadata().trigger) {
                cb(this.index[i]);
                break;
            } else
                if (parseInt(i) + 1 === this.index.length) {
                    cb();
                }
        }
    }
}

////////////////////////////////////////////////////////////////////////////////
// Initialize
////////////////////////////////////////////////////////////////////////////////

if (process.argv[2] === 'true') {
    log('OPTIBOT RUNNING IN DEBUG MODE', 'warn');
    memory.bot.debug = true;
    memory.bot.trigger = cfg.basic.trigger_alt;
}

log('Logging into Discord API...', 'warn');
process.title = 'Logging in...';

memory.db.msg.persistence.setAutocompactionInterval(300000);
memory.db.profiles.persistence.setAutocompactionInterval(100000);
memory.db.stats.persistence.setAutocompactionInterval(600000);

const bot = new discord.Client();
bot.login(keys.discord).then(() => {
    process.title = 'Loading required assets...';
    TOOLS.statusHandler(0);
}).catch(err => {
    log(err.stack, 'fatal');
    TOOLS.shutdownHandler(24);
});

memory.bot.activity_check = bot.setInterval(() => {
    if (!memory.bot.shutdown && !memory.bot.booting) {
        log('begin activity_check', 'trace');
        process.send({
            type: 'status',
            guild: null,
            channel: null,
            message: false,
        });
        bot.user.setStatus(memory.activity.status);
        bot.user.setActivity(memory.activity.game, { url: memory.activity.url, type: memory.activity.type });
    }
}, 900000);

memory.bot.mute_check = bot.setInterval(() => {
    if (!memory.bot.shutdown && !memory.bot.booting) {
        log('begin mute_check', 'trace');
        process.send({
            type: 'status',
            guild: null,
            channel: null,
            message: false,
        });
        memory.db.profiles.find({ mute: { $exists: true }}, (err, res) => {
            if (err) TOOLS.errorHandler({ err: err });
            else if (res.length === 0) {
                log('No muted users in database.', 'debug');
            } else {
                let unmuteAgenda = [];
                let retryCount = 0;
                let i = 0;

                let bannedUsersRemoved = 0;

                
                bot.guilds.get(cfg.basic.of_server).fetchBans().then(bans => {
                    log('checking '+res.length+' user(s) for muteHandler', 'debug');
                    for(let i_s=0;i_s<res.length;i_s++) {
                        log(`checking ${i_s+1}/${res.length}`, 'trace')

                        if (bans.has(res[i_s].member_id)) {
                            memory.db.profiles.remove({ member_id: res[i_s].member_id }, {multi: true}, (err) => {
                                if (err) {
                                    TOOLS.errorHandler({ err: err });
                                } else {
                                    bannedUsersRemoved++;
                                }
                            });
                        } else
                        if (typeof res[i_s].mute.end === 'number' && (new Date().getTime() > res[i_s].mute.end)) {
                            unmuteAgenda.push(res[i_s].member_id);
                        }

                        if (i_s+1 === res.length) {
                            log('loop finished', 'trace')
                            bot.setTimeout(() => {
                                unmuteLooper();
                            }, 2500);
                        }
                    }
                    
                    function unmuteLooper() {
                        log(`this: ${i}`, 'trace');
                        if (unmuteAgenda.length === 0) {
                            log('No users to unmute.', 'debug')

                            if (bannedUsersRemoved > 0) {
                                // todo: this message isnt showing for some reason
                                // apart from that, the new system for removing banned users seems to work so i guess thats cool
                                log(`Removed ${bannedUsersRemoved} banned user(s) from muted list.`)
                            }
                            return;
                        }
                        if (unmuteAgenda[i] === undefined) {
                            log('Finished checking mute database.', 'debug');
                            return;
                        }
                        if (retryCount === 2) {
                            log(`Failed to unmute user (ID#${unmuteAgenda[i]})`, 'fatal');
                            i++;
                            unmuteLooper();
                            return;
                        }

                        log('unmuteAgenda[i] === '+unmuteAgenda[i], 'trace');
                        log('retryCount === '+retryCount, 'trace')

                        if (i === 0 && retryCount === 0) log('Mute time limit expired for '+unmuteAgenda.length+' member(s).', 'warn');

                        bot.guilds.get(cfg.basic.of_server).fetchMember(unmuteAgenda[i]).then(member => {
                            if (member.roles.has(cfg.roles.muted)) {
                                member.removeRole(cfg.roles.muted, "Mute time limit expired.").then(() => {
                                    removeFromDB(unmuteAgenda[i]);
                                }).catch(err => {
                                    TOOLS.errorHandler({ err: err });
                                    retryCount++;
                                    log('Retrying unmute...', 'warn');
                                    unmuteLooper();
                                });
                            } else {
                                removeFromDB(unmuteAgenda[i]);
                            }
                        }).catch(err => {
                            if (err.message.toLowerCase().indexOf('invalid or uncached id provided') > -1 || err.message.toLowerCase().indexOf('unknown member') > -1) {
                                log(`Muted user ${unmuteAgenda[i]} appears to no longer be in the server. Removing from database...`);
                                removeFromDB(unmuteAgenda[i]);
                            } else {
                                TOOLS.errorHandler({ err: err });
                                retryCount++;
                                log('Retrying unmute...', 'warn');
                                unmuteLooper();
                            }
                        });
                    }

                    function removeFromDB(userid) {
                        memory.db.profiles.update({ member_id: userid }, { $unset: { mute: true } }, (err) => {
                            if (err) {
                                TOOLS.errorHandler({ err: err });
                                retryCount++;
                                log('Retrying unmute...', 'warn');
                                unmuteLooper();
                            } else {
                                log(`User ${userid} successfully removed from DB.`, 'trace');
                                retryCount = 0;
                                i++
                                unmuteLooper();
                            }
                        });
                    }
                }).catch(err => {
                    TOOLS.errorHandler({err:err});
                });
            }
        });
    }
}, 300000);

memory.bot.restart_check = bot.setInterval(() => {
    if (!memory.bot.shutdown && !memory.bot.booting) {
        let now = new Date();
        // AWS server in GMT time.
        // 8 AM to OptiBot = 2 AM in US central time
        if (now.getHours() === 8 && now.getMinutes() === 0) {
            memory.bot.shutdown = true;
            TOOLS.statusHandler(-1);

            bot.clearInterval(memory.bot.mute_check);
            bot.clearInterval(memory.bot.activity_check);

            log('Scheduled restart initialized. Calculating based on previous interaction...', 'warn');

            if (memory.bot.lastInt + 300000 > now.getTime()) {
                let remaining = memory.bot.lastInt+300000 - now.getTime();

                if (remaining < 60000) {
                    log('Restarting in 1 minute...', 'warn');
                    bot.setTimeout(() => {
                        TOOLS.shutdownHandler(10);
                    }, 60000);
                } else {
                    log(`Restarting in ${(remaining/(1000 * 60)).toFixed(1)} minutes...`, 'warn');
                    bot.setTimeout(() => {
                        TOOLS.shutdownHandler(10);
                    }, remaining);
                }
            } else {
                log('Restarting in 1 minute...', 'warn');
                bot.setTimeout(() => {
                    TOOLS.shutdownHandler(10);
                }, 60000);
            }
        }
    }
}, 1000);

memory.bot.profile_check = bot.setInterval(() => {
    if (!memory.bot.shutdown && !memory.bot.booting) {
        process.send({
            type: 'status',
            guild: null,
            channel: null,
            message: false,
        });
        log('begin profile_check', 'trace');
        memory.db.profiles.find({}, (err, docs) => {
            if (err) {
                TOOLS.errorHandler({ err: err });
            } else {
                log(`user profiles: ${docs.length}`, 'trace');
                let remove_list = [];
                for(let i in docs) {
                    log(`profile_check this: ${docs[i].member_id}`, 'trace');
                    if (Object.keys(docs[i]).length === 2) {
                        log('insignificant profile found', 'trace');
                        remove_list.push(docs[i].member_id);
                    }

                    bot.setTimeout(() => {
                        log(parseInt(i)+1 === docs.length, 'trace');
                        if (parseInt(i)+1 === docs.length) {
                            if (remove_list.length === 0) {
                                log(`All current users in database have some significant data.`, 'debug');
                            } else {
                                remove_loop();
                            }
                        }
                    }, 5000);
                }

                let i2 = 0;
                function remove_loop() {
                    log(`removing ${i2}`, 'trace');
                    memory.db.profiles.remove({ member_id: remove_list[i2] }, {multi:true}, (err) => {
                        if (err) {
                            TOOLS.errorHandler({ err: err });
                        } else {
                            log(`removed ${remove_list[i2]}`, 'trace');
                            if (i2+1 >= remove_list.length) {
                                log(`Removed ${remove_list.length} users from profiles database for containing no significant data.`);
                            } else {
                                i2++;
                                remove_loop();
                            }
                        }
                    })
                }
            }
        });
    }
}, 300000);

memory.bot.warn_check = bot.setInterval(() => {
    if (!memory.bot.shutdown && !memory.bot.booting) {
        process.send({
            type: 'status',
            guild: null,
            channel: null,
            message: false,
        });
        log('begin warn_check', 'trace');
        memory.db.profiles.find({ warnings: { $exists: true } }, (err, docs) => {
            if (err) {
                TOOLS.errorHandler({ err: err });
            } else 
            if (!docs[0]) {
                log('No users with warnings.', 'debug');
            } else {
                let i = 0;
                let expired_indexes = [];
                (function loopover() {
                    if (i >= docs.length) {
                        if (expired_indexes.length > 0) {
                            let i3 = 0;
                            (function loopUpdate() {
                                log(expired_indexes, 'trace');
                                log("expired:" + expired_indexes.length, 'trace');
                                log(`updating profile ${docs[expired_indexes[i3]].member_id}`, 'trace');
                                memory.db.profiles.update({member_id: docs[expired_indexes[i3]].member_id}, docs[expired_indexes[i3]], {}, (err) => {
                                    if(err) {
                                        TOOLS.errorHandler({ err: err });
                                    } else {
                                        if(i3+1 >= expired_indexes.length) {
                                            log(`${expired_indexes.length} user warning(s) have expired.`, 'info');
                                        } else {
                                            i3++;
                                            loopUpdate();
                                        }
                                    }
                                });
                            })();
                        } else {
                            log(`No user warnings have expired.`, 'debug');
                        }
                    } else
                    if (docs[i].warnings.length === 0) {
                        i++;
                        loopover();
                    } else {
                        for(let i2 in docs[i].warnings) {
                            if (new Date().getTime() > docs[i].warnings[i2].expiration) {
                                delete docs[i].warnings[i2];
                                expired_indexes.push(i);
                            }

                            if (parseInt(i2)+1 >= docs[i].warnings.length) {
                                i++;
                                loopover();
                            }
                        }
                    }
                })();
            }
        });
    }
}, 300000);

memory.bot.status_check = setInterval(() => {
    if(memory.bot.botStatus !== 0) {
        if(memory.bot.botStatusTime+(1000*60*2) < new Date().getTime()) {
            log(`OptiBot has maintained status ${memory.bot.botStatus} for too long. Attempting restart for good measure.`, 'warn');
            TOOLS.shutdownHandler(10);
        }
    }
}, 1000);

////////////////////////////////////////////////////////////////////////////////
// Event Handlers
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////
// Node.js Message Event
////////////////////////////////////////

process.on('message', (m) => {
    if(m.type && m.id) {
        memory.bot.dataPickup[m.id] = m;

        bot.setTimeout(() => {
            if(memory.bot.dataPickup[m.id]) {
                delete memory.bot.dataPickup[m.id]
            }
        }, 60000);
    } else
    if(m.crash) {
        log('got crash data', 'trace');
        if(m.crash.message) {
            let embed = new discord.RichEmbed()
            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_err.png'), "icon.png"))
            .setColor(cfg.vs.embed.error)
            .setAuthor('Something went REALLY wrong while doing that. Oops.', 'attachment://icon.png')
            .setDescription('It seems that OptiBot has recovered from a crash. If this continues, please contact <@181214529340833792>.')

            bot.guilds.get(m.crash.guild).channels.get(m.crash.channel).send({embed:embed}).then(() => {
                bot.guilds.get(m.crash.guild).fetchMember('181214529340833792').then(jack => {
                    jack.send(`**=== OptiBot Crash Recovery Report ===** \n\`\`\`${JSON.stringify(m.crash, null, 4)}\`\`\``, new discord.Attachment(`./logs/${m.crash.log}`));
                }).catch(err => {
                    TOOLS.errorHandler({ err: err });
                });
            }).catch(err => {
                TOOLS.errorHandler({ err: err });
            })
        }
    }
});

////////////////////////////////////////
// Bot Ready Event
////////////////////////////////////////

bot.on('ready', () => {
    if(memory.bot.booting) {
        let status_check = () => {
            if(bot.status !== memory.bot.botStatus) {
                let translate = function (num) {
                    if(num === null) {
                        return 'BOOT';
                    } else
                    if(num === 0) {
                        return 'READY';
                    } else
                    if(num === 1) {
                        return 'CONNECTING';
                    } else
                    if(num === 2) {
                        return 'RECONNECTING';
                    } else
                    if(num === 3) {
                        return 'IDLE';
                    } else
                    if(num === 4) {
                        return 'NEARLY';
                    } else
                    if(num === 5) {
                        return 'DISCONNECTED';
                    } else {
                        return 'UNKNOWN';
                    }
                }
        
                log(`Client state changed: ${translate(memory.bot.botStatus)} => ${translate(bot.status)}`, 'warn')
                memory.bot.botStatus = bot.status;
            }
        }
        memory.bot.status_check = bot.setInterval(status_check, 100);
        status_check();
    
        let bootTimeStart = new Date();
        let stages = []
        let stagesAsync = [];
    
        // ASYNC STAGES
    
        stagesAsync.push({
            name: "Audit Log Initial Cache",
            fn: function(cb) {
                try {
                    bot.guilds.get(cfg.basic.of_server).fetchAuditLogs({ limit: 10, type: 'MESSAGE_DELETE' }).then((audit) => {
                        try {
                            memory.bot.log = [...audit.entries.values()];
            
                            cb();
                        }
                        catch (err) {
                            log(err.stack, 'fatal')
                            TOOLS.shutdownHandler(24);
                        }
                    });
                }
                catch (err) {
                    log(err.stack, 'fatal')
                    TOOLS.shutdownHandler(24);
                }
            }
        })
    
        stagesAsync.push({
            name: "Deletable Message Loader",
            fn: function(cb) {
                try {
                    memory.db.msg.find({}, (err, docs) => {
                        try {
                            if (err) {
                                throw err
                            } else {
                                let i = 0;
                                let needsRemoval = [];
                
                                (function fetchNext() {
                                    try {
                                        log('fetchNext '+i, 'trace');
                                        if (i === docs.length) {
                                            cb();
    
                                            if(needsRemoval.length > 0) {
                                                let ir = 0;
                                                let failed = 0;
                                                (function removeNext() {
                                                    memory.db.msg.remove({message: needsRemoval[ir]}, {}, (err) => {
                                                        if(err) {
                                                            TOOLS.errorHandler({ err: err });
                                                            failed++;
                                                        }
    
                                                        if(ir+1 >= needsRemoval.length) {
                                                            log(`Successfully removed ${needsRemoval.length-failed}/${needsRemoval.length} messages from cache.`);
                                                        } else {
                                                            ir++
                                                            removeNext();
                                                        }
                                                    });
                                                })();
                                            }
                                        } else {
                                            bot.guilds.get(docs[i].guild).channels.get(docs[i].channel).fetchMessage(docs[i].message).then(m => {
                                                try {
                                                    log('got msg', 'trace');
                                                    if (m.deleted) {
                                                        needsRemoval.push(docs[i].message);
                                                        i++
                                                        fetchNext();
                                                    } else {
                                                        log('not deleted', 'trace');
                                                        let reaction = m.reactions.get('click_to_delete:642085525460877334');
                                                        if (!reaction) {
                                                            log('reaction not added fsr', 'trace');
                                                            m.react(bot.guilds.get(cfg.basic.ob_server).emojis.get('642085525460877334')).catch(err => {
                                                                TOOLS.errorHandler({ err: err });
                                                            });
                        
                                                            i++
                                                            fetchNext();
                                                        } else {
                                                            log('get users', 'trace');
                                                            reaction.fetchUsers().then(u => {
                                                                try {
                                                                    if (u.has(docs[i].user)) {
                                                                        m.delete().then(() => {
                                                                            needsRemoval.push(docs[i].message);
                                                                            i++
                                                                            fetchNext();
                                                                        }).catch(err => {
                                                                            TOOLS.errorHandler({ err: err });
                                                                            i++
                                                                            fetchNext();
                                                                        });
                                                                    } else {
                                                                        i++
                                                                        fetchNext();
                                                                    }
                                                                }
                                                                catch (err) {
                                                                    log(err.stack, 'fatal')
                                                                    TOOLS.shutdownHandler(24);
                                                                }
                                                            }).catch(err => {
                                                                TOOLS.errorHandler({ err: err });
                                                                i++
                                                                fetchNext();
                                                            });
                                                        }
                                                    }
                                                }
                                                catch (err) {
                                                    log(err.stack, 'fatal')
                                                    TOOLS.shutdownHandler(24);
                                                }
                                            }).catch(err => {
                                                if(err.stack.toLowerCase().indexOf('unknown message') > -1) {
                                                    needsRemoval.push(docs[i].message);
                                                    i++
                                                    fetchNext();
                                                } else {
                                                    log('Failed to load cached message: ' + err.stack, 'error');
                                                    i++
                                                    fetchNext();
                                                }
                                            });
                                        }
                                    }
                                    catch (err) {
                                        log(err.stack, 'fatal')
                                        TOOLS.shutdownHandler(24);
                                    }
                                })();
                            }
                        }
                        catch (err) {
                            log(err.stack, 'fatal')
                            TOOLS.shutdownHandler(24);
                        }
                    });
                }
                catch (err) {
                    log(err.stack, 'fatal')
                    TOOLS.shutdownHandler(24);
                }
            }
        });
    
        stagesAsync.push({
            name: "Command Sorter",
            fn: function(cb) {
                try {
                    CMD.sort();
                    cb();
                }
                catch (err) {
                    log(err.stack, 'fatal')
                    TOOLS.shutdownHandler(24);
                }
            }
        });
    
        // SYNC STAGES
    
        stages.push({
            name: "Icon/Image Loader",
            fn: function(cb) {
                try {
                    fs.readdir('./icons', (err, files) => {
                        try {
                            if (err) {
                                throw err
                            } else {
                                let i = 0;
                                (function loadNext() {
                                    if (i === files.length) {
                                        s2();
                                    } else {
                                        fs.readFile('./icons/' + files[i], (err, data) => {
                                            if (err) {
                                                if (err.code !== 'EISDIR') {
                                                    TOOLS.errorHandler({ err: 'Failed to load icon file: ' + err.stack });
                                                };
        
                                                i++;
                                                loadNext();
                                            } else {
                                                if (!files[i].startsWith('.')) {
                                                    memory.bot.icons.add(data, files[i]);
                                                }
        
                                                i++;
                                                loadNext();
                                            }
                                        });
                                    }
                                })();
                            }
                        }
                        catch (err) {
                            log(err.stack, 'fatal')
                            TOOLS.shutdownHandler(24);
                        }
                    });
                }
                catch (err) {
                    log(err.stack, 'fatal')
                    TOOLS.shutdownHandler(24);
                }
        
                function s2() {
                    try {
                        fs.readdir('./images', (err, files) => {
                            try {
                                if (err) {
                                    throw err
                                } else {
                                    let i = 0;
                                    (function loadNext() {
                                        try {
                                            if (i === files.length) {
                                                // STAGE 1 FINISHED
                                                cb();
                                            } else {
                                                fs.readFile('./images/' + files[i], (err, data) => {
                                                    if (err) {
                                                        if (err.code !== 'EISDIR') {
                                                            TOOLS.errorHandler({ err: 'Failed to load image file: ' + err.stack });
                                                        };
            
                                                        i++;
                                                        loadNext();
                                                    } else {
                                                        if (!files[i].startsWith('.')) {
                                                            memory.bot.images.add(data, files[i]);
                                                        }
            
                                                        i++;
                                                        loadNext();
                                                    }
                                                });
                                            }
                                        }
                                        catch (err) {
                                            log(err.stack, 'fatal')
                                            TOOLS.shutdownHandler(24);
                                        }
                                    })();
                                }
                            }
                            catch (err) {
                                log(err.stack, 'fatal')
                                TOOLS.shutdownHandler(24);
                            }
                        });
                    }
                    catch (err) {
                        log(err.stack, 'fatal')
                        TOOLS.shutdownHandler(24);
                    }
                }
            }
        });
    
        stages.push({
            name: "GitHub Documentation Loader",
            fn: function(cb) {
                try {
                    request({ url: 'https://api.github.com/repos/sp614x/optifine/contents/OptiFineDoc/doc?ref=master&access_token=' + keys.github, headers: { 'User-Agent': 'optibot' } }, (err, res, body) => {
                        try {
                            if (err || !res || !body) {
                                throw (err || new Error('Failed to get a response from the GitHub API. (boot stage 2, subop 1)'))
                            } else {
                                let result = JSON.parse(body);
            
                                if (result.message) {
                                    TOOLS.errorHandler({ err: new Error('GitHub API rate limit exceeded: ' + result.message) });
                                    return;
                                }
            
                                memory.bot.docs = result.filter(e => { if (e.type !== 'dir') return true });;
            
                                s2();
                            }
                        }
                        catch (err) {
                            log(err.stack, 'fatal')
                            TOOLS.shutdownHandler(24);
                        }
                    });
                }
                catch (err) {
                    log(err.stack, 'fatal')
                    TOOLS.shutdownHandler(24);
                }
        
                function s2() {
                    try {
                        request({ url: 'https://api.github.com/repos/sp614x/optifine/contents/OptiFineDoc/doc/images?ref=master&access_token=' + keys.github, headers: { 'User-Agent': 'optibot' } }, (err, res, body) => {
                            try {
                                if (err || !res || !body) {
                                    throw (err || new Error('Failed to get a response from the GitHub API. (boot stage 2, subop 2)'))
                                } else {
                                    let result = JSON.parse(body);
        
                                    if (result.message) {
                                        TOOLS.errorHandler({ err: new Error('GitHub API rate limit exceeded: ' + result.message) });
                                        return;
                                    }
        
                                    for (let i = 0; i < result.length; i++) {
                                        memory.bot.docs.push(result[i]);
        
                                        if (i + 1 === result.length) {
                                            // STAGE 2 FINISHED
                                            cb();
                                        }
                                    }
                                }
                            }
                            catch (err) {
                                log(err.stack, 'fatal')
                                TOOLS.shutdownHandler(24);
                            }
                        });
                    }
                    catch (err) {
                        log(err.stack, 'fatal')
                        TOOLS.shutdownHandler(24);
                    }
                }
            }
        });
    
        stages.push({
            name: "StopModReposts Database Loader",
            fn: function(cb) {
                try {
                    request({ url: "https://api.varden.info/smr/sitelist.php?format=json", headers: { 'User-Agent': 'optibot' } }, (err, res, body) => {
                        try {
                            if (err || !res || !body) {
                                throw (err || new Error('Failed to get a response from the StopModReposts API.'))
                            } else {
                                let sitelist = JSON.parse(body);
                                let smr_data = [];
        
                                memory.db.smr.find({}, (err, docs) => {
                                    try {
                                        if (err) {
                                            throw err
                                        } else
                                        if (!docs[0]) {
                                            getSMRSites();
                                        } else {
                                            for(let i2 in docs) {
                                                smr_data.push(docs[i2].url);
            
                                                if (parseInt(i2)+1 === docs.length) {
                                                    getSMRSites();
                                                }
                                            }
                                        }
                                    }
                                    catch (err) {
                                        log(err.stack, 'fatal')
                                        TOOLS.shutdownHandler(24);
                                    }
                                });
        
                                function getSMRSites() {
                                    log('getSMRSite()', 'trace');
                                    try {
                                        for(let i=0; i<sitelist.length; i++) {
                                            if(sitelist[i].path !== "\/") {
                                                smr_data.push(sitelist[i].domain + (JSON.parse(`["${sitelist[i].path}"]`)[0]));
                                            } else {
                                                smr_data.push(sitelist[i].domain);
                                            }
                
                                            if(i+1 >= sitelist.length) {
                                                memory.bot.smr = smr_data;
                    
                                                cb();
                                            }
                                        }
                                    }
                                    catch (err) {
                                        log(err.stack, 'fatal')
                                        TOOLS.shutdownHandler(24);
                                    }
                                }
                            }
                        }
                        catch (err) {
                            log(err.stack, 'fatal')
                            TOOLS.shutdownHandler(24);
                        }
                    });
                }
                catch (err) {
                    log(err.stack, 'fatal')
                    TOOLS.shutdownHandler(24);
                }
            }
        });
    
        stages.push({
            name: "Server List Parser",
            fn: function(cb) {
                try {
                    let i = 0;
                    (function parseItemLoop() {
                        try {
                            let item = serverlist[i];
        
                            memory.bot.servers[[item.name.toLowerCase()]] = item.link;
                            item.aliases.forEach(e => {
                                memory.bot.servers[[e.toLowerCase()]] = item.link;
                            });
        
                            if (i+1 === serverlist.length) {
                                cb();
                            } else {
                                i++;
                                parseItemLoop();
                            }
                        }
                        catch (err) {
                            log(err.stack, 'fatal')
                            TOOLS.shutdownHandler(24);
                        }
                    })();
                }
                catch (err) {
                    log(err.stack, 'fatal')
                    TOOLS.shutdownHandler(24);
                }
            }
        });
    
        stages.push({
            name: "Bot Avatar Composite",
            fn: function(cb) {
                try {
                    let p0 = jimp.read(bot.user.avatarURL);
                    let p1 = jimp.read(memory.bot.icons.get('optifine_thumbnail_mask.png'));
        
                    Promise.all([p0, p1]).then((imgs) => {
                        try {
                            imgs[0].resize(512, 512, jimp.RESIZE_BILINEAR)
                            .mask(imgs[1], 0, 0)
                            .getBuffer(jimp.AUTO, (err, buffer) => {
                                try {
                                    if (err) throw err
                                    else {
                                        memory.bot.avatar = buffer;
        
                                        cb();
                                    }
                                }
                                catch (err) {
                                    log(err.stack, 'fatal')
                                    TOOLS.shutdownHandler(24);
                                }
                            });
                        }
                        catch (err) {
                            log(err.stack, 'fatal')
                            TOOLS.shutdownHandler(24);
                        }
                    });
                }
                catch (err) {
                    log(err.stack, 'fatal')
                    TOOLS.shutdownHandler(24);
                }
            }
        });
    
        stages.push({
            name: "MOTD Generator",
            fn: function(cb) {
                try {
                    memory.db.motd.find({ motd: true }, (err, docs) => {
                        try {
                            if (err) {
                                throw err
                            } else {
                                let embed = new discord.RichEmbed()
                                    .setColor(cfg.vs.embed.default)
                                    .attachFile(new discord.Attachment(memory.bot.icons.get('opti_fine.png'), "icon.png"))
                                    .setAuthor('Welcome to the official OptiFine Discord server!', 'attachment://icon.png')
                                    .setDescription(`Please be sure to read the <#479192475727167488> BEFORE posting, not to mention the <#531622141393764352>. If you're a donator, use the command \`${memory.bot.trigger}help dr\` for instructions to get your donator role.`)
                                    .setFooter('Thank you for reading!')
                                
                                if (docs[0] && docs[0].message.length > 0) {
                                    embed.addField(`A message from Moderators (Posted on ${docs[0].date.toUTCString()})`, docs[0].message);
                                }
                
                                memory.bot.motd = embed;
                
                                cb();
                            }
                        }
                        catch (err) {
                            log(err.stack, 'fatal')
                            TOOLS.shutdownHandler(24);
                        }
                    });
                }
                catch (err) {
                    log(err.stack, 'fatal')
                    TOOLS.shutdownHandler(24);
                }
            }
        });
    
        stages.push({
            name: "Categorized Documentation Loader",
            fn: function(cb) {
                try {
                    let i = 0;
                    (function parseItemLoop() {
                        try {
                            let item = docs_list[i];
        
                            let data = {
                                name: item.name,
                                links: item.links
                            }
        
                            memory.bot.docs_cat[[item.name.toLowerCase()]] = data;
                            item.aliases.forEach(e => {
                                memory.bot.docs_cat[[e.toLowerCase()]] = data;
                            });
        
                            if (i+1 === docs_list.length) {
                                cb();
                            } else {
                                i++;
                                parseItemLoop();
                            }
                        }
                        catch (err) {
                            log(err.stack, 'fatal')
                            TOOLS.shutdownHandler(24);
                        }
                    })();
                }
                catch (err) {
                    log(err.stack, 'fatal')
                    TOOLS.shutdownHandler(24);
                }
            }
        });
    
        stages.push({
            name: "Statistics Data Bootstrapper",
            fn: function(cb) {
                try {
                    // need to reset this at the beginning of every month
                    // also need to archive results of the entire month BEFORE resetting.
        
                    let data = {
                        day: new Date().getDate(),
                        users: {
                            join: 0,
                            leave: 0,
                            bans: 0,
                            kicks: 0,
                            mutes: 0,
                            unique: 0
                        },
                        messages: 0,
                        dms: 0,
                        commands: 0
                    }
        
                    memory.db.stats.find({ day: data.day }, (err, docs) => {
                        try {
                            if (err) throw err
                            else if (docs.length === 0) {
                                memory.db.stats.insert(data, (err) => {
                                    if (err) throw err
                                    else finishStage()
                                })
                            } else {
                                finishStage();
                            }
                        }
                        catch (err) {
                            log(err.stack, 'fatal')
                            TOOLS.shutdownHandler(24);
                        }
                    });
        
                    function finishStage() {
                        try {
                            cb();
                        }
                        catch (err) {
                            log(err.stack, 'fatal')
                            TOOLS.shutdownHandler(24);
                        }
                    }
                }
                catch (err) {
                    log(err.stack, 'fatal')
                    TOOLS.shutdownHandler(24);
                }
            }
        });
    
        stages.push({
            name: "Moderator Presence Loader",
            fn: function(cb) {
                try {
                    bot.guilds.get(cfg.basic.of_server).roles.get(cfg.roles.moderator).members.tap(mod => {
                        if(mod.id !== '202558206495555585') {
                            memory.bot.actMods.push({
                                id: mod.id,
                                status: mod.presence.status,
                                last_message: (mod.lastMessage) ? mod.lastMessage.createdTimestamp : 0
                            });
                        }
                    });
    
                    bot.guilds.get(cfg.basic.of_server).roles.get(cfg.roles.junior_mod).members.tap(mod => {
                        memory.bot.actMods.push({
                            id: mod.id,
                            status: mod.presence.status,
                            last_message: (mod.lastMessage) ? mod.lastMessage.createdTimestamp : 0
                        });
                    });
        
                    cb();
                }
                catch (err) {
                    log(err.stack, 'fatal')
                    TOOLS.shutdownHandler(24);
                }
            }
        });
    
        stagesAsync.forEach((stage, index) => {
            log(`Initialization: ASYNC Boot Stage ${index+1}/${stagesAsync.length}`);
            let timeStart = new Date();
            stage.fn(() => {
                let timeEnd = new Date();
                let timeTaken = (timeEnd.getTime() - timeStart.getTime()) / 1000;
                log(`Executed ASYNC module "${stage.name}" in ${timeTaken} second(s).`);
            });
        });
    
        let si = 0;
        (function bootProgress() {
            log(`Initialization: Boot Stage ${si+1}/${stages.length}`);
            let timeStart = new Date();
            stages[si].fn(() => {
                let timeEnd = new Date();
                let timeTaken = (timeEnd.getTime() - timeStart.getTime()) / 1000;
                log(`Executed module "${stages[si].name}" in ${timeTaken} second(s).`);
    
                if(si+1 === stages.length) {
                    log('All stages passed successfully.')
                    finalReady();
                } else {
                    si++
                    bootProgress();
                }
            });
        })();
    
        function finalReady() {
            try {
                if (memory.bot.debug) memory.bot.locked = true;
                memory.bot.booting = false;
                TOOLS.statusHandler(1);
                let width = 64; //inner width of box
                let bootTimeEnd = new Date();
                let bootTimeTaken = (bootTimeEnd.getTime() - bootTimeStart.getTime()) / 1000;
    
                function centerText(text, totalWidth) {
                    try {
                        let leftMargin = Math.floor((totalWidth - (text.length)) / 2);
                        let rightMargin = Math.ceil((totalWidth - (text.length)) / 2);
    
                        return '│' + (' '.repeat(leftMargin)) + text + (' '.repeat(rightMargin)) + '│';
                    }
                    catch (err) {
                        log(err.stack, 'fatal')
                        TOOLS.shutdownHandler(24);
                    }
                }
    
                log(`╭${'─'.repeat(width)}╮`); 
                log(centerText(`  `, width));
                log(centerText(`OptiBot ${pkg.version} (Build ${build.num})`, width));
                log(centerText(`(c) Kyle Edwards <wingedasterisk@gmail.com>, 2019`, width));
                log(centerText(`Successfully booted in ${bootTimeTaken} seconds.`, width));
                log(centerText(`  `, width));
                log(centerText(TOOLS.randomizer(cfg.splash), width));
                log(centerText(`  `, width));
                log(`╰${'─'.repeat(width)}╯`);
    
                process.title = `OptiBot ${pkg.version}-${build.num}`;
    
                memory.bot.title_check = bot.setInterval(() => {
                    if (!memory.bot.shutdown) {
                        let translate = function (num) {
                            if(num === null) {
                                return 'BOOT';
                            } else
                            if(num === 0) {
                                return 'READY';
                            } else
                            if(num === 1) {
                                return 'CONNECTING';
                            } else
                            if(num === 2) {
                                return 'RECONNECTING';
                            } else
                            if(num === 3) {
                                return 'IDLE';
                            } else
                            if(num === 4) {
                                return 'NEARLY';
                            } else
                            if(num === 5) {
                                return 'DISCONNECTED';
                            } else {
                                return 'UNKNOWN'
                            }
                        }

                        process.title = `OptiBot ${pkg.version}-${build.num} | ${translate(bot.status)} (${Math.round(bot.ping)}ms)`;
                    }
                }, 1000);
    
                process.send({type: 'ready'});
            }
            catch (err) {
                log(err.stack, 'fatal')
                TOOLS.shutdownHandler(24);
            }
        }
    }
});

////////////////////////////////////////
// Guild Presence Update
////////////////////////////////////////

bot.on('presenceUpdate', (oldMem, newMem) => {
    if (oldMem.guild.id !== cfg.basic.of_server) return;
    if (oldMem.id === bot.user.id) return;

    memory.bot.actMods.forEach((mod, i) => {
        if(mod.id === oldMem.id) {
            log('moderator updated', 'trace');
            log('OLD', 'trace')
            log(mod, 'trace')

            let newData = {
                id: mod.id,
                status: newMem.presence.status,
                last_message: (newMem.lastMessage) ? newMem.lastMessage.createdTimestamp : mod.last_message
            }

            log('NEW', 'trace')
            log(newData, 'trace')

            memory.bot.actMods[i] = newData;
        }
    });
});

////////////////////////////////////////
// Raw Packet Data
////////////////////////////////////////

bot.on('raw', packet => {
    if(packet.t === 'MESSAGE_REACTION_ADD') {
        let channel = bot.channels.get(packet.d.channel_id);
        if (channel.messages.has(packet.d.message_id)) return;
        channel.fetchMessage(packet.d.message_id).then(m => {
            let emoji = packet.d.emoji.id ? `${packet.d.emoji.name}:${packet.d.emoji.id}` : packet.d.emoji.name;
            let reaction = m.reactions.get(emoji);

            if (reaction) {
                reaction.users.set(packet.d.user_id, bot.users.get(packet.d.user_id));
            }

            log('old emoji detected', 'trace');
            bot.emit('messageReactionAdd', reaction, bot.users.get(packet.d.user_id));
        });
    }
});

////////////////////////////////////////
// Message Reaction Add
////////////////////////////////////////

bot.on('messageReactionAdd', (mr, user) => {
    if (mr.message.channel.type === 'dm') return;
    if (user.id === bot.user.id) return;

    if (mr.emoji.name === '🏅') {
        if (mr.message.guild.id !== cfg.basic.of_server) return;
        if (mr.message.author.id === bot.user.id) return;
        bot.guilds.get(cfg.basic.of_server).fetchMember(user.id).then((member) => {
            if (!member.permissions.has("KICK_MEMBERS", true)) {
                log('emoji detected', 'trace');
    
                TOOLS.getProfile(mr.message, mr.message.author.id, (profile) => {
                    if (profile.medals) {
                        profile.medals.count++;
                        profile.medals.msgs.push(mr.message.id);
                    } else {
                        profile.medals = {
                            count: 1,
                            msgs: [
                                mr.message.id
                            ]
                        }
                    }
    
                    memory.db.profiles.update({member_id: mr.message.author.id}, profile, (err) => {
                        if (err) TOOLS.errorHandler({ err: err, m: mr.message });
                        else {
                            log(`${mr.message.author.username}#${mr.message.author.discriminator} was awarded a medal by ${user.username}#${user.discriminator}`);
    
                            let embed = new discord.RichEmbed()
                            .setColor(cfg.vs.embed.default)
                            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_medal.png'), "icon.png"))
                            .setAuthor('Medal awarded', 'attachment://icon.png')
                            .setDescription(`${mr.message.author} was awarded a medal by ${user}!`);
    
                            mr.message.channel.send({ embed: embed }).then(msg => {
                                TOOLS.messageFinalize(user.id, msg);
                            });
                        }
                    });
                });
            }
        });
    } else 
    if (mr.emoji.id === '642085525460877334') {
        memory.db.msg.find({message: mr.message.id}, (err, docs) => {
            if(err) {
                TOOLS.errorHandler({ err: err });
            } else
            if(docs.length > 0) {
                if(docs[0].user === user.id) {
                    mr.message.delete().then(() => {
                        memory.db.msg.remove(docs[0], {}, (err) => {
                            if (err) {
                                TOOLS.errorHandler({ err: err });
                            } else {
                                log('Bot message deleted at user request.');
                            }
                        });
                    }).catch(err => {
                        TOOLS.errorHandler({ err: err });
                    });
                }
            }
        });
    }
});

////////////////////////////////////////
// Message Deletion Events
////////////////////////////////////////

bot.on('messageDelete', m => {
    if (m.channel.type === 'dm') return;
    if (m.guild.id !== cfg.basic.of_server) return;
    if (m.author.system || m.author.bot) return;
    if (memory.bot.shutdown) return;
    if (memory.bot.booting) return;
    if (m.content.toLowerCase().startsWith(`${memory.bot.trigger}dr`)) return;

    log('messageDelete event', 'trace')

    let now = new Date();

    let msg1 = `Recorded message deletion at ${now}.`;
    let msg2 = "\nDeleted by author.";
    let msg3 = `\nPosted by ${m.author.username}#${m.author.discriminator} `;
    let msg4 = `in #${m.channel.name} on ${m.createdAt} \nMessage Contents: \n"${m.content}"`;

    bot.setTimeout(() => {
        log('begin calculation of executor', 'trace')
        bot.guilds.get(cfg.basic.of_server).fetchAuditLogs({ limit: 10, type: 'MESSAGE_DELETE' }).then((audit) => {

            let ad = [...audit.entries.values()];
            let discord_log;
            let cached_log;
            let entryFound = false;
            let newEntry = false;

            for(let i=0; i<ad.length; i++) {
                if (ad[i].target.id === m.author.id) {
                    discord_log = ad[i];
                    c1();
                    break;
                } else
                if (i+1 === ad.length) {
                    finalLog();
                }
            }

            function c1() {
                /*for(let i=0; i<memory.bot.log.length; i++) {
                    if (!discord_log) {
                        break;
                    } else
                    if (memory.bot.log[i].id === discord_log.id) {
                        break;
                    } else
                    if (i+1 === memory.bot.log.length) {
                        log('entry does not exist in cache, must be new.', 'trace');
                    }
                }*/

                for(let i=0; i<memory.bot.log.length; i++) {
                    if (memory.bot.log[i].target.id === m.author.id && !cached_log) {
                        cached_log = memory.bot.log[i];
                    }

                    if (memory.bot.log[i].id === discord_log.id) {
                        entryFound = true;
                    }
                    
                    if (i+1 === memory.bot.log.length) {
                        if (!cached_log) {
                            finalLog();
                            return;
                        }

                        if (!entryFound) {
                            log('entry does not exist in cache, must be new.', 'trace');
                            newEntry = true;  
                        }

                        c2();
                    }
                }

                function c2() {
                    if (discord_log.id === cached_log.id) {
                        log('same ID', 'trace')
                    } else {
                        log('NOT same ID', 'trace');
                    }

                    log('cached count: '+cached_log.extra.count,'trace');
                    log('discord count: '+discord_log.extra.count,'trace');

                    if ((cached_log.extra.count < discord_log.extra.count) || newEntry) {
                        log('Deleted by admin', 'trace');
                        msg2 = `\nDeleted by ${discord_log.executor.username}#${discord_log.executor.discriminator}.`
                        finalLog();
                    } else {
                        log('Deleted by author', 'trace');
                        finalLog();
                    }
                }
            }

            function finalLog() {
                try {
                    if (m.member.nickname) msg3 += `(aka "${m.member.nickname}") `;
                }
                catch (err) {
                    try {
                        log(typeof m.member, 'warn');
                    } catch (err2) {
                        log(err.stack, 'error');
                        log(err2.stack, 'error');
                    }
                }

                if (m.attachments.size > 0) {
                    msg4 += '\n\nMessage Attachments: '
                    m.attachments.tap(at => {
                        msg4 += "\n" + at.url
                    });
                }

                let finalLog = msg1 + msg2 + msg3 + msg4;

                let calcEnd = new Date();
                log(finalLog, 'warn');
                memory.bot.log = [...audit.entries.values()];

                
                let timeTaken = (calcEnd.getTime() - now.getTime()) / 1000;
                log(`Successfully determined executor in ${timeTaken} seconds.`, 'debug');
            }
        }).catch(err => log(err.stack, 'error'));
    }, 1000);
});

bot.on('messageDeleteBulk', m => {
    log(`${m.size} messages were deleted. This may have been the result of a ban.`, 'warn');
    let messages = [];
    m.forEach((e) => {
        let m1 = `Message Author: ${e.author.username}#${e.author.discriminator} (${e.author.id})`;
        let m2 = ``;
        let m3 = ``;

        if(e.content.length > 0) {
            m2 = `Message Contents: ${e.content}`;
        }

        if(e.attachments.size > 0) {
            m3 = `Message Attachments: `;
            e.attachments.forEach((at) => {
                m3 += '\n'+at.url;
            });
        }

        messages.push(`${m1}\n${m2}\n${m3}`);
    });

    bot.setTimeout(() => {
        messages.forEach((msg) => {
            log(msg);
        });
    }, 1000);
});

////////////////////////////////////////
// Message Edited Event
////////////////////////////////////////

bot.on('messageUpdate', (m, mNew) => {
    if (m.channel.type === 'dm') return;
    if (mNew.guild.id !== cfg.basic.of_server) return;
    if (m.author.system || m.author.bot) return;
    if (memory.bot.shutdown) return;
    if (memory.bot.booting) return;
    if (m.content.trim().toLowerCase() == mNew.content.trim().toLowerCase()) return;
    if (m.content.toLowerCase().startsWith(`${memory.bot.trigger}dr`)) return;

    let msg1 = `Recorded message edit at ${new Date()}`;
    let msg2 = `\nPosted by ${m.author.username}#${m.author.discriminator} `;
    let msg3 = `in #${m.channel.name} on ${m.createdAt} \nOriginal Message Contents: \n"${m.content}"`;
    let msg4 = `\n\nNew Message Contents: \n"${mNew.content}"`;

    try {
        if (mNew.member.nickname) msg2 += `(aka "${mNew.member.nickname}") `;
    }
    catch (err) {
        try {
            log(typeof mNew.member, 'warn');
        } catch (err2) {
            log(err.stack, 'error');
            log(err2.stack, 'error');
        }
    }

    let finalLog = msg1 + msg2 + msg3 + msg4;
    log(finalLog);
});

////////////////////////////////////////
// User joined
////////////////////////////////////////

bot.on('guildMemberAdd', member => {
    if (member.guild.id !== cfg.basic.of_server) return;
    if (memory.bot.shutdown) return;
    if (memory.bot.booting) return;

    memory.db.stats.update({day: new Date().getDate()}, { $inc: { "users.join": 1 } }, (err) => {
        if (err) TOOLS.errorHandler({err:err});
    });

    let user = member.user.username + '#' + member.user.discriminator;

    log('User has joined the server: ' + user + ' (' + member.user.id + ')');

    memory.bot.newUsers.push(member.user.id);
    bot.setTimeout(function () {
        let index = memory.bot.newUsers.indexOf(member.user.id);
        log(memory.bot.newUsers);
        log('looking for: '+index)
        if (index > -1) memory.bot.newUsers.splice(index, 1);

        if (!member.deleted && member.roles.size === 0) {
            log('10 Minute wait has expired for new user ' + user + ' (' + member.user.id + ')');
        }
    }, 600000);

    if (memory.bot.debug && cfg.superusers.indexOf(member.user.id) === -1) return;

    member.send({ embed: memory.bot.motd }).catch((err) => {
        if (err.code === 50007) {
            log('Could not send MOTD to new member ' + user + ' (User has server DMs disabled)', 'warn');
        } else {
            log('Could not send MOTD to new member ' + user + ': ' + err.stack, 'error');
        }
    });

    if (memory.bot.debug) return;

    memory.db.profiles.find({ member_id: member.user.id }, (err, res) => {
        if (err) TOOLS.errorHandler({ err: err });
        else if (res.length > 0 && res[0].mute) {
            log(`User ${user} attempted to circumvent mute.`, 'warn');
            bot.guilds.get(cfg.basic.of_server).fetchMember(res[0].mute.executor).then(executor => {
                member.addRole(cfg.roles.muted, `User left and rejoined. Reinstated mute issued by ${executor.user.username}#${executor.user.discriminator}.`).then(() => {
                    if (typeof res[0].mute.end === 'number') {
                        res[0].mute.end += 3600000;
    
                        memory.db.profiles.update({ member_id: member.user.id }, res[0], (err) => {
                            if (err) TOOLS.errorHandler({ err: err });
                            else {
                                log(`Mute for user ${user} has been extended by one hour.`, 'warn');
                            }
                        });
                    }
                }).catch(err => TOOLS.errorHandler({ err: err }));
            }).catch(err => TOOLS.errorHandler({ err: err }));
        }
    });
});

////////////////////////////////////////
// User was banned
////////////////////////////////////////

bot.on('guildBanAdd', (guild, member) => {
    if (guild.id !== cfg.basic.of_server) return;
    if (memory.bot.shutdown) return;
    if (memory.bot.booting) return;

    memory.db.stats.update({day: new Date().getDate()}, { $inc: { "users.bans": 1 } }, (err) => {
        if (err) TOOLS.errorHandler({err:err});
    });

    bot.setTimeout(() => {
        bot.guilds.get(cfg.basic.of_server).fetchAuditLogs({ limit: 1 }).then((audit) => {
            let ad = audit.entries.first();
            if (ad.action === 'MEMBER_BAN_ADD' && ad.target.id === member.id && ad.createdTimestamp + 3000 > new Date().getTime()) {
                let msg = `User ${member.username}#${member.discriminator} (${member.id}) was banned by ${ad.executor.username}#${ad.executor.discriminator}`;

                if (ad.reason) msg += '\nReason: ' + ad.reason;

                log(msg, 'warn');
            } else {
                log(`User ${member.username}#${member.discriminator} (${member.id}) was banned from the server.`, 'warn');
                log('Could not determine ban executor.', 'warn');
            }
        }).catch(err => log(err.stack, 'error'));
    }, 500);
});

////////////////////////////////////////
// User left/was kicked
////////////////////////////////////////

bot.on('guildMemberRemove', member => {
    if (member.guild.id !== cfg.basic.of_server) return;
    if (memory.bot.shutdown) return;
    if (memory.bot.booting) return;
    bot.setTimeout(() => {
        bot.guilds.get(cfg.basic.of_server).fetchAuditLogs({ limit: 1 }).then((audit) => {
            let ad = audit.entries.first();
            if (ad.action === 'MEMBER_KICK' && ad.target.id === member.user.id && ad.createdTimestamp + 3000 > new Date().getTime()) {
                let msg = 'User ' + member.user.username + '#' + member.user.discriminator + ' (' + member.user.id + ') was kicked by ' + ad.executor.username + '#' + ad.executor.discriminator;

                if (ad.reason) msg += '\nReason: ' + ad.reason;

                memory.db.stats.update({day: new Date().getDate()}, { $inc: { "users.kicks": 1 } }, (err) => {
                    if (err) TOOLS.errorHandler({err:err});
                });

                log(msg, 'warn');
            } else
                if (ad.action === 'MEMBER_BAN_ADD' && ad.target.id === member.user.id && ad.createdTimestamp + 3000 > new Date().getTime()) {
                    return;
                } else {
                    memory.db.stats.update({day: new Date().getDate()}, { $inc: { "users.leave": 1 } }, (err) => {
                        if (err) TOOLS.errorHandler({err:err});
                    });

                    log('User has left the server: ' + member.user.username + '#' + member.user.discriminator + ' (' + member.user.id + ')', 'warn');
                }
        }).catch(err => log(err.stack, 'error'));
    }, 500);
});

////////////////////////////////////////
// Guild Unavailable
////////////////////////////////////////

bot.on('guildUnavailable', guild => {
    if (guild.id === cfg.basic.of_server) {
        log('Unable to connect to the OptiFine server. Perhaps there\'s an outage?', 'warn');
    }
});

////////////////////////////////////////
// Ratelimit Event
////////////////////////////////////////

bot.on('ratelimit', rl => {
    let rlInfo = "Request Limit: " + rl.requestLimit + "\n"
        + "Time Difference: " + rl.timeDifference + "\n"
        + "HTTP Method: " + rl.method + "\n"
        + "Path: " + rl.path + "\n"
    log("Bot is being ratelimited! \n" + rlInfo, 'warn');
});

////////////////////////////////////////
// Websocket Disconnect Event
////////////////////////////////////////

bot.on('disconnect', event => {
    if (event.code === 1000) {
        log("Disconnected from websocket. (Task Complete)", 'warn');
    } else {
        log("Disconnected from websocket with event code \"" + event.code + "\"", 'fatal');
    }
});

////////////////////////////////////////
// Websocket Reconnecting Event
////////////////////////////////////////

bot.on('reconnecting', () => {
    log('Attempting to reconnect to websocket...', 'warn');
});

////////////////////////////////////////
// General Warning
////////////////////////////////////////

bot.on('warn', info => {
    log(info, 'warn');
});

////////////////////////////////////////
// General Debug
////////////////////////////////////////

bot.on('debug', info => {
    log(info, 'debug');
});

////////////////////////////////////////
// WebSocket Resume
////////////////////////////////////////

bot.on('resume', replayed => {
    log('WebSocket resumed, number of events replayed: '+replayed, 'warn');
});

////////////////////////////////////////
// WebSocket Error
////////////////////////////////////////

bot.on('error', err => {
    TOOLS.errorHandler({err:err});
});

////////////////////////////////////////
// Message Received Event
////////////////////////////////////////

bot.on('message', (m) => {
    if (m.author.bot || m.author.system) return; // message was posted by system or bot

    if (m.channel.type !== 'dm' && m.content.toLowerCase().startsWith(`${memory.bot.trigger}obs`) && m.member.permissions.has("KICK_MEMBERS", true)) {
        log('Emergency shutdown initiated.', 'fatal');
        clearInterval(memory.bot.status_check);
        bot.destroy();
        setTimeout(() => {
            process.exit(1000);
        }, 1000);
        return;
    }

    if (memory.bot.booting) return; // bot is still loading required assets
    if (memory.bot.shutdown) return; // bot is shutting down or going under a scheduled restart
    if (cfg.channels.blacklist.indexOf(m.channel.id) > -1) return; // channel is on blacklist

    memory.db.stats.update({day: new Date().getDate()}, { $inc: { messages: 1 } }, (err) => {
        if (err) TOOLS.errorHandler({err:err});
    });

    if (memory.stats.unique.indexOf(m.author.id) === -1) {
        memory.stats.unique.push(m.author.id);

        memory.db.stats.update({day: new Date().getDate()}, { $set: { "users.unique": memory.stats.unique.length } }, (err) => {
            if (err) TOOLS.errorHandler({err:err});
        });
    }

    if (m.channel.type === 'dm') {
        memory.db.stats.update({day: new Date().getDate()}, { $inc: { dms: 1 } }, (err) => {
            if (err) TOOLS.errorHandler({err:err});
        });
    }

    if (memory.cd.active) return;

    let input = m.content.trim().split("\n", 1)[0];
    let cmd = input.toLowerCase().split(" ")[0].substr(1);
    let args = input.split(" ").slice(1).filter(function (e) { return e.length != 0 });
    let cmdValidator = input.match(new RegExp("\\" + memory.bot.trigger + "\\w"));

    let isSuper = cfg.superusers.indexOf(m.author.id) > -1;

    if(memory.bot.newUsers.indexOf(m.author.id) > -1 && (m.channel.type === 'dm' || (cmdValidator && input.indexOf(cmdValidator[0]) === 0))) {
        let embed = new discord.RichEmbed()
        .setColor(cfg.vs.embed.error)
        .attachFile(new discord.Attachment(memory.bot.icons.get('opti_err.png'), "icon.png"))
        .setAuthor(`Sorry, you must wait 10 minutes from the moment you join the server to use OptiBot.`, 'attachment://icon.png')
        .setDescription(`Please take this time to read the <#479192475727167488> and <#531622141393764352>.`);

        m.channel.send({ embed: embed });
        return;
    }

    if (memory.bot.debug && !isSuper && memory.bot.locked) {
        // bot is in debug mode and restricted to superuser access only.
        if (m.channel.type === 'dm') {
            TOOLS.errorHandler({ err: 'OptiBot is currently undergoing maintenance. Please try again later!', m: m });
        } else
        if (cmdValidator && input.indexOf(cmdValidator[0]) === 0) {
            TOOLS.errorHandler({ err: 'OptiBot is currently undergoing maintenance. Please try again later!', m: m, temp:true });
        }
        return;
    }

    if (!bot.guilds.get(cfg.basic.of_server).available) {
        TOOLS.errorHandler({ err: 'OptiBot is unable to access the OptiFine server. Please try again later!', m: m });
        return;
    }

    if (cmdValidator && input.indexOf(cmdValidator[0]) === 0) {
        memory.db.stats.update({day: new Date().getDate()}, { $inc: { commands: 1 } }, (err) => {
            if (err) TOOLS.errorHandler({err:err});
        });

        TOOLS.typerHandler(m.channel, true);
    }

    bot.setTimeout(() => {
        bot.guilds.get(cfg.basic.of_server).fetchMember(m.author.id).then(member => {
            let isAdmin = member.permissions.has("KICK_MEMBERS", true) || member.roles.has(cfg.roles.junior_mod);
    
            if (memory.cd.active && !isAdmin && !isSuper) return; // bot is in cooldown mode and the user does not have mod/superuser permissions
    
            if (memory.bot.locked && !isAdmin && !isSuper) return; // bot is in mods-only mode and the user is not a mod/superuser.
    
            memory.bot.lastInt = new Date().getTime();

            if(m.channel.type !== 'dm' && m.guild.id === cfg.basic.of_server) {
                memory.bot.actMods.forEach((mod, i) => {
                    if(mod.id === m.author.id) {
                        memory.bot.actMods[i] = {
                            id: mod.id,
                            status: m.author.presence.status,
                            last_message: m.createdTimestamp
                        };
                    }
                });
            }
    
            if (cmdValidator && input.indexOf(cmdValidator[0]) === 0) {
                ////////////////////////////////////////////////////////////////
                // COMMANDS
                ////////////////////////////////////////////////////////////////

                TOOLS.cooldownHandler(m, (isAdmin || isSuper));

                process.send({
                    type: 'status',
                    guild: (m.channel.type === 'dm') ? null : m.guild.id,
                    channel: (m.channel.type === 'dm') ? m.author.id : m.channel.id,
                    message: true
                });

                log('isAdmin: '+isAdmin, 'trace');
                log('isSuper: '+isSuper, 'trace');

                let l_tag = '';

                if(isSuper) {
                    l_tag = '[DEV]';
                } else
                if(member.permissions.has("ADMINISTRATOR", true)) {
                    l_tag = '[ADMIN]';
                } else
                if(member.roles.has(cfg.roles.moderator)) {
                    l_tag = '[MOD]';
                } else
                if(member.roles.has(cfg.roles.junior_mod)) {
                    l_tag = '[JRMOD]';
                }
                

                log(`${(l_tag.length > 0) ? l_tag+' ' : ''}COMMAND ISSUED BY ${m.author.username}#${m.author.discriminator}: ${memory.bot.trigger+cmd} ${(cmd === 'dr') ? args.join(' ').replace(/\S/gi, '*') : args.join(' ')}`);
                
    
                TOOLS.confirmationFinder({ member_id: m.author.id, channel_id: m.channel.id }, (index) => {
                    if (index > -1 && cmd !== 'confirm' && cmd !== 'cancel') {
                        TOOLS.errorHandler({ err: 'You cannot use other commands until you confirm, cancel, or ignore your previous request for ~5 minutes.', m: m });
                    } else {
                        CMD.get(cmd, (res) => {
                            function unknown() {
                                let embed = new discord.RichEmbed()
                                    .setColor(cfg.vs.embed.default)
                                    .attachFile(new discord.Attachment(memory.bot.icons.get('opti_info.png'), "icon.png"))
                                    .setAuthor('Unknown command. Type ' + memory.bot.trigger + 'list for a list of commands.', 'attachment://icon.png');

                                CMD.getAll((list) => {
                                    let filtered = [];
                                    let ratings = [];
                                    if (isSuper && m.channel.type === 'dm') {
                                        filtered = list
                                    } else
                                    if (isAdmin) {
                                        filtered = list.filter((cmd2) => (cmd2.getMetadata().tags['DEVELOPER_ONLY'] === false));
                                    } else {
                                        filtered = list.filter((cmd2) => (cmd2.getMetadata().tags['MODERATOR_ONLY'] === false && cmd2.getMetadata().tags['DEVELOPER_ONLY'] === false));
                                    }

                                    filtered.forEach((cmd3) => {
                                        ratings.push({
                                            command: cmd3.getMetadata().trigger,
                                            distance: wink(cmd, cmd3.getMetadata().trigger)
                                        })
                                    });

                                    ratings.sort((a, b) => {
                                        if (a.distance < b.distance) {
                                            return 1;
                                        } else 
                                        if (a.distance > b.distance) {
                                            return -1;
                                        } else {
                                            return 0;
                                        }
                                    });

                                    let closest = ratings[0];

                                    log(ratings, 'trace');

                                    if (closest.distance > 0.2) {
                                        embed.setDescription(`Perhaps you meant \`${memory.bot.trigger}${closest.command}\`? (${(closest.distance * 100).toFixed(1)}% match)`)
                                    }

                                    m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                                });
                            }

                            function checkMisuse(errMsg) {
                                if(res.getMetadata().tags['DELETE_ON_MISUSE']) {
                                    m.delete();
                                    TOOLS.errorHandler({ err: errMsg, m:m, temp: true });
                                } else {
                                    TOOLS.errorHandler({ err: errMsg, m:m });
                                }
                            }

                            if (!res) {
                                log('unknown cmd', 'trace');
                                unknown();
                            } else
                            if (res.getMetadata().tags['DEVELOPER_ONLY'] && !isSuper) {
                                log('User attempted to use hidden command.', 'warn');
                                log(JSON.stringify(res.getMetadata()));
                                unknown();
                            } else
                            if ( (res.getMetadata().tags['MODERATOR_ONLY'] && !isAdmin) || (res.getMetadata().tags['NO_JR_MOD'] && member.roles.has(cfg.roles.junior_mod)) ) {
                                checkMisuse('You do not have permission to use this command.')
                            } else
                            if (res.getMetadata().tags['NO_DM'] && m.channel.type === 'dm' && !isSuper) {
                                checkMisuse('This command can only be used in server chat.')
                            } else
                            if (res.getMetadata().tags['DM_ONLY'] && m.channel.type !== 'dm' && (!isAdmin || !isSuper)) {
                                checkMisuse('This command can only be used in DMs.')
                            } else 
                            if (res.getMetadata().tags['BOT_CHANNEL_ONLY'] && m.channel.type !== 'dm' && (cfg.channels.mod.indexOf(m.channel.id) === -1 && cfg.channels.bot.indexOf(m.channel.id) === -1) && (!isAdmin || !isSuper)) {
                                checkMisuse('This command can only be used in DMs OR the #optibot channel.')
                            } else 
                            if (res.getMetadata().tags['MOD_CHANNEL_ONLY'] && m.channel.type !== 'dm' && cfg.channels.mod.indexOf(m.channel.id) === -1 && !isSuper) {
                                checkMisuse('This command can only be used in moderator-only channels.')
                            } else {
                                res.exec(m, args, member, { isAdmin: isAdmin, isSuper: isSuper });
                            }
                        });
                    }
                });
            } else {
                ////////////////////////////////////////////////////////////////
                // ASSISTANTS
                ////////////////////////////////////////////////////////////////
    
                if (m.channel.type === 'dm') {
                    let embed = new discord.RichEmbed()
                    .setColor(cfg.vs.embed.default)
                    .attachFile(new discord.Attachment(memory.bot.icons.get('opti_info.png'), "icon.png"))
                    .setAuthor(`Hi there! For a list of commands, type "${memory.bot.trigger}list". If you've donated and you would like to receive your donator role, type "${memory.bot.trigger}help dr" for detailed instructions.`, 'attachment://icon.png');
    
                    m.channel.send({ embed: embed });
                } else
                // 
                if (memory.bot.smr.some(badlink => m.content.includes(badlink))) {
                    TOOLS.typerHandler(m.channel, true);
                    let foundLinks = [];
                    for (let i = 0; i < memory.bot.smr.length; i++) {
                        if (m.content.indexOf(memory.bot.smr[i]) > -1) {
                            foundLinks.push(memory.bot.smr[i]);
                        }
    
                        if (i+1 === memory.bot.smr.length) {
                            let embed = new discord.RichEmbed()
                                .setColor(cfg.vs.embed.default)
                                .attachFile(new discord.Attachment(memory.bot.icons.get('opti_warn.png'), "icon.png"))
                                .setAuthor('Warning', 'attachment://icon.png')
                                .setDescription(`A link to a blacklisted website was detected in [this](${m.url}) message. Remember to avoid suspicious links, and proceed with caution. \nhttps://stopmodreposts.org/`)
                                .addField("Detected URL(s)", "```" + foundLinks.join(', ') + "```")
    
                            TOOLS.typerHandler(m.channel, false);
                            m.channel.send({ embed: embed });
                        }
                    }
                } else
                if (m.content.trim() === '<#426005631997181963>') {
                    TOOLS.typerHandler(m.channel, true);
                    CMD.get('offtopic', (cmd) => {
                        if (cmd) {
                            cmd.exec(m);
                        }
                    });
                } else
                if (m.content.trim() === '<#584850909725458503>') {
                    TOOLS.typerHandler(m.channel, true);
                    CMD.get('memes', (cmd) => {
                        if (cmd) {
                            cmd.exec(m);
                        }
                    });
                } else
                if (m.content.toLowerCase().trim() === 'f') {
                    m.react('🇫').catch((err) => {
                        TOOLS.errorHandler({ err: err });
                    });
                } else
                if (m.content.toLowerCase().trim() === 'ok') {
                    if (Math.random() > 0.5) {
                        m.react('🆗').catch((err) => {
                            TOOLS.errorHandler({ err: err });
                        });
                    } else {
                        m.react('🇧').then(()=>{
                            m.react('🇴').then(()=>{
                                m.react('🅾️').then(()=>{
                                    m.react('🇲').then(()=>{
                                        m.react('🇪').then(()=>{
                                            m.react('🇷').catch(err => TOOLS.errorHandler({ m: m, err: err }));
                                        }).catch(err => TOOLS.errorHandler({ m: m, err: err }));
                                    }).catch(err => TOOLS.errorHandler({ m: m, err: err }));
                                }).catch(err => TOOLS.errorHandler({ m: m, err: err }));
                            }).catch(err => TOOLS.errorHandler({ m: m, err: err }));
                        }).catch(err => TOOLS.errorHandler({ m: m, err: err }));
                    }
                } else
                if (m.content.trim() === '^') {
                    m.channel.fetchMessages({ limit: 5, before:m.id }).then(msgs => {
                        

                        let emoji = TOOLS.randomizer(['☝️', '👆']);
                        let lastMsg = msgs.values().next().value;

                        if(!lastMsg.reactions.has('☝️') && !lastMsg.reactions.has('👆')) {
                            m.delete().catch(err => {
                                TOOLS.errorHandler({ err: err });
                            });

                            lastMsg.react(emoji).catch((err) => {
                                TOOLS.errorHandler({ err: err });
                            });
                        } else {
                            log('emoji already added', 'debug');
                        }
                    }).catch(err => TOOLS.errorHandler({ m: m, err: err }));
                } else
                if (m.content.indexOf('#') > -1) {
                    log('possible GHREF match', 'trace');
                    //remove everything in quotes, single-line codeblocks, multi-line codeblocks, and strikethroughs.
                    let filtered = m.content.replace(/"[^"]+"|`{3}[^```]+`{3}|~{2}[^~~]+~{2}|`{1}[^`]+`{1}|<[^<>]+>/gi, "");
    
                    // get issues from filtered message using regex, remove duplicates by using a set, and finally convert back to an array.
                    // ignores issues prefixed with a backwards slash (\) or just any word character
                    let issues = [...new Set(filtered.match(/(?<![a-z]#|\\#)(?<=#)(\d+)\b/gi))];
    
                    if (issues !== null) {
                        //ignore first 10 issues, and numbers that are larger than 4 characters in length.
                        if (issues.filter(e => (e.length < 5) && (parseInt(e) > 100)).length > 0) {
                            TOOLS.typerHandler(m.channel, true);
                            log('found GHREF match', 'trace');
                            let issueLinks = [];
                            let limit = (isAdmin) ? 8 : 4;
                            let limited = false;
                            let requestLimit = 12;
                            let i = 0;
    
                            (function searchGH() {
                                log('looking for #' + issues[i], 'debug');
    
                                request('https://github.com/sp614x/optifine/issues/' + issues[i] + '.json', (err, res, data) => {
                                    log('response', 'trace');
                                    if (err || !res || !data) {
                                        TOOLS.errorHandler({ err: err || new Error('Failed to get a response from the GitHub API'), m:m });
                                    } else
                                    if (res.statusCode === 403) {
                                        TOOLS.errorHandler({ err: new Error('403 Forbidden (OptiBot may be ratelimited)'), m:m });
                                    } else {
                                        let title = JSON.parse(data).title;
                                        if (title) {
                                            issueLinks.push(`[**#${issues[i]}** - ${title}](https://github.com/sp614x/optifine/issues/${issues[i]})`);
                                        }
    
                                        if (issueLinks.length === limit && issueLinks[i+1] !== undefined) {
                                            limited = true;
                                        }
    
                                        if (limited || i+1 === requestLimit || i+1 === issues.length) {
                                            if (issueLinks.length === 0) {
                                                TOOLS.errorHandler({ err: 'Could not find any issues on GitHub.', m:m, temp:true });
                                            } else {
                                                log('finalizing GH refs', 'trace');
                                                let embed = new discord.RichEmbed()
                                                    .attachFile(new discord.Attachment(memory.bot.icons.get('opti_gh.png'), "gh.png"))
                                                    .setColor(cfg.vs.embed.default)
                                                    .setAuthor('OptiFine Issue Tracker', 'attachment://gh.png')
                                                    .setDescription(`In response to [this](${m.url}) message...\n\n${issueLinks.join('\n\n')}`)
                                        
                                                if (limited) {
                                                    embed.setFooter('Other issues were omitted to prevent spam.');
                                                } else
                                                if (i+1 === requestLimit) {
                                                    embed.setFooter('Other issues were omitted to prevent ratelimiting.');
                                                }
                                        
                                                m.channel.send({ embed: embed }).then(msg => { 
                                                    TOOLS.messageFinalize(m.author.id, msg);
                                                });
                                            }
                                        } else {
                                            bot.setTimeout(() => {
                                                i++;
                                                searchGH();
                                            }, 500);
                                        }
                                    }
                                });
                            })();
                        }
                    }
                } else
                if (m.content.toLowerCase().trim() === '+band' && isAdmin) {
                    m.channel.fetchMessages({ limit: 5, before:m.id }).then(msgs => {
                        m.delete().catch(err => {
                            TOOLS.errorHandler({ err: err });
                        });

                        let lastMsg = msgs.values().next().value;

                        lastMsg.react('🎺').then(()=>{
                            lastMsg.react('🎸').then(()=>{
                                lastMsg.react('🥁').then(()=>{
                                    lastMsg.react('🎤').catch(err => TOOLS.errorHandler({ m: m, err: err }));
                                }).catch(err => TOOLS.errorHandler({ m: m, err: err }));
                            }).catch(err => TOOLS.errorHandler({ m: m, err: err }));
                        }).catch(err => TOOLS.errorHandler({ m: m, err: err }));
                    }).catch(err => TOOLS.errorHandler({ m: m, err: err }));
                } else
    
                // the remaining items here will run all at once, regardless if any of the above match.
    
                if (m.content.toLowerCase().indexOf('discord.gg') > -1 || m.content.toLowerCase().indexOf('discordapp.com/invite') > -1) {
                    log('possible invite link match', 'trace')
                    
                    let invites = m.content.match(/(?<=discord\.gg\/)\b\w+(?!\/)|(?<=discordapp\.com\/invite\/)\b\w+(?!\/)/gi);
    
                    if (invites !== null) {
                        invites.forEach((inviteCode) => {
                            bot.fetchInvite(inviteCode).then((invite) => {
                                log(`Invite link detected: ${invite.url} (${invite.guild.name}) \nPosted by ${m.author.username}#${m.author.discriminator}`)
                            }).catch(err => TOOLS.errorHandler({err:err}) )
                        })
                    }
                }
    
                if (m.isMentioned(bot.user)) {
                    m.react(bot.guilds.get(cfg.basic.ob_server).emojis.get('648594344676425731'));
                }
    
                if (m.content.toLowerCase() === 'band' && isAdmin) {
                    m.react('🎺').then(()=>{
                        m.react('🎸').then(()=>{
                            m.react('🥁').then(()=>{
                                m.react('🎤').catch(err => TOOLS.errorHandler({ m: m, err: err }));
                            }).catch(err => TOOLS.errorHandler({ m: m, err: err }));
                        }).catch(err => TOOLS.errorHandler({ m: m, err: err }));
                    }).catch(err => TOOLS.errorHandler({ m: m, err: err }));
                }
            }
        }).catch(err => {
            if (err.code === 10007) {
                TOOLS.errorHandler({ err: 'Sorry, you must be a member of the OptiFine Discord server to use this bot.', m: m });
            } else {
                throw (err);
            }
        });
    }, 400);
});

////////////////////////////////////////////////////////////////////////////////
// Command Handlers
////////////////////////////////////////////////////////////////////////////////

CMD.register(new Command({
    trigger: 'crash',
    short_desc: "Throws an error that won't be catched.",
    long_desc: "It crashes the bot. Literally. There's no fanfare at all, just a single line of code here using the `throw` statement.",
    fn: (m) => {
        setTimeout(() => {
            throw new Error('User-initiated error.');
        }, 10)
    }
}));

CMD.register(new Command({
    trigger: 'obs',
    short_desc: 'Emergency Shutoff',
    long_desc: `To be used in the event that OptiBot encounters a fatal error and does not shut down automatically. This should especially be used in the case of the bot spamming a text channel. \n\n**This is a last resort option, which could potentially corrupt data if used incorrectly. If at all possible, you should attempt to use the \`${memory.bot.trigger}stop\` command first.**`,
    tags: ['MODERATOR_ONLY', 'NO_DM'],
    fn: (m) => {
        log('Emergency shutdown initiated.', 'fatal');
        clearInterval(memory.bot.status_check);
        bot.destroy();
        setTimeout(() => {
            process.exit(1000);
        }, 1000);
        return;
    }
}));

CMD.register(new Command({
    trigger: 'restart',
    short_desc: 'Makes the bot restart.',
    tags: ['MODERATOR_ONLY', 'NO_DM'],
    fn: (m) => {
        let embed = new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_exit.png'), "icon.png"))
            .setAuthor('Restarting...', 'attachment://icon.png');

        TOOLS.typerHandler(m.channel, false);
        m.channel.send({ embed: embed }).then(msg => {
            TOOLS.shutdownHandler(2);
        }).catch(err => {
            TOOLS.errorHandler({ err: err, m: m });
            TOOLS.shutdownHandler(2);
        });
    }
}));

CMD.register(new Command({
    trigger: 'reset',
    short_desc: 'Makes the bot restart. (full reset)',
    fn: (m) => {
        if (memory.bot.debug) {
            let embed = new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_exit.png'), "icon.png"))
            .setAuthor('Resetting...', 'attachment://icon.png');

            TOOLS.typerHandler(m.channel, false);
            m.channel.send({ embed: embed }).then(msg => {
                TOOLS.shutdownHandler(3);
            }).catch(err => {
                TOOLS.errorHandler({ err: err, m: m });
                TOOLS.shutdownHandler(3);
            });
        } else {
            TOOLS.errorHandler({err: `Cannot reset outside of debug mode.`, m:m});
        }
    }
}));

CMD.register(new Command({
    trigger: 'stop',
    short_desc: 'Makes the bot shut down.',
    long_desc: 'Makes the bot shut down COMPLETELY. This will stop all functions and the bot will not return until manually started again.',
    tags: ['MODERATOR_ONLY', 'NO_DM'],
    fn: (m) => {
        let embed = new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_exit.png'), "icon.png"))
            .setAuthor('Shutting down...', 'attachment://icon.png');

        TOOLS.typerHandler(m.channel, false);
        m.channel.send({ embed: embed }).then(msg => {
            TOOLS.shutdownHandler(0);
        }).catch(err => {
            TOOLS.errorHandler({ err: err, m: m });
            TOOLS.shutdownHandler(0);
        });
    }
}));

CMD.register(new Command({
    trigger: 'dev',
    tags: ['DEVELOPER_ONLY', 'DM_OPTIONAL'],
    fn: (m) => {
        function uptime(ut) {
            let seconds = (ut / 1000).toFixed(1);
            let minutes = (ut / (1000 * 60)).toFixed(1);
            let hours = (ut / (1000 * 60 * 60)).toFixed(1);
            let days = (ut / (1000 * 60 * 60 * 24)).toFixed(1);

            if (seconds < 60) {
                return seconds + " Seconds";
            } else if (minutes < 60) {
                return minutes + " Minutes";
            } else if (hours < 24) {
                return hours + " Hours";
            } else {
                return days + " Days"
            }
        }

        let status = bot.status;

        if(bot.status === 0) {
            status = 'READY';
        } else
        if(bot.status === 1) {
            status = 'CONNECTING';
        } else
        if(bot.status === 2) {
            status = 'RECONNECTING';
        } else
        if(bot.status === 3) {
            status = 'IDLE';
        } else
        if(bot.status === 4) {
            status = 'NEARLY';
        } else
        if(bot.status === 5) {
            status = 'DISCONNECTED';
        } else {
            status = '[error]'
        }

        

        TOOLS.pickupData('startup', (nodeData) => {
            memory.db.profiles.find({}, (err, docs) => {
                CMD.getAll(commands => {
                    let data = {
                        "api_latency": `${Math.round(bot.ping)}ms`,
                        "session_uptime": uptime(process.uptime() * 1000),
                        "console_uptime": (nodeData) ? uptime(new Date().getTime() - nodeData.content) : '[error]',
                        "client_status": {
                            "code": bot.status,
                            "code_name": status
                        },
                        "registered_commands:": commands.length,
                        "icons": memory.bot.icons.index.length,
                        "images": memory.bot.images.index.length,
                        "blacklisted_websites": memory.bot.smr.length,
                        "user_profile_count": (err) ? `[error]` : docs.length,
                    }

                    m.channel.send(`\`\`\`json\n${JSON.stringify(data, null, 4)}\`\`\``).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                });
            });
        });
    }
}));

CMD.register(new Command({
    trigger: 'java',
    short_desc: 'Provides a link to download AdoptOpenJDK',
    tags: ['DM_OPTIONAL'],
    fn: (m) => {
        let embed = new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_jdk.png'), "icon.png"))
            .setAuthor('AdoptOpenJDK', 'attachment://icon.png')
            .setDescription('[https://adoptopenjdk.net/releases](https://adoptopenjdk.net/releases.html)')
            .setFooter("Remember to download the JRE installer!");

        m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
    }
}));

CMD.register(new Command({
    trigger: 'about',
    short_desc: 'About OptiBot',
    long_desc: 'Displays basic information about OptiBot.',
    tags: ['DM_OPTIONAL'],
    fn: (m) => {
        function uptime(ut) {
            let seconds = (ut / 1000).toFixed(1);
            let minutes = (ut / (1000 * 60)).toFixed(1);
            let hours = (ut / (1000 * 60 * 60)).toFixed(1);
            let days = (ut / (1000 * 60 * 60 * 24)).toFixed(1);

            if (seconds < 60) {
                return seconds + " Seconds";
            } else if (minutes < 60) {
                return minutes + " Minutes";
            } else if (hours < 24) {
                return hours + " Hours";
            } else {
                return days + " Days"
            }
        }

        let cntbrs = require('./cfg/contributors.json');
        let dntrs = require('./cfg/donators.json');

        let embed = new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFiles([new discord.Attachment(memory.bot.icons.get('opti_info.png'), "icon.png"), new discord.Attachment(memory.bot.avatar, "thumbnail.png")])
            .setAuthor('About', 'attachment://icon.png')
            .setThumbnail('attachment://thumbnail.png')
            .setDescription(`The official OptiFine Discord server bot. \n\n`)
            .addField('Version', `${pkg.version} (Build ${build.num})`, true)
            .addField('Session Uptime', `${uptime(process.uptime() * 1000)}`, true)
            .addField(`Contributors`, `${cntbrs.join(', ')}`)
            .addField(`\u200B`, `OptiBot is developed almost entirely by myself (<:jack:646322505107243018> <@181214529340833792>) out of love for a great community, all on my free time. Admittedly, I don't expect much (if anything) in return. I just like coding from time to time. However, if you'd still like to support this project, you can [buy me a coffee! ☕](http://ko-fi.com/jackasterisk "☕")`)
            .addField(`Supporters`, dntrs.join(', '))

        m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
    }
}));

CMD.register(new Command({
    trigger: 'offtopic',
    short_desc: "Go directly to <#426005631997181963>.",
    long_desc: "Go directly to <#426005631997181963>. Do not pass go, do not collect $200.",
    tags: ['DM_OPTIONAL'],
    fn: (m) => {
        if (m.channel.name.match(/(off)(|.)(topic)/) !== null) {
            let p0 = jimp.read(m.author.displayAvatarURL);
            let p1 = jimp.read(memory.bot.images.get('in_offtopic_bg.png'));
            let p2 = jimp.read(memory.bot.images.get('in_offtopic_fg.png'));
            let p3 = jimp.read(memory.bot.icons.get('optifine_thumbnail_mask.png'));

            Promise.all([p0, p1, p2, p3]).then((imgs) => {
                let pfp = imgs[0].rotate(-45, false).resize(64, 64, jimp.RESIZE_BEZIER).mask(imgs[3].resize(64, 64, jimp.RESIZE_BEZIER), 0, 0);
                imgs[1].composite(pfp, 40, 23).composite(imgs[2], 0, 0).getBuffer(jimp.AUTO, (err_b, imgFinal) => {
                    if (err_b) TOOLS.errorHandler({ m: m, err: err_b });
                    else {
                        let embed = new discord.RichEmbed()
                            .setColor(cfg.vs.embed.error)
                            .attachFile(new discord.Attachment(imgFinal, "image.png"))
                            .setDescription(`You're in ${m.channel}!`)
                            .setImage('attachment://image.png');

                        m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                    }
                });
            });
        } else {
            let embed = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFile(new discord.Attachment(memory.bot.images.get('offtopic.png'), "image.png"))
                .setDescription('<#426005631997181963>')
                .setImage('attachment://image.png');

            m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
        }

    }
}));

CMD.register(new Command({
    trigger: 'memes',
    short_desc: "Go directly to <#584850909725458503>.",
    long_desc: "Go directly to <#584850909725458503>. Do not pass go, do not collect $200.",
    tags: ['DM_OPTIONAL'],
    fn: (m) => {
        if (m.channel.name.indexOf("meme") > -1) {
            let msg = [
                "🙈 what if we kissed 😳 in the optifine discord 😳😳",
                "🅱ruh moment",
                "😂😂😂😂😂😂😂😂 WHO DID THIS 😂😂😂😂😂😂😂😂😂"
            ];

            let embed = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFile(new discord.Attachment(memory.bot.images.get('supermemes_nuked.png'), "image.png"))
                .setDescription(TOOLS.randomizer(msg))
                .setImage('attachment://image.png');

            m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
        } else {
            let embed = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFile(new discord.Attachment(memory.bot.images.get('memes.png'), "image.png"))
                .setDescription('<#584850909725458503>')
                .setImage('attachment://image.png');

            m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
        }

    }
}));

CMD.register(new Command({
    trigger: 'perms',
    short_desc: "Lists OptiBot's permissions.",
    long_desc: "Lists all Discord permissions, and whether they are enabled for OptiBot.",
    fn: (m) => {
        bot.guilds.get(cfg.basic.of_server).fetchMember(bot.user.id).then((member) => {
            let perms_all = member.permissions.serialize();
            let perms_enabled = '';
            let perms_disabled = '';
            log(perms_all, 'debug');

            let perms_names = Object.keys(perms_all);
            perms_names.forEach((flag) => {
                if (perms_all[flag]) {
                    perms_enabled += flag+'\n';
                } else {
                    perms_disabled += flag+'\n';
                }
            });

            let embed = new discord.RichEmbed()
                .attachFile(new discord.Attachment(memory.bot.icons.get('opti_docs.png'), "icon.png"))
                .setColor(cfg.vs.embed.default)
                .setAuthor("Permissions List", "attachment://icon.png")
                .setDescription('https://discordapp.com/developers/docs/topics/permissions')
                .addField('Enabled', perms_enabled)
                .addField('Disabled', perms_disabled)
            m.channel.send({embed: embed}).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
        });
    }
}));

CMD.register(new Command({
    trigger: '1710',
    short_desc: "How old is Minecraft 1.7.10?",
    tags: ['DM_OPTIONAL'],
    fn: (m) => {
        let _1710 = new Date('June 26, 2014 12:00:00').getTime();
        let age = new Date(new Date().getTime() - _1710);

        let years = age.getUTCFullYear() - 1970;
        let months = age.getUTCMonth();
        let days = age.getUTCDate();

        let embed = new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_timer.png'), "icon.png"))
            .setAuthor(`Minecraft 1.7.10 is ${years} years, ${months} ${(months === 1) ? "month" : "months"}, and ${days} ${(days === 1) ? "day" : "days"} old today.`, 'attachment://icon.png', 'http://www.howoldisminecraft1710.today/')
            .setFooter("Please stop playing on horribly outdated versions of the game.");

        m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
    }
}));

CMD.register(new Command({
    trigger: 'ask',
    short_desc: "A reminder: Don't ask to ask, just ask.",
    tags: ['DM_OPTIONAL'],
    fn: (m) => {
        let embed = new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_info.png'), "icon.png"))
            .setAuthor(`Don't ask to ask, just ask.`, 'attachment://icon.png')
            .setDescription('https://sol.gfxile.net/dontask.html');

        m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
    }
}));

CMD.register(new Command({
    trigger: 'issues',
    short_desc: "Provides a link to the OptiFine issue tracker.",
    tags: ['DM_OPTIONAL'],
    fn: (m) => {
        let embed = new discord.RichEmbed()
            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_gh.png'), "icon.png"))
            .setColor(cfg.vs.embed.default)
            .setAuthor('OptiFine Issue Tracker', 'attachment://icon.png')
            .setDescription('https://github.com/sp614x/optifine/issues');

        m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
    }
}));

CMD.register(new Command({
    trigger: 'mojira',
    short_desc: "Provides a link to the Minecraft: Java Edition Bug Tracker.",
    tags: ['DM_OPTIONAL'],
    fn: (m) => {
        let embed = new discord.RichEmbed()
            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_jira.png'), "icon.png"))
            .setColor(cfg.vs.embed.default)
            .setAuthor('Minecraft: Java Edition Bug Tracker', 'attachment://icon.png')
            .setDescription('https://bugs.mojang.com/projects/MC/summary');

        m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
    }
}));

CMD.register(new Command({
    trigger: 'download',
    short_desc: "Provides links to download OptiFine.",
    tags: ['DM_OPTIONAL'],
    fn: (m) => {
        let embed = new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_fine.png'), "thumbnail.png"))
            .setAuthor('Download OptiFine', 'attachment://thumbnail.png')
            .setDescription(`This embed includes ALL official download links for every version of OptiFine. Other websites may claim to be official. **Do not trust them.**`)
            .addField('Main Website', 'https://optifine.net/downloads')
            .addField('Alternate/Backup', 'https://optifined.net/downloads')
            .addField('Older Versions (b1.4 - 1.9)', '[OptiFine History at minecraftforum.net](https://www.minecraftforum.net/forums/mapping-and-modding-java-edition/minecraft-mods/1286605-b1-4-1-9-optifine-history)')

        m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
    }
}));

CMD.register(new Command({
    trigger: 'shaders',
    short_desc: "Provides a link to the official shader pack list.",
    tags: ['DM_OPTIONAL'],
    fn: (m) => {
        let embed = new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFiles([
                new discord.Attachment(memory.bot.icons.get('opti_shader.png'), "icon.png"),
                new discord.Attachment(memory.bot.images.get('shaders.png'), "thumbnail.png")
            ])
            .setAuthor('Offical Shader Pack List', 'attachment://icon.png')
            .setThumbnail('attachment://thumbnail.png')
            .setDescription('[https://optifine.net/shaderpacks](https://optifine.net/shaderPacks) \n\nYou can find this same link in-game, next to the "Shaders Folder" button.')

        m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
    }
}));

CMD.register(new Command({
    trigger: 'stats',
    short_desc: "General OptiBot/Server statistics.",
    fn: (m) => {
        memory.db.stats.find({ day: new Date().getDate() }, (err, docs) => {
            if (err) {
                TOOLS.errorHandler({ err: err, m:m });
            } else {
                log(docs[0], 'debug');
                let embed = new discord.RichEmbed()
                .attachFile(new discord.Attachment(memory.bot.icons.get('opti_stats.png'), "icon.png"))
                .setColor(cfg.vs.embed.default)
                .setAuthor('OptiStats', 'attachment://icon.png')
                .setDescription('General OptiBot/Server statistics. Not all data may be 100% accurate, this is all just for fun.')
                .addField('Messages', `Total Messages Received: ${docs[0].messages} \nDirect Messages: ${docs[0].dms} \nCommands: ${docs[0].commands} \n\nApproximately ${((docs[0].dms / docs[0].messages) * 100).toFixed(3)}% of all messages received are via DM. \nApproximately ${((docs[0].commands / docs[0].messages) * 100).toFixed(3)}% of all messages received are OptiBot instructions.`)

                let usermsg = `Users Joined: ${docs[0].users.join} \nUsers Left: ${docs[0].users.leave} \n\nA total of ${docs[0].users.unique} unique users were active today.`;
                

                if (docs[0].users.join === docs[0].users.leave) {
                    usermsg += '\nThere seems to be no change in the amount of users in the server.';
                } else
                if (docs[0].users.join > docs[0].users.leave) {
                    usermsg += '\nThere is currently a **net gain** in the amount of users in the server.';
                } else {
                    usermsg += 'There is currently a **net loss** in the amount of users in the server.';
                }

                embed.addField('Users', usermsg)
                .addField('Moderation', `Users Banned: ${docs[0].users.bans} \nUsers Kicked: ${docs[0].users.kicks} \nUsers Muted: ${docs[0].users.mutes}`)

                m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
            }
        });
    }
}));

CMD.register(new Command({
    trigger: 'rulestest',
    short_desc: 'WARNING: This command is a bit spammy (3 large embed messages in a row)',
    fn: (m) => {
        let s = (`_ _  `);

        // very wip in progress

        let rules = [
            `No spamming.`,
            `No advertising.`
            `[No prohibited content.]()`
            `Keep discussions friendly, respectful, and above all, civil.`,
            `Keep topics to their respective channels at all times.`,
            `Follow Discord's Community Guidelines (https://discordapp.com/guidelines) **and** Terms of Service. (https://discordapp.com/terms)`,
            `Do not ping or DM moderators for trivial issues.`,
            `Do not beg for free capes.`
        ];

        for(let i in rules) {
            rules[i] = `${parseInt(i)+1}) ${rules[i]}`;
        }

        let rules_embed = new discord.RichEmbed()
        .attachFile(new discord.Attachment(memory.bot.icons.get('opti_docs.png'), "icon.png"))
        .setColor(cfg.vs.embed.default)
        .setAuthor("Rules", 'attachment://icon.png')
        .setDescription(s+rules.join(`\n${s}`));



        let content = [
            `Advertisements. (unless granted permission by a moderator)`,
            `Offensive content. (bigotry, nazism, etc.)`,
            `Pornographic, questionable, and other NSFW content.`,
            `Disturbing, NSFL content.`,
            `Politics and religion.`,
            `Piracy.`,
            `Flashing animated pictures.`
        ];
        let content_embed = new discord.RichEmbed()
        .attachFile(new discord.Attachment(memory.bot.icons.get('opti_err.png'), "icon.png"))
        .setColor(cfg.vs.embed.error)
        .setAuthor("You are NOT allowed to post, upload, or discuss any of the following", 'attachment://icon.png')
        .setDescription(`${s}• `+content.join(`\n${s}• `));



        let guidelines = [
            `Use common sense. Please. It's not difficult, I promise.`,
            `**PLEASE** at least try reading the #faq, channel descriptions, pinned messages, #announcements, and recent chat history **BEFORE** blindly posting a question.`,
            `This is an English-speaking server. If you cannot fluently write in English, please try using a translator.`,
            `If you see something, say something. We encourage you to ping @moderator if you notice someone breaking the rules.`,
            `If you'd like to invite a friend to this server, we encourage you to use this permanent invite link: \`\`\`fix\nhttps://discord.gg/3mMpcwW\`\`\` `
        ]

        let guidelines_embed = new discord.RichEmbed()
        .attachFile(new discord.Attachment(memory.bot.icons.get('opti_okay.png'), "icon.png"))
        .setColor(cfg.vs.embed.okay)
        .setAuthor("Guidelines & Other Things", 'attachment://icon.png')
        .setDescription(`${s}• `+guidelines.join(`\n${s}• `));

        m.channel.send({embed: rules_embed}).then(() => {
            m.channel.send({embed: content_embed}).then(() => {
                m.channel.send({embed: guidelines_embed}).then(() => {
                    TOOLS.typerHandler(m.channel, false);
                })
            });
        });
    }
}));

CMD.register(new Command({
    trigger: 'goodboy',
    short_desc: "Good boy!",
    tags: ['DM_OPTIONAL'],
    fn: (m) => {
        let embed = new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(memory.bot.images.get('goodboy.gif'), "image.gif"))
            .setImage('attachment://image.gif')

        m.channel.send({embed: embed}).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
    }
}));

CMD.register(new Command({
    trigger: 'tm',
    short_desc: "The Thanos Method: The solution to all your Forge problems!",
    tags: ['DM_OPTIONAL'],
    fn: (m) => {
        /*
        let embed = new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_info.png'), "icon.png"))
            .setAuthor('The Thanos Method', 'attachment://icon.png')
            .setDescription('The Thanos Method is a debugging technique used to find mods that are incompatible with OptiFine.')
            .addField('How does it work?', `It's relatively simple. Make a new folder anywhere on your computer. You can name it anything, doesn't matter at all. Ideally, it should be somewhere easy to access, like your desktop. Open this folder and move the window to one side of your screen. Next, open your mods folder in your \`.minecraft\` directory and move it to the other side of your screen. From here, select **half** of all your Minecraft mods, and move them to your new folder. **Note that this should NOT include OptiFine. OptiFine should stay in the mods folder at all times!** Now from here, open Minecraft and see if the problem is gone. Next, you're going to do one of two things:`)
            .addField('1. Rinsing & Repeating', `If the issue is still present, don't worry. You're still making progress. The thing is, you've just cut your mods list in half, vastly simplifying the problem. By repeating these steps, you will eventually come down to a single mod that has an incompatibility with OptiFine. All you have to do from here is repeat the exact same steps: Split the mods in half and move them to your folder.`)
            .addField('2. Swapping & Splitting', `If you've opened Minecraft and the issue has gone away, you're on the right track. From here, you're going to close Minecraft again. Swap the set of mods from your mods folder to your new folder and vice versa. To make things easier, you may want to create another folder to avoid getting your compatible/non-compatible set of mods mixed. Finally, repeat the splitting process once again.`)

        let embed = new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_info.png'), "icon.png"))
            .setAuthor('The Thanos Method', 'attachment://icon.png')
            .setDescription('The Thanos Method is a debugging technique used to find mods that are incompatible with OptiFine.')
            .addField('How does it work?', `It's relatively simple. Make a new folder anywhere on your computer. You can name it anything, doesn't matter at all. Ideally, it should be somewhere easy to access, like your desktop. Open your mods folder in your \`.minecraft\` directory and select half of all your Minecraft mods. Now move them to your new folder. **Note that OptiFine should stay in the original mods folder at all times!** From here, open Minecraft and see if the problem is gone.`)
            .addField('1. Rinsing & Repeating', `If the issue is still present, just repeat the exact same steps. Split the mods in half and move them to your folder.`)
            .addField('2. Swapping & Splitting', `If the issue has gone away, you will now swap the set of mods from your mods folder to your new folder and vice versa. To make things easier, you may want to create another folder to avoid getting your compatible/non-compatible set of mods mixed. Finally, repeat the splitting process once again.`)
            .addField('The last mod', `Eventually, you will come down to just one remaining mod in your folder, aside from OptiFine. This will ultimately be the mod with the incompatibilities`)
        */

        let embed = new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_snap.png'), "icon.png"))
            .setAuthor('The Thanos Method', 'attachment://icon.png')
            .setDescription('The Thanos Method is a debugging technique used to find mods that are incompatible with OptiFine.')
            .addField('How does it work?', `It's simple. Split your mods into 2 groups, not including OptiFine. Remove one group, and test in-game. Keep the group that has the problem, and repeat until only 1-2 mods are remaining. Now go report the incompatibility on GitHub!`)

        m.channel.send({embed: embed}).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
    }
}));

CMD.register(new Command({
    trigger: 'jarfix',
    short_desc: 'Jarfix: The solution to everything!',
    long_desc: `Provides a link to download Jarfix, a tool to fix .jar filetype associations. This only works on Windows.`,
    tags: ['DM_OPTIONAL'],
    fn: (m) => {
        let embed = new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_jarfix.png'), "icon.png"))
            .setAuthor('Jarfix', 'attachment://icon.png')
            .setDescription('https://johann.loefflmann.net/en/software/jarfix/index.html');

        m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
    }
}));

CMD.register(new Command({
    trigger: 'rules',
    short_desc: 'Display all server rules',
    tags: ['DM_OPTIONAL'],
    fn: (m) => {
        bot.guilds.get(cfg.basic.of_server).channels.get('479192475727167488').fetchMessage('621909657858080779').then((msg) => {
            let rules = msg.content.match(/\d\).+$/gmi);

            let embed = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFile(new discord.Attachment(memory.bot.icons.get('opti_docs.png'), "icon.png"))
                .setAuthor("OptiFine Discord Server Rules", 'attachment://icon.png')
                .setDescription(`To continue participating in this server, we ask that you abide by these rules **at all times.** Additionally, while it's not *strictly* required, we ask that you try to follow the guidelines. These are also listed in the <#479192475727167488> channel.`);

            rules.forEach(e => {
                embed.addField(`Rule #${e.split(') ')[0]}`, e.substring(e.indexOf(')')+1));
            });

            m.channel.send({embed:embed}).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
        }).catch(err => {
            TOOLS.errorHandler({ err: err, m:m });
        });
    }
}));

CMD.register(new Command({
    trigger: 'donate',
    short_desc: 'Donation information.',
    long_desc: "Provides detailed information about OptiFine donations.",
    tags: ['DM_OPTIONAL'],
    fn: (m) => {
        let embed = new discord.RichEmbed()
        .setColor(cfg.vs.embed.default)
        .attachFile(new discord.Attachment(memory.bot.icons.get('opti_donate.png'), "thumbnail.png"))
        .setAuthor('OptiFine Donation Info', 'attachment://thumbnail.png')
        .setDescription(`Support OptiFine's development with one-time donation of $10, and optionally receive an OptiFine cape in recognition of your awesomeness. This cape can have one of two types of designs: The standard "OF" cape with fully custom colors, or a full banner design. These designs can be updated and changed at any time. In addition, you may request the Donator role on this very Discord server. This grants instant access to the exclusive, donator-only text channel. (type \`${memory.bot.trigger+"help dr"}\` in DMs or <#626843115650547743> for instructions) \n\nhttps://optifine.net/donate`)
        .setFooter('Thank you for your consideration!')

        m.channel.send(embed).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
    }
}));

CMD.register(new Command({
    trigger: 'ctest',
    fn: (m, args) => {
        m.channel.send('Are you sure you want to test this feature?').then(msg => {
            TOOLS.confirmationHandler(m, (result) => {
                if (result === 1) {
                    m.channel.send('Yay!');
                } else
                if (result === 0) {
                    m.channel.send('Aw.');
                } else
                if (result === -1) {
                    m.channel.send('Timed out.');
                }
            });
        });
    }
}));

CMD.register(new Command({
    trigger: 'confirm',
    short_desc: 'Confirms your previous request, if any is active.',
    tags: ['DM_OPTIONAL'],
    fn: (m, args) => {
        TOOLS.confirmationFinder({ member_id: m.author.id, channel_id: m.channel.id }, (index) => {
            if (index > -1) {
                log('emitting', 'trace');
                memory.bot.cdb[index].emitter.emit('confirm');
            } else {
                TOOLS.errorHandler({err:'You have nothing to confirm.', m:m});
            }
        });
    }
}));

CMD.register(new Command({
    trigger: 'cancel',
    short_desc: 'Cancels your previous request, if any is active.',
    long_desc: `Cancels your previous request, if any is active. It should be noted that requests will cancel themselves after 1 minute of inactivity.`,
    tags: ['DM_OPTIONAL'],
    fn: (m, args) => {
        TOOLS.confirmationFinder({ member_id: m.author.id, channel_id: m.channel.id }, (index) => {
            if (index > -1) {
                log('emitting', 'trace');
                memory.bot.cdb[index].emitter.emit('cancel');
            } else {
                TOOLS.errorHandler({err:'You have nothing to cancel.', m:m});
            }
        });
    }
}));

CMD.register(new Command({
    trigger: 'clearmotd',
    short_desc: 'Clear custom MOTD message.',
    long_desc: `Clears the custom MOTD message, which is set by using \`${memory.bot.trigger}motd\`.`,
    tags: ['MODERATOR_ONLY', 'NO_JR_MOD', 'NO_DM'],
    fn: (m) => {
        if (!memory.bot.motd.fields[0]) {
            TOOLS.errorHandler({ err:'There is no message currently set.', m:m });
        } else {
            let confirm = new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_warn.png'), "icon.png"))
            .setAuthor(`Are you sure want to remove the MOTD message?`, 'attachment://icon.png')
            .setDescription(`This will remove the current message set in the MOTD. \n\nType \`${memory.bot.trigger}confirm\` to continue.\nType \`${memory.bot.trigger}cancel\` or simply ignore this message to cancel.`)

            m.channel.send({embed:confirm}).then(msg => {
                TOOLS.confirmationHandler(m, (result) => {
                    let embed = new discord.RichEmbed()
                    .setColor(cfg.vs.embed.okay)
                    .attachFile(new discord.Attachment(memory.bot.icons.get('opti_okay.png'), "icon.png"))

                    if (result === 1) {
                        memory.db.motd.update({motd: true}, {motd:true, message:'', date: new Date()}, { upsert: true }, (err) => {
                            if (err) {
                                TOOLS.errorHandler({ err:err, m:m });
                            } else {
                                memory.bot.motd.fields = [];

                                embed.setAuthor(`Successfully removed message.`, 'attachment://icon.png');
                                m.channel.send({embed:embed}).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });     
                            }
                        });
                    } else
                    if (result === 0) {
                        let embed = new discord.RichEmbed()
                        .setColor(cfg.vs.embed.default)
                        .attachFile(new discord.Attachment(memory.bot.icons.get('opti_wait.png'), "icon.png"))
                        .setAuthor(`Request cancelled.`, 'attachment://icon.png')
                        .setDescription('MOTD message has not been removed.')

                        m.channel.send({embed: embed}).then(msg2 => { TOOLS.messageFinalize(m.author.id, msg2) });
                    } else
                    if (result === -1) {
                        let embed = new discord.RichEmbed()
                        .setColor(cfg.vs.embed.default)
                        .attachFile(new discord.Attachment(memory.bot.icons.get('opti_wait.png'), "icon.png"))
                        .setAuthor(`Request timed out.`, 'attachment://icon.png')
                        .setDescription('MOTD message has not been removed.')
                        
                        m.channel.send({embed: embed}).then(msg2 => { TOOLS.messageFinalize(m.author.id, msg2) });
                    }
                });
            });
        }
    }
}));

CMD.register(new Command({
    trigger: 'log',
    short_desc: `Retrieves OptiBot's current running log file.`,
    tags: ['MODERATOR_ONLY', 'DM_OPTIONAL', 'MOD_CHANNEL_ONLY'],
    fn: (m) => {
        TOOLS.pickupData('logName', (nodeData) => {
            if(!nodeData) {
                TOOLS.errorHandler({err: new Error(`Failed to get log file name.`), m:m});
            } else {
                log(`User ${m.author.username}#${m.author.discriminator} requested OptiBot log.`);
                let logFile = nodeData.content;

                fs.readFile(`./logs/${logFile}.log`, (err, data) => {
                    if (err) TOOLS.errorHandler({err:err, m:m});
                    else {
                        m.channel.send(new discord.Attachment(data, `${logFile}.log`)).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                    }
                });
            }
        });
    }
}));

CMD.register(new Command({
    trigger: 'modping',
    short_desc: 'Ping all "active" moderators.',
    long_desc: `Pings all "active" moderators. As an alternative to pinging the @moderator role, this command only pings those who are online, or those who have sent a message in server chat in the past 10 minutes. This should generally be used for all non-emergencies.`,
    tags: ['NO_DM'],
    fn: (m) => {
        let pings_msg = [];
        let pings_status = [];
        for(let i = 0; i < memory.bot.actMods.length; i++) {
            let mod = memory.bot.actMods[i];
            if(mod.status === 'online') {
                pings_status.push(`<@${mod.id}>`);
            }
            if((mod.last_message + 600000) > new Date().getTime()) {
                pings_msg.push(`<@${mod.id}>`);
            }

            if(i+1 === memory.bot.actMods.length) {
                if(pings_msg.length === 0) {
                    if(pings_status.length === 0) {
                        m.channel.send(`Sorry, it seems like no moderators are active right now. \nIf this is a genuine emergency, please ping the moderator role and we will try to get on as soon as possible.`).then(msg => { TOOLS.typerHandler(msg.channel, false); });
                    } else
                    if(pings_status.length === 1) {
                        m.channel.send(`${m.author}, moderator ${pings_status[0]} should be with you soon!`).then(msg => { TOOLS.typerHandler(msg.channel, false); });
                    } else {
                        m.channel.send(`${m.author}, one of the following moderators should be with you soon! \n\n${pings_status.join(', ')}`).then(msg => { TOOLS.typerHandler(msg.channel, false); });
                    }
                } else 
                if(pings_msg.length === 1) {
                    m.channel.send(`${m.author}, moderator ${pings_msg[0]} should be with you soon!`).then(msg => { TOOLS.typerHandler(msg.channel, false); });
                } else {
                    m.channel.send(`${m.author}, one of the following moderators should be with you soon! \n\n${pings_msg.join(', ')}`).then(msg => { TOOLS.typerHandler(msg.channel, false); });
                }
            }
        }
        //m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
    }
}));

CMD.register(new Command({
    trigger: 'motd',
    short_desc: 'View the MOTD.',
    long_desc: `Displays the MOTD, the message sent by OptiBot to every new user that joins the server.`,
    tags: ['BOT_CHANNEL_ONLY', 'DM_OPTIONAL'],
    fn: (m) => {
        m.channel.send({ embed: memory.bot.motd }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
    }
}));

// commands with arguments
// commands with arguments
// commands with arguments
// commands with arguments
// commands with arguments
// commands with arguments
// commands with arguments
// commands with arguments
// commands with arguments
// commands with arguments
// commands with arguments
// commands with arguments
// commands with arguments
// commands with arguments
// commands with arguments

CMD.register(new Command({
    trigger: 'unlock',
    short_desc: "Disables usage restrictions.",
    long_desc: `Disables usage restriction for the target. Valid targets include channels, and OptiBot itself. (bot's user ID or @mention) \n\nIf no target is specified, this will default to the context. If used in a text channel, this will unlock the channel, removing any moderator-only restrictions. If used in OptiBot's DMs, this will disable Mod-Only mode.`,
    usage: '[target]',
    tags: ['MODERATOR_ONLY', 'DM_OPTIONAL'],
    fn: (m, args) => {
        if(args[0]) {
            let channel = args[0].match(/(?<=^<#)\d+(?=>$)/);
            if(channel !== null) {
                channelUnlock(m.guild.channels.get(channel[0]))
            } else
            if(args[0].match(new RegExp(`(?<=^<@)!?${bot.user.id}(?=>$)`)) !== null || args[0] === bot.user.id) {
                botUnlock();
            }
        } else
        if(m.channel.type === 'dm') {
            botUnlock();
        } else {
            channelUnlock(m.channel);
        }

        function botUnlock() {
            if(!memory.bot.locked) {
                if(memory.bot.debug) {
                    TOOLS.errorHandler({ err: "Code Mode restriction already disabled.", m: m });
                } else {
                    TOOLS.errorHandler({ err: "Mod-only Mode is already disabled.", m: m });
                }
            } else
            if (memory.bot.debug) {
                memory.bot.locked = false;
                TOOLS.statusHandler(1);
                m.channel.send("CodeMode restriction disabled.").then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
            } else {
                let embed = new discord.RichEmbed()
                .attachFile(new discord.Attachment(memory.bot.icons.get('opti_okay.png'), "icon.png"))
                .setColor(cfg.vs.embed.okay)
                .setAuthor("Mod-only Mode disabled.", "attachment://icon.png");
    
                memory.bot.locked = false;
                TOOLS.statusHandler(1);
                m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
            }
        }

        function channelUnlock(channel) {
            if(m.channel.type === 'dm') {
                TOOLS.errorHandler({ err: "You cannot unlock channels from DMs.", m: m });
            } else 
            if(m.guild.id !== cfg.basic.of_server) {
                TOOLS.errorHandler({ err: "You cannot unlock channels outside of the OptiFine server.", m: m });
            } else {
                m.guild.fetchMember(bot.user.id).then(bot_member => {
                    let everyone = channel.permissionOverwrites.get(m.guild.id);
                    if (channel.memberPermissions(bot_member).serialize().MANAGE_ROLES_OR_PERMISSIONS === false) {
                        TOOLS.errorHandler({ err: "OptiBot does not have permission to modify this channel.", m:m });
                    } else 
                    if (everyone && new discord.Permissions(everyone.allow).serialize().SEND_MESSAGES === true) {
                        TOOLS.errorHandler({ err: "Channel is already unlocked.", m:m });
                    } else {
                        {
                            let permissions = {
                                SEND_MESSAGES: null
                            }
                    
                            channel.overwritePermissions(m.guild.id, permissions, `Channel unlocked by ${m.author.username}#${m.author.discriminator}.`).then(() => {
                                if (channel.memberPermissions(bot_member).serialize().SEND_MESSAGES === false) {
                                    channel.overwritePermissions(bot_member, { SEND_MESSAGES: true }, `Allowing OptiBot and Moderators to bypass.`).then(() => {
                                        channel.overwritePermissions(cfg.roles.moderator, { SEND_MESSAGES: true }, `Allowing OptiBot and Moderators to bypass.`).then(() => {
                                            success();
                                        });
                                    });
                                } else {
                                    success();
                                }
                            });
                        }
        
                        function success() {
                            let embed = new discord.RichEmbed()
                            .setColor(cfg.vs.embed.okay)
                            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_okay.png'), "icon.png"))
                            .setAuthor(`Channel successfully unlocked.`, 'attachment://icon.png')
        
                            m.channel.send({embed: embed}).then(msg => { TOOLS.typerHandler(msg.channel, false); });
                        }
                    }
                });
            }
        }
    }
}));

CMD.register(new Command({
    trigger: 'lock',
    short_desc: "Enable usage restrictions.",
    long_desc: `Enables usage restriction for the target. Valid targets include channels, and OptiBot itself. (bot's user ID or @mention) \n\nIf no target is specified, this will default to the context. If used in a text channel, this will lock the channel to moderators only. If used in OptiBot's DMs, this will set the bot to Mod-Only mode.`,
    usage: '[target]',
    tags: ['MODERATOR_ONLY', 'DM_OPTIONAL'],
    fn: (m, args) => {
        if(args[0]) {
            let channel = args[0].match(/(?<=^<#)\d+(?=>$)/);
            if(channel !== null) {
                channelLock(m.guild.channels.get(channel[0]))
            } else
            if(args[0].match(new RegExp(`(?<=^<@)!?${bot.user.id}(?=>$)`)) !== null || args[0] === bot.user.id) {
                botLock();
            }
        } else
        if(m.channel.type === 'dm') {
            botLock();
        } else {
            channelLock(m.channel);
        }

        function botLock() {
            if(memory.bot.locked) {
                if(memory.bot.debug) {
                    TOOLS.errorHandler({ err: "Code Mode restriction already enabled.", m: m });
                } else {
                    TOOLS.errorHandler({ err: "Mod-only Mode is already enabled.", m: m });
                }
            } else
            if (memory.bot.debug) {
                memory.bot.locked = true;
                TOOLS.statusHandler(1);
                m.channel.send("Code Mode restriction enabled.").then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
            } else {
                let embed = new discord.RichEmbed()
                .attachFile(new discord.Attachment(memory.bot.icons.get('opti_okay.png'), "icon.png"))
                .setColor(cfg.vs.embed.okay)
                .setAuthor("Mod-only Mode enabled.", "attachment://icon.png");
    
                memory.bot.locked = true;
                TOOLS.statusHandler(1);
                m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
            }
        }

        function channelLock(channel) {
            if(m.channel.type === 'dm') {
                TOOLS.errorHandler({ err: "You cannot lock channels from DMs.", m: m });
            } else 
            if(m.guild.id !== cfg.basic.of_server) {
                TOOLS.errorHandler({ err: "You cannot lock channels outside of the OptiFine server.", m: m });
            } else {
                m.guild.fetchMember(bot.user.id).then(bot_member => {
                    let everyone = channel.permissionOverwrites.get(m.guild.id);
                    if (channel.memberPermissions(bot_member).serialize().MANAGE_ROLES_OR_PERMISSIONS === false) {
                        TOOLS.errorHandler({ err: `OptiBot does not have permission to modify ${(m.channel.id === channel.id) ? "this" : "that"} channel.`, m:m });
                    } else 
                    if (everyone && new discord.Permissions(everyone.deny).serialize().SEND_MESSAGES) {
                        TOOLS.errorHandler({ err: "Channel is already locked.", m:m });
                    } else {
                        let permissions = {
                            SEND_MESSAGES: false
                        }
                
                        channel.overwritePermissions(m.guild.id, permissions, `Channel locked by ${m.author.username}#${m.author.discriminator}.`).then(() => {
                            if (channel.memberPermissions(bot_member).serialize().SEND_MESSAGES === false) {
                                channel.overwritePermissions(bot_member, { SEND_MESSAGES: true }, `Allowing OptiBot and Moderators to bypass.`).then(() => {
        
                                    channel.overwritePermissions(cfg.roles.moderator, { SEND_MESSAGES: true }, `Allowing OptiBot and Moderators to bypass.`).then(() => {
                                        success();
                                    });
                                });
                            } else {
                                success();
                            }
                        });
        
                        function success() {
                            let embed = new discord.RichEmbed()
                            .setColor(cfg.vs.embed.okay)
                            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_okay.png'), "icon.png"))
                            .setAuthor(`Channel successfully locked.`, 'attachment://icon.png')
        
                            m.channel.send({embed: embed}).then(msg => { TOOLS.typerHandler(msg.channel, false); });
                        }
                    }
                });
            }
        }
    }
}));

CMD.register(new Command({
    trigger: 'loglvl',
    short_desc: "Change logging level.",
    long_desc: `Changes console logging level. Must be a number 0-5.`,
    usage: `<number>`,
    fn: (m, args) => {
        if(!args[0]) {
            TOOLS.errorHandler({ err: `You must specify the new log level.`, m:m });
        } else
        if(isNaN(parseInt(args[0]))) {
            TOOLS.errorHandler({ err: `You must specify a valid number`, m:m });
        } else 
        if(parseInt(args[0]) > 5 || parseInt(args[0]) < 0) {
            TOOLS.errorHandler({ err: `Number must be between 0 and 5.`, m:m });
        } else {
            // todo: add functionality to simply check current log level by providing no arguments
            process.send({
                type:'logLvl',
                content: parseInt(args[0])
            });

            let embed = new discord.RichEmbed()
            .setColor(cfg.vs.embed.okay)
            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_okay.png'), "icon.png"))
            .setAuthor(`Log level updated.`, 'attachment://icon.png')

            m.channel.send({embed: embed}).then(msg => { TOOLS.typerHandler(msg.channel, false); });
        }
    }
}));

CMD.register(new Command({
    trigger: 'records',
    short_desc: "Get violation history of a given user.",
    long_desc: `Gets violation history of a given user. **WARNING: THIS MAY RESPOND WITH LARGE MESSAGES.**`,
    usage: "<discord user> [page #]",
    tags: ['DM_OPTIONAL', 'MODERATOR_ONLY', 'MOD_CHANNEL_ONLY'],
    fn: (m, args) => {
        if(!args[0]) {
            TOOLS.errorHandler({ err: `You must specify a Discord user.`, m: m });
        } else {
            TOOLS.getTargetUser(m, args[0], (userid, name) => {
                if (!userid) {
                    TOOLS.errorHandler({ err: "You must specify a valid user.", m:m });
                } else 
                if (userid === bot.user.id) { 
                    TOOLS.errorHandler({ err: `Nice try.`, m:m });
                } else {
                    TOOLS.getProfile(m, userid, (profile) => {
                        let embed = new discord.RichEmbed()
                        .attachFile(new discord.Attachment(memory.bot.icons.get('opti_docs.png'), "icon.png"))
                        .setColor(cfg.vs.embed.default)
                        .setFooter(`Note that existing violations before October 30th, 2019 will not show here.`);

                        if(typeof profile.violations === 'undefined') {
                            embed.setAuthor("User Records", "attachment://icon.png")
                            .setDescription(`<@${userid}> has no violations on record.`)

                            m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                        } else {
                            let pageNum = 1
                            let pageLimit = Math.ceil(profile.violations.length / 10);
                            if (args[1] && parseInt(args[1]) > 0 && parseInt(args[1]) <= pageLimit) {
                                pageNum = parseInt(args[1]);
                            }

                            embed.setAuthor(`User Records | Page ${pageNum}/${pageLimit}`, "attachment://icon.png")
                            .setDescription(`<@${userid}> has ${profile.violations.length} violation(s) on record.`);

                            let i = (pageNum > 1) ? (10 * (pageNum - 1)) : 0;
                            let added = 0;
                            let allEntries = profile.violations.reverse();
                            (function addEntry() {
                                let entry = allEntries[i];
                                embed.addField(`${entry.action} on ${new Date(entry.date).toUTCString()}`, `Moderator: <@${entry.moderator}> \n${(entry.action.toLowerCase() === 'note') ? "Note:" : "Reason:"} ${entry.reason} ${(typeof entry.misc !== 'undefined') ? "\nOther Info: "+entry.misc : ""}`);

                                added++;

                                if(added >= 10 || i+1 >= profile.violations.length) {
                                    m.channel.send({embed: embed}).then(msg => TOOLS.messageFinalize(m.author.id, msg));
                                } else {
                                    i++;
                                    addEntry();
                                }
                            })();
                        }
                    });
                }
            });
        }
    }
}));

CMD.register(new Command({
    trigger: 'addrecord',
    short_desc: "Add a note to a users violation history.",
    long_desc: `Adds a custom note to a users violation history.`,
    usage: "<discord user> <message>",
    tags: ['NO_DM', 'MODERATOR_ONLY', 'MOD_CHANNEL_ONLY'],
    fn: (m, args) => {
        if(!args[0]) {
            TOOLS.errorHandler({ err: `You must specify a Discord user.`, m: m });
        } else
        if(!args[1]) {
            TOOLS.errorHandler({ err: `You must specify a message to add.`, m: m });
        } else
        if (m.content.substring(m.content.indexOf(args[1])).length > 750) {
            TOOLS.errorHandler({ err: `Messages cannot exceed 750 characters in length.`, m: m });
        } else {
            TOOLS.getTargetUser(m, args[0], (userid, name) => {
                if (!userid) {
                    TOOLS.errorHandler({ err: "You must specify a valid user.", m:m });
                } else 
                if (userid === m.author.id || userid === bot.user.id ) { 
                    TOOLS.errorHandler({ err: `Nice try.`, m:m });
                } else {
                    TOOLS.getProfile(m, userid, (profile) => {
                        let embed = new discord.RichEmbed()
                        .attachFile(new discord.Attachment(memory.bot.icons.get('opti_docs.png'), "icon.png"))
                        .setColor(cfg.vs.embed.default)

                        if(typeof profile.violations === 'undefined') {
                            profile.violations = [];
                        }

                        profile.violations.push({
                            date: new Date().getTime(),
                            moderator: m.author.id,
                            action: 'Note',
                            reason: m.content.substring(m.content.indexOf(args[1]))
                        });

                        memory.db.profiles.update({member_id: profile.member_id}, profile, {}, (err) => {
                            if(err) {
                                TOOLS.errorHandler({ err: err, m:m });
                            } else {
                                let embed = new discord.RichEmbed()
                                .setColor(cfg.vs.embed.okay)
                                .attachFile(new discord.Attachment(memory.bot.icons.get('opti_okay.png'), "icon.png"))
                                .setAuthor('Successfully added note.', 'attachment://icon.png')

                                m.channel.send({embed: embed}).then(msg2 => { TOOLS.messageFinalize(m.author.id, msg2) });
                            }
                        })
                    });
                }
            });
        }
    }
}));

CMD.register(new Command({
    trigger: 'namemc',
    short_desc: `Find the Discord username of a Minecraft player.`,
    long_desc: `Attempts to find the Discord username of a specified Minecraft player. This is primarily designed to be used in conjunction with \`${memory.bot.trigger}cv\`.`,
    usage: `<minecraft username>`,
    //tags: ['MODERATOR_ONLY', 'DM_OPTIONAL'],
    fn: (m, args) => {
        // massive work in progress
        // todo
        // massive work in progress
        // todo
        // massive work in progress
        // todo
        if(!args[0]) {
            TOOLS.errorHandler({ err: `You must specify a Minecraft username.`, m: m });
        } else
        if (args[0].match(/\W+/) !== null) {
            TOOLS.errorHandler({ err: 'Minecraft usernames can only contain upper/lowercase letters, numbers, and underscores (_)', m: m });
        } else
        if (args[0].length > 16) {
            TOOLS.errorHandler({ err: 'Minecraft usernames cannot exceed 16 characters in length.', m: m });
        } else {
            request({ url: 'https://namemc.com/profile/' + args[0] }, (err, res, data) => {
                if (err || !res || !data || [200, 204].indexOf(res.statusCode) === -1) {
                    TOOLS.errorHandler({ err: err || new Error('Failed to get a response from the NameMC API'), m: m });
                } else
                if (res.statusCode === 204) {
                    let embed = new discord.RichEmbed()
                        .setColor(cfg.vs.embed.error)
                        .attachFile(new discord.Attachment(memory.bot.icons.get('opti_err.png'), "thumbnail.png"))
                        .setAuthor('That player does not exist.', 'attachment://thumbnail.png')
                        .setFooter('Maybe check your spelling?');

                    m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                } else {
                    getOFcape(JSON.parse(data));
                }
            });
        }
    }
}));

CMD.register(new Command({
    trigger: 'warn',
    short_desc: 'Adds a warning to a user.',
    long_desc: `Adds warnings to a user, which will be saved and remembered for about one week. Reasons can be appended after specifying the user.`,
    usage: `<discord user> [reason]`,
    tags: ['MODERATOR_ONLY', 'NO_DM'],
    fn: (m, args) => {
        if (!args[0]) {
            TOOLS.errorHandler({ err: "You must specify a user to give a warning to.", m:m });
        } else {
            TOOLS.getTargetUser(m, args[0], (userid, name) => {
                if (!userid) {
                    TOOLS.errorHandler({ err: "You must specify a valid user.", m:m });
                } else 
                if (userid === m.author.id || userid === bot.user.id ) { 
                    TOOLS.errorHandler({ err: `Nice try.`, m:m });
                } else {
                    bot.guilds.get(cfg.basic.of_server).fetchMember(userid).then(member => {
                        if (member.permissions.has("KICK_MEMBERS", true) || member.roles.has(cfg.roles.junior_mod) || member.user.bot) {
                            TOOLS.errorHandler({ m: m, err: `That user is too powerful to be given a warning.` });
                        } else {
                            TOOLS.getProfile(m, userid, (profile) => {
                                let now = new Date().getTime();
                                let reason = (args[1]) ? m.content.substring(m.content.indexOf(args[1])) : "No reason provided.";
        
                                if (typeof profile.violations === 'undefined') {
                                    profile.violations = [];
                                }
                                if (typeof profile.warnings === 'undefined') {
                                    profile.warnings = [];
                                }

                                profile.violations.push({
                                    date: now,
                                    moderator: m.author.id,
                                    action: 'Warning',
                                    reason: reason
                                });
        
                                profile.warnings.push({
                                    expiration: now + (1000*60*60*24*7),
                                    moderator: m.author.id
                                });
        
                                memory.db.profiles.update({ member_id: userid }, profile, {}, (err) => {
                                    if (err) {
                                        TOOLS.errorHandler({ m: m, err: err });
                                    } else {
                                        let num = `<@${userid}> now has **${profile.warnings.length}** warnings. You might consider muting them at this point.`;
                                        if (profile.warnings.length === 1) {
                                            num = `<@${userid}> has been given their **first** warning.`;
                                        } else
                                        if (profile.warnings.length === 2) {
                                            num = `<@${userid}> has been given their **second** warning.`;
                                        } else
                                        if (profile.warnings.length === 3) {
                                            num = `<@${userid}> has been given their **third** warning. You might consider muting them at this point.`;
                                        }

                                        let embed = new discord.RichEmbed()
                                        .setColor(cfg.vs.embed.default)
                                        .attachFile(new discord.Attachment(memory.bot.icons.get('opti_warn.png'), "icon.png"))
                                        .setAuthor(`User Warnings`, 'attachment://icon.png')
                                        .setDescription(num);
            
                                        m.channel.send({embed: embed}).then(msg2 => { TOOLS.messageFinalize(m.author.id, msg2) });
                                    }
                                });
                            });
                        }
                    }).catch(err => {
                        TOOLS.errorHandler({ m: m, err: err });
                    });
                }
            });
        }
    }
}));

CMD.register(new Command({
    trigger: 'bat',
    short_desc: "Generates a .bat file for debugging purposes.",
    long_desc: `Generates a .bat file to help find issues with the OptiFine installer. This only works on Windows. \n\n**Make sure the capitalization matches the filename exactly!** To simplify things, you can select the OptiFine installer in File Explorer, right-click and rename (F2), select all text (CTRL+A), and then copy (CTRL+C).`,
    usage: "<filename>",
    tags: ['DM_OPTIONAL'],
    fn: (m, args) => {
        if (!args[0] || args[0].toLowerCase().indexOf('optifine') === -1 || args[0].toLowerCase().indexOf('_mod') > -1) {
            let embed = new discord.RichEmbed()
            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_err.png'), "icon.png"))
            .setColor(cfg.vs.embed.error)
            .setAuthor("You must specify the file name of the OptiFine installer.", "attachment://icon.png")
            .setDescription(`For detailed instructions, type \`${memory.bot.trigger}help bat\``)

            m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
        } else {
            let filename = args[0];
            if (!(args[0].toLowerCase().endsWith('.jar'))) {
                filename += '.jar';
            }

            let bat_content = `@echo off\ncall java -jar ${filename} >> output.txt\npause`;

            let embed = new discord.RichEmbed()
            .attachFiles([new discord.Attachment(memory.bot.icons.get('opti_docs.png'), "icon.png"), new discord.Attachment(Buffer.from(bat_content), "debug.bat")])
            .setColor(cfg.vs.embed.default)
            .setAuthor("OptiFine Installation Debugger", "attachment://icon.png")
            .setDescription('Download and place this file in the same folder as the OptiFine installer, then run the .bat file.')
            .addField('What does this do?', `This [Windows Batch file](https://simple.wikipedia.org/wiki/Batch_file) will attempt to run the OptiFine installer, while recording the debug information the installer generates. This information is saved to a new text file in the same folder simply called \`output.txt\`.`)

            m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
        }
    }
}));

CMD.register(new Command({
    trigger: 'status',
    short_desc: 'Server statuses.',
    long_desc: `Displays current server status of OptiFine. Alternatively, you can view the status of the Minecraft/Mojang services by typing \`${memory.bot.trigger}status minecraft\` or \`${memory.bot.trigger}status mojang\`.`,
    usage: '["minecraft"|"mojang"|"all"]',
    tags: ['DM_OPTIONAL'],
    fn: (m, args, not_used, misc) => {
        let of_servers_text = '';
        let mc_websites_text = '';
        let mc_servers_text = '';
        let footer = "Hover over the links for detailed information. | If you're having issues, check your internet connection.";

        function translate(data, cb) {
            log('translate()', 'trace');
            of_servers_text = '';
            mc_websites_text = '';
            mc_servers_text = '';
            function translator(target, index, cb1) {
                if (target[index].status === 'gray') {
                    cb1(`<a:pinging:642112838722256925> Pinging [${target[index].server}](https://${target[index].server}/ "Awaiting response... | ${target[index].desc}")...`);
                } else
                if (target[index].status === 'green') {
                    cb1(`<:okay:642112445997121536> [${target[index].server}](https://${target[index].server}/ "Code ${target[index].code} | ${target[index].desc}") is online`);
                } else {
                    footer = "Hover over the links for detailed information. | Maybe try again in 10 minutes?";
                    if (target[index].status === 'teal') {
                        cb1(`<:warn:642112437218443297> Unknown response from [${target[index].server}](https://${target[index].server}/ "Code ${target[index].code} | ${target[index].desc}")`);
                    } else
                    if (target[index].status === 'yellow') {
                        cb1(`<:warn:642112437218443297> Partial outage at [${target[index].server}](https://${target[index].server}/ "Code ${target[index].code} | ${target[index].desc}")`);
                    } else
                    if (target[index].status === 'orange') {
                        cb1(`<:error:642112426162126873> An error occurred while pinging [${target[index].server}](https://${target[index].server}/ "Code ${target[index].code} | ${target[index].desc}")`);
                    } else
                    if (target[index].status === 'red') {
                        cb1(`<:error:642112426162126873> [${target[index].server}](https://${target[index].server}/ "Code ${target[index].code} | ${target[index].desc}") is down`);
                    } else
                    if (target[index].status === 'black') {
                        cb1(`<:error:642112426162126873> Failed to get any response from [${target[index].server}](https://${target[index].server}/ "Code ${target[index].code} | ${target[index].desc}")`);
                    }
                }
            }

            let mc_i1 = 0;
            let mc_i2 = 0;
            let mc_i3 = 0;

            (function loop_of() {
                if (data.optifine) {
                    log('optifine loop' + mc_i1, 'trace');
                    translator(data.optifine, mc_i1, (result) => {
                        of_servers_text += result + '\n';

                        if (parseInt(mc_i1) + 1 === data.optifine.length) {
                            loop_mc1();
                        } else {
                            mc_i1++
                            loop_of();
                        }
                    });
                } else {
                    loop_mc1();
                }
            })();

            function loop_mc1() {
                if (data.mojang_web) {
                    log('mojangweb loop' + mc_i2, 'trace');
                    translator(data.mojang_web, mc_i2, (result) => {
                        mc_websites_text += result + '\n';

                        if (parseInt(mc_i2) + 1 === data.mojang_web.length) {
                            loop_mc2();
                        } else {
                            mc_i2++
                            loop_mc1();
                        }
                    });
                } else {
                    loop_mc2();
                }
            }

            function loop_mc2() {
                if (data.mojang) {
                    log('mojang loop' + mc_i3, 'trace');
                    translator(data.mojang, mc_i3, (result) => {
                        mc_servers_text += result + '\n';

                        if (parseInt(mc_i3) + 1 === data.mojang.length) {
                            if (cb) cb(of_servers_text, mc_websites_text, mc_servers_text);
                        } else {
                            mc_i3++
                            loop_mc2();
                        }
                    });
                } else
                if (cb) cb(of_servers_text, mc_websites_text, mc_servers_text);
            }
        }

        if (Object.keys(memory.bot.status).length !== 0 && !misc.isAdmin && !misc.isSuper) {
            let agems = new Date().getTime() - memory.bot.status.timestamp;
            let age = (agems/(1000*60)).toFixed(1);

            let embed = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFile(new discord.Attachment(memory.bot.icons.get('opti_connect.png'), "icon.png"))
                .setAuthor('Server Status', 'attachment://icon.png')
                .setDescription(`You are viewing a snapshot taken ${age} minute(s) ago. This is to help avoid ratelimiting. You can check the current status in a few minutes.`)
                .setFooter(footer);

                translate(memory.bot.status, () => {
                    if (memory.bot.status.optifine) {
                        embed.addField('OptiFine Servers', of_servers_text)
                    }
        
                    if (memory.bot.status.mojang_web) {
                        embed.addField('Mojang Websites', mc_websites_text)
                    }
        
                    if (memory.bot.status.mojang) {
                        embed.addField('Mojang Services', mc_servers_text)
                    }
        
                    m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                });
        } else {
            /* 
            gray = pinging
            green = online
            yellow = partial outage
            red = service unavailable
            teal = unknown response
            orange = error occurred during request
            black = failed response
            */

            let responses = {
                optifine: [
                    { server: "optifine.net", status: "gray", code: '...', desc: "Main OptiFine Web Server." },
                    { server: "s.optifine.net", status: "gray", code: '...', desc: "OptiFine Capes Service" },
                    { server: "optifined.net", status: "gray", code: '...', desc: "Secondary OptiFine Web Server." }
                ],
                mojang_web: [
                    { server: "minecraft.net", status: "gray", code: '...', desc: "Minecraft Main Website" },
                    { server: "account.mojang.com", status: "gray", code: '...', desc: "Mojang Accounts Website" },
                    { server: "mojang.com", status: "gray", code: '...', desc: "Mojang Main Website" }
                ],
                mojang: [
                    { server: "session.minecraft.net", status: "gray", code: '...', desc: "Minecraft Multiplayer Session Service" },
                    { server: "authserver.mojang.com", status: "gray", code: '...', desc: "Mojang Authentication Service" },
                    { server: "sessionserver.mojang.com", status: "gray", code: '...', desc: "Mojang Session Server" },
                    { server: "api.mojang.com", status: "gray", code: '...', desc: "Mojang Public API" },
                    { server: "textures.minecraft.net", status: "gray", code: '...', desc: "Minecraft Textures Service (aka Player Skins Service)" }
                ]
            };

            if (args[0]) {
                if (args[0].toLowerCase() === 'mojang' || args[0].toLowerCase() === 'minecraft' || args[0].toLowerCase() === 'mc') {
                    delete responses.optifine;
                } else
                if (args[0].toLowerCase() !== 'all') {
                    delete responses.mojang_web;
                    delete responses.mojang;
                }
            } else {
                delete responses.mojang_web;
                delete responses.mojang;
            }

            log(responses, 'debug');

            translate(responses, () => {
                log('length1: ' + of_servers_text.length, 'trace');
                log('length2: ' + mc_servers_text.length, 'trace');

                let embed = new discord.RichEmbed()
                    .setColor(cfg.vs.embed.default)
                    .attachFile(new discord.Attachment(memory.bot.icons.get('opti_connect.png'), "icon.png"))
                    .setAuthor('Server Status', 'attachment://icon.png')
                    .setFooter(footer);

                    if (responses.optifine) {
                        embed.addField('OptiFine Servers', of_servers_text)
                    }

                    if (responses.mojang_web) {
                        embed.addField('Mojang Websites', mc_websites_text)
                    }

                    if (responses.mojang) {
                        embed.addField('Mojang Services', mc_servers_text)
                    }

                m.channel.send("_ _", { embed: embed }).then(msg => {
                    TOOLS.messageFinalize(m.author.id, msg);

                    let s1 = false;
                    let s2 = false;
                    let s3 = false;
                    let s4 = false;

                    let current_of = JSON.parse(JSON.stringify(of_servers_text));
                    let current_mw = JSON.parse(JSON.stringify(mc_websites_text));
                    let current_mc = JSON.parse(JSON.stringify(mc_servers_text));

                    if (!responses.optifine) {
                        s1 = true;
                        s2 = true;
                        s3 = true;
                    }
                    if (!responses.mojang || !responses.mojang_web) {
                        s4 = true;
                    }

                    let thisLoop = 0;

                    let updateLoop = bot.setInterval(() => {
                        process.send({
                            type: 'status',
                            guild: (m.channel.type === 'dm') ? null : m.guild.id,
                            channel: (m.channel.type === 'dm') ? m.author.id : m.channel.id,
                            message: true,
                        });
                        thisLoop++;
                        if (thisLoop === 10) embed.setDescription('Seems like this is taking a while. At this point, you could pretty safely assume the remaining servers are down.');
                        if (msg.deleted) {
                            log('status message deleted', 'trace');
                            bot.clearInterval(updateLoop);
                        } else {
                            log('checking update', 'trace');
                            translate(responses, (newOF, newMW, newMC) => {
                                if (current_of !== newOF || current_mc !== newMC || current_mw !== newMW || thisLoop === 10) {
                                    log(current_of, 'trace');
                                    log(newOF, 'trace');
                                    log('status changed', 'trace');


                                    if (responses.optifine && !(responses.mojang_web || responses.mojang)) {
                                        embed.fields[0].value = newOF;
                                    } else
                                    if ((responses.mojang_web || responses.mojang) && !responses.optifine) {
                                        embed.fields[0].value = newMW;
                                        embed.fields[1].value = newMC;
                                    } else
                                    if (responses.optifine && responses.mojang_web && responses.mojang) {
                                        embed.fields[0].value = newOF;
                                        embed.fields[1].value = newMW;
                                        embed.fields[2].value = newMC;
                                    }

                                    embed.setFooter(footer);

                                    if (s1 && s2 && s3 && s4) {
                                        embed.description = null;
                                        msg.edit("_ _", { embed: embed });

                                        log('status message updated', 'trace');
                                        log('finished checking status', 'trace');
                                        bot.clearInterval(updateLoop);

                                        responses.timestamp = new Date().getTime();
                                        memory.bot.status = responses;
                                        bot.setTimeout(() => {
                                            if (memory.bot.status.timestamp === responses.timestamp) {
                                                log('status expired', 'debug');
                                                memory.bot.status = {}
                                            }
                                        }, (1000 * 60 * 5));
                                    } else {
                                        msg.edit("_ _", { embed: embed });

                                        log('status message updated', 'trace');
                                        current_of = JSON.parse(JSON.stringify(newOF));
                                        current_mc = JSON.parse(JSON.stringify(newMC));
                                        current_mw = JSON.parse(JSON.stringify(newMW));
                                    }
                                } else log('no update', 'trace');
                            });
                        }

                    }, 1000);

                    if (responses.optifine) {
                        log('making optifine requests', 'trace');
                        request({ url: 'http://optifine.net/home', headers: { 'User-Agent': 'optibot' } }, (err, res, body) => {
                            if (err) {
                                if (err.code === 'ETIMEDOUT') {
                                    responses.optifine[0].status = 'red';
                                    responses.optifine[0].code = 'error';
                                    s1 = true;
                                } else {
                                    responses.optifine[0].status = 'orange';
                                    responses.optifine[0].code = 'error';
                                    s1 = true;
                                    log(err.stack, 'error');
                                }
                            } else
                            if (!res || !body) {
                                responses.optifine[0].status = 'black';
                                responses.optifine[0].code = 'error';
                                s1 = true;
                            } else
                            if (res.statusCode === 200) {
                                responses.optifine[0].status = 'green';
                                responses.optifine[0].code = res.statusCode;
                                s1 = true;
                            } else
                            if ([404, 503, 520, 522, 524].indexOf(res.statusCode) !== -1) {
                                responses.optifine[0].status = 'red';
                                responses.optifine[0].code = res.statusCode;
                                s1 = true;
                            } else {
                                log('Unexpected response from ' + responses.optifine[0].server + ' - ' + res.statusCode, 'error');
                                responses.optifine[0].status = 'teal';
                                responses.optifine[0].code = res.statusCode;
                                s1 = true;
                            }
                        });

                        request({ url: 'http://s.optifine.net', headers: { 'User-Agent': 'optibot' } }, (err, res, body) => {
                            if (err) {
                                if (err.code === 'ETIMEDOUT') {
                                    responses.optifine[1].status = 'red';
                                    responses.optifine[1].code = 'Error';
                                    s2 = true;
                                } else {
                                    responses.optifine[1].status = 'orange';
                                    responses.optifine[1].code = 'Error';
                                    s2 = true;
                                    log(err.stack, 'error');
                                }
                            } else
                            if (!res) {
                                responses.optifine[1].status = 'black';
                                responses.optifine[1].code = 'Error';
                                s2 = true;
                            } else
                            if (res.statusCode === 404) {
                                responses.optifine[1].status = 'green';
                                responses.optifine[1].code = res.statusCode;
                                s2 = true;
                            } else
                            if ([503, 520, 522, 524].indexOf(res.statusCode) !== -1) {
                                responses.optifine[1].status = 'red';
                                responses.optifine[1].code = res.statusCode;
                                s2 = true;
                            } else {
                                log('Unexpected response from ' + responses.optifine[1].server + ' - ' + res.statusCode, 'error');
                                responses.optifine[1].status = 'teal';
                                responses.optifine[1].code = res.statusCode;
                                s2 = true;
                            }
                        });

                        request({ url: 'http://optifined.net', headers: { 'User-Agent': 'optibot' } }, (err, res, body) => {
                            if (err) {
                                if (err.code === 'ETIMEDOUT') {
                                    responses.optifine[2].status = 'red';
                                    responses.optifine[2].code = 'error';
                                    s3 = true;
                                } else {
                                    responses.optifine[2].status = 'orange';
                                    responses.optifine[2].code = 'error';
                                    s3 = true;
                                    log(err.stack, 'error');
                                }
                            } else
                            if (!res || !body) {
                                responses.optifine[2].status = 'black';
                                responses.optifine[2].code = 'error';
                                s3 = true;
                            } else
                            if (res.statusCode === 200) {
                                responses.optifine[2].status = 'green';
                                responses.optifine[2].code = res.statusCode;
                                s3 = true;
                            } else
                            if ([404, 503, 520, 522, 524].indexOf(res.statusCode) !== -1) {
                                responses.optifine[2].status = 'red';
                                responses.optifine[2].code = res.statusCode;
                                s3 = true;
                            } else {
                                log('Unexpected response from ' + responses.optifine[2].server + ' - ' + res.statusCode, 'error');
                                responses.optifine[2].status = 'teal';
                                responses.optifine[2].code = res.statusCode;
                                s3 = true;
                            }
                        });
                    }

                    if (responses.mojang || responses.mojang_web) {
                        log('making mojang requests', 'trace');
                        request({ url: 'https://status.mojang.com/check', headers: { 'User-Agent': 'optibot' } }, (err, res, body) => {
                            if (err) {
                                if (err.code === 'ETIMEDOUT') {
                                    for (let i_m in responses.mojang) {
                                        responses.mojang[i_m].status = 'black';
                                        responses.mojang[i_m].code = 'error';
                                    }

                                    for (let i_m in responses.mojang_web) {
                                        responses.mojang_web[i_m].status = 'black';
                                        responses.mojang_web[i_m].code = 'error';
                                    }
                                    s4 = true;
                                } else {
                                    s4 = true;
                                    log(err.stack, 'error');
                                }
                            } else
                            if (!res || !body) {
                                for (let i_m in responses.mojang) {
                                    responses.mojang[i_m].status = 'black';
                                    responses.mojang[i_m].code = 'error';
                                }

                                for (let i_m in responses.mojang_web) {
                                    responses.mojang_web[i_m].status = 'black';
                                    responses.mojang_web[i_m].code = 'error';
                                }
                                s4 = true;
                            } else {
                                let json = JSON.parse(body);

                                /*
                                // for testing only
                                json[0][Object.keys(json[0])] = 'yellow';
                                json[3][Object.keys(json[3])] = 'red';
                                */

                                let i_s = 0;
                                let i_w = 0;
                                let web = [responses.mojang_web[0].server, responses.mojang_web[1].server, responses.mojang_web[2].server];

                                (function mojLoop() {
                                    log('MCR loop ' + i_s, 'trace');
                                    if (i_s === json.length) {
                                        s4 = true;
                                    } else {
                                        let index = web.indexOf(Object.keys(json[i_s])[0]);
                                        let newData = json[i_s][Object.keys(json[i_s])];
                                        if (index !== -1) {
                                            responses.mojang_web[index].status = newData;
                                            responses.mojang_web[index].code = newData;

                                            i_w++;
                                            i_s++;
                                            mojLoop();
                                        } else {
                                            responses.mojang[i_s - i_w].status = newData;
                                            responses.mojang[i_s - i_w].code = newData;

                                            i_s++;
                                            mojLoop();
                                        }
                                    }
                                })();
                            }
                        });
                    }

                    if (!responses.optifine && !responses.mojang && !responses.mojang_web) {
                        throw new Error('No servers to check.');
                    }
                });
            });
        }
    }
}));

CMD.register(new Command({
    trigger: 'blacklist',
    short_desc: `Add a URL to OptiBot's StopModReposts URL Blacklist.`,
    long_desc: `Add a URL to OptiBot's StopModReposts URL Blacklist. \n\nNote that this requires the ENTIRE URL, not just the name.`,
    usage: `<URL>`,
    tags: ['MODERATOR_ONLY', 'NO_DM'],
    fn: (m, args) => {
        if (!args[0]) {
            TOOLS.errorHandler({ err: "You must specify a URL.", m:m });
        } else {
            try {
                let whitelist = require('./cfg/url_whitelist.json');
                let url = new URL(args[0]);
                let hostname = url.hostname;

                if (hostname.startsWith('www.')) {
                    hostname = url.hostname.substring(4);
                }

                
                if (hostname.length === 0) {
                    TOOLS.errorHandler({ err: `You must specify a complete, valid URL.`, m:m });
                } else 
                if (whitelist.indexOf(hostname) > -1) {
                    TOOLS.errorHandler({ err: `That URL has been whitelisted.`, m:m });
                } else {
                    memory.db.smr.find({ url: hostname }, (err, docs) => {
                        if (err) {
                            TOOLS.errorHandler({ err: err, m:m });
                        } else
                        if (docs[0]) {
                            TOOLS.errorHandler({ err: `That URL has already been blacklisted.`, m:m });
                        } else {
                            let confirm = new discord.RichEmbed()
                                .setColor(cfg.vs.embed.default)
                                .attachFile(new discord.Attachment(memory.bot.icons.get('opti_warn.png'), "icon.png"))
                                .setAuthor(`Are you sure want to blacklist this URL?`, 'attachment://icon.png')
                                .setDescription(`\`\`\`${hostname}\`\`\` \nType \`${memory.bot.trigger}confirm\` to continue.\nType \`${memory.bot.trigger}cancel\` or simply ignore this message to cancel.`);

                            m.channel.send({embed: confirm}).then(msg => {
                                TOOLS.typerHandler(m.channel, false);
                                TOOLS.confirmationHandler(m, (result) => {
                                    if (result === 1) {
                                        let db_data = {
                                            url: hostname,
                                            writer: m.author.id,
                                            date: new Date().getTime()
                                        }
            
                                        memory.db.smr.insert(db_data, (err) => {
                                            if (err) {
                                                TOOLS.errorHandler({ err: err, m:m });
                                            } else {
                                                memory.bot.smr.push(hostname);

                                                let embed = new discord.RichEmbed()
                                                .setColor(cfg.vs.embed.okay)
                                                .attachFile(new discord.Attachment(memory.bot.icons.get('opti_okay.png'), "icon.png"))
                                                .setAuthor('Successfully added URL to blacklist.', 'attachment://icon.png')

                                                m.channel.send({embed: embed}).then(msg2 => { TOOLS.messageFinalize(m.author.id, msg2) });
                                            }
                                        });
                                    } else
                                    if (result === 0) {
                                        let embed = new discord.RichEmbed()
                                        .setColor(cfg.vs.embed.default)
                                        .attachFile(new discord.Attachment(memory.bot.icons.get('opti_wait.png'), "icon.png"))
                                        .setAuthor(`Request cancelled.`, 'attachment://icon.png')
                                        .setDescription('URL has not been blacklisted.')

                                        m.channel.send({embed: embed}).then(msg2 => { TOOLS.messageFinalize(m.author.id, msg2) });
                                    } else
                                    if (result === -1) {
                                        let embed = new discord.RichEmbed()
                                        .setColor(cfg.vs.embed.default)
                                        .attachFile(new discord.Attachment(memory.bot.icons.get('opti_wait.png'), "icon.png"))
                                        .setAuthor(`Request timed out.`, 'attachment://icon.png')
                                        .setDescription('URL has not been blacklisted.')
                                        
                                        m.channel.send({embed: embed}).then(msg2 => { TOOLS.messageFinalize(m.author.id, msg2) });
                                    }
                                });
                            });
                        }
                    });
                }
            }
            catch(err) {
                if (err.message.toLowerCase().indexOf('invalid url') > -1) {
                    TOOLS.errorHandler({ err: `You must specify a complete, valid URL.`, m:m });
                } else {
                    TOOLS.errorHandler({ err: err, m:m });
                }
            }
        }
    }
}));

CMD.register(new Command({
    trigger: 'cv',
    short_desc: 'Verifies cape ownership.',
    long_desc: `Adds a user to the list of "verified" cape owners. This adds a checkmark along with a user tag to the embeds used in the \`${memory.bot.trigger}cape\` command (It doesn't ping anyone, don't worry. It just lets you to view someones profile/nickname.) Usernames are translated into Minecraft UUIDs by using the Mojang API, so it's not necessary to use this again when someone changes their username.`,
    usage: '<discord user> <minecraft username>',
    tags: ['MODERATOR_ONLY', 'NO_DM'],
    fn: (m, args) => {
        if (!args[0]) {
            TOOLS.errorHandler({ err: "You must specify a user.", m:m });
        } else
        if (!args[1]) {
            TOOLS.errorHandler({ err: "You must specify the user's Minecraft username.", m:m });
        } else {
            TOOLS.getTargetUser(m, args[0], (userid, name) => {
                if (!userid) {
                    TOOLS.errorHandler({ err: "You must specify a valid user @mention, ID#, or shortcut (^)", m:m });
                } else
                if (args[1].match(/\W+/) !== null) {
                    TOOLS.errorHandler({ err: 'Minecraft usernames can only contain letters, numbers, and underscores (_)', m: m });
                } else
                if (args[1].length > 16) {
                    TOOLS.errorHandler({ err: 'Usernames cannot exceed 16 characters in length.', m: m });
                } else {
                    request({url: 'https://api.mojang.com/users/profiles/minecraft/'+encodeURIComponent(args[1]), encoding: null}, (err, res, data) => {
                        if (err || !res || !data) {
                            TOOLS.errorHandler({ err: err || new Error('Failed to get a response from the Mojang API'), m: m });
                        } else 
                        if (res.statusCode === 204) {
                            TOOLS.errorHandler({ err: 'Invalid Minecraft username.', m: m });
                        } else
                        if (res.statusCode !== 200) {
                            TOOLS.errorHandler({ err: new Error('Unexpected response code from Mojang API: '+res.statusCode), m: m });
                        } else {
                            let js = JSON.parse(data)

                            request({ url: 'https://optifine.net/capes/'+encodeURIComponent(js.name)+'.png', encoding: null }, (err_o, res_o, data_o) => {
                                if (err_o || !res_o || !data_o) {
                                    TOOLS.errorHandler({ err: err || new Error('Failed to get a response from the OptiFine API.'), m: m });
                                } else
                                if (res_o.statusCode === 404) {
                                    TOOLS.errorHandler({ err: 'There is no OptiFine cape linked to that Minecraft account.', m: m });
                                } else {
                                    TOOLS.getProfile(m, userid, (profile) => {
                                        if (profile.cape && profile.cape.uuid === js.id) {
                                            TOOLS.errorHandler({ err:'That username has already been saved.', m:m });
                                        } else {
                                            memory.db.profiles.find({"cape.uuid": js.id}, (err, docs) => {
                                                if (err) TOOLS.errorHandler({ err: err, m:m });
                                                else
                                                if (docs.length > 0) {
                                                    bot.guilds.get(cfg.basic.of_server).fetchMember(docs[0].member_id).then(member => {
                                                        TOOLS.errorHandler({ err: `That username has already been claimed by ${member.user.username}#${member.user.discriminator}`, m:m });
                                                    });
                                                } else {
                                                    let updated = (profile.cape && profile.cape.uuid.length > 0);
                                                    profile.cape = {
                                                        uuid: js.id
                                                    }

                                                    memory.db.profiles.update({ member_id: userid }, profile, (err) => {
                                                        if (err) TOOLS.errorHandler({ err: err, m:m });
                                                        else {
                                                            let embed = new discord.RichEmbed()
                                                                .setColor(cfg.vs.embed.okay)
                                                                .attachFile(new discord.Attachment(memory.bot.icons.get('opti_okay.png'), "icon.png"))
                        
                                                            if (updated) {
                                                                embed.setAuthor(`Updated. ${name}'s username is now "${js.name}"`, 'attachment://icon.png')
                                                                .setFooter('Reminder: This is not needed for every username change! This is only needed for changing Minecraft accounts.')
                                                            } else {
                                                                embed.setAuthor(`Added ${name} to verified cape owner list, with the username of "${js.name}"`, 'attachment://icon.png')
                                                            }
                        
                                                            m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }
    }
}));

CMD.register(new Command({
    trigger: 'removecv',
    short_desc: 'Removes cape ownership from a user.',
    long_desc: `Removes a user from the list of "verified" cape owners. OptiBot will ask you to confirm before proceeding.`,
    usage: '<discord user>',
    tags: ['MODERATOR_ONLY', 'NO_DM'],
    fn: (m, args) => {
        if (!args[0]) {
            TOOLS.errorHandler({ err: "You must specify a user.", m:m });
        } else {
            TOOLS.getTargetUser(m, args[0], (userid, name) => {
                if (!userid) {
                    TOOLS.errorHandler({ err: "You must specify a valid user @mention, ID#, or shortcut (^)", m:m });
                } else {
                    TOOLS.getProfile(m, userid, (profile) => {
                        if (!profile.cape) {
                            TOOLS.errorHandler({err:'That user does not have a verified cape.', m:m});
                        } else {
                            let confirm = new discord.RichEmbed()
                                .setColor(cfg.vs.embed.default)
                                .attachFile(new discord.Attachment(memory.bot.icons.get('opti_warn.png'), "icon.png"))
                                .setAuthor(`Are you sure want to remove ${name} from the verified cape owner list?`, 'attachment://icon.png')
                                .setDescription(`Type \`${memory.bot.trigger}confirm\` to continue.\nType \`${memory.bot.trigger}cancel\` or simply ignore this message to cancel.`);

                            m.channel.send({embed: confirm}).then(msg => {
                                TOOLS.typerHandler(m.channel, false);
                                TOOLS.confirmationHandler(m, (result) => {
                                    let embed = new discord.RichEmbed()
                                        .setColor(cfg.vs.embed.okay)
                                        .attachFile(new discord.Attachment(memory.bot.icons.get('opti_okay.png'), "icon.png"))
                                    if (result === 1) {
                                        delete profile.cape;
                                        memory.db.profiles.update({member_id: userid}, profile, (err) => {
                                            if (err) {
                                                TOOLS.errorHandler({err:err, m:m});
                                            } else {
                                                embed.setAuthor(`Removed ${name} from the verified cape owner list.`, 'attachment://icon.png');
                                                m.channel.send({embed: embed}).then(msg2 => { TOOLS.messageFinalize(m.author.id, msg2) });
                                            }
                                        });
                                    } else
                                    if (result === 0) {
                                        let embed = new discord.RichEmbed()
                                        .setColor(cfg.vs.embed.default)
                                        .attachFile(new discord.Attachment(memory.bot.icons.get('opti_wait.png'), "icon.png"))
                                        .setAuthor(`Request cancelled.`, 'attachment://icon.png')
                                        .setDescription('User has not been removed from verified cape owner list.')

                                        m.channel.send({embed: embed}).then(msg2 => { TOOLS.messageFinalize(m.author.id, msg2) });
                                    } else
                                    if (result === -1) {
                                        let embed = new discord.RichEmbed()
                                        .setColor(cfg.vs.embed.default)
                                        .attachFile(new discord.Attachment(memory.bot.icons.get('opti_wait.png'), "icon.png"))
                                        .setAuthor(`Request timed out.`, 'attachment://icon.png')
                                        .setDescription('User has not been removed from verified cape owner list.')
                                        
                                        m.channel.send({embed: embed}).then(msg2 => { TOOLS.messageFinalize(m.author.id, msg2) });
                                    }
                                });
                            });
                        }
                    });
                }
            });
        }
    }
}));

CMD.register(new Command({
    trigger: 'assist',
    short_desc: `Details OptiBot's assistant functions.`,
    long_desc: `Displays detailed information for OptiBot's "Assistant" functions. These are essentially commands that do not require OptiBot's command trigger (${memory.bot.trigger}), and can be used anywhere at any time. (Except DMs)`,
    usage: `[page #]`,
    tags: ['BOT_CHANNEL_ONLY', 'DM_OPTIONAL'],
    fn: (m, args) => {
        let pages = [
            new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_info.png'), "icon.png"))
            .addField('What are these?', `Assistants are, essentially, functions that do not require OptiBot's command trigger (${memory.bot.trigger}) to be used, and can be used anywhere in any message you send. (Apart from DMs.)`),

            new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFiles([new discord.Attachment(memory.bot.icons.get('opti_info.png'), "icon.png"), new discord.Attachment(memory.bot.images.get('red_x.png'), "thumbnail.png")])
            .setThumbnail('attachment://thumbnail.png')
            .addField('Deleting Bot Messages', `On Discord, you're allowed to delete any message you post at any time for any reason. No problem. On the other hand, you cannot delete other people's messages (unless you're a moderator, obviously). This goes for bot messages as well. \n\n*Until now!* \n\nFor your convenience, OptiBot will automatically and immediately add an emoji reaction to itself after almost every message it posts. This emoji appears as a red cross, and it's aptly named \`:click_to_delete:\`. By clicking on this reaction, the bot will promptly delete the message in question. This only works for yourself, as the person the bot was responding to. If anyone else tries to delete the message, it will simply be ignored.\n\nIt should be noted that OptiBot will only track up to ${cfg.db.size} messages at any given time. Once the message is old enough and has gone beyond this limit, it will be removed from OptiBot's memory. At this point, it can no longer be removed by anyone other than a Moderator or Admin.`),

            new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_info.png'), "icon.png"))
            .addField('GitHub References', `You can reference any issue or pull request from the [OptiFine GitHub repository](https://github.com/sp614x/optifine/issues) by simply typing a hash followed by a string of numbers, like so: \`\`\`#[number]\`\`\` OptiBot will ignore these if the hash is prefixed with a backwards slash (\\\\) or any other word character (A-Z). Additionally, to prevent accidental usage, issues/PRs #100 and older are all entirely ignored, as well as any number that is more than 4 characters in length. \n\nIn summary, the following will NOT work: \`\`\`#45\`\`\` \`\`\`#9999999\`\`\` \`\`\`\\#2000\`\`\` \`\`\`etc...\`\`\``),

            new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_info.png'), "icon.png"))
            .addField('StopModReposts Detector', `OptiBot will automatically flag any message that contains a link to an illegal Minecraft mod website. The list of bad sites is automatically downloaded and read from [StopModReposts' GitHub repository.](https://github.com/StopModReposts/Illegal-Mod-Sites) This helps to prevent the spread of malware, viruses, and other malicious things that are lurking in these fake websites. Avoid them as much as possible!\n\nUnlike any other message posted by OptiBot, you are NOT allowed to delete these. This is to stop anyone with any possible malicious intent. \n\nRead more about the StopModReposts campaign here: https://stopmodreposts.org/`)
        ];

        let pageNum = 1;
        let pageLimit = pages.length;
        if (args[0] && !isNaN(args[0]) && parseInt(args[0]) > 0 && parseInt(args[0]) <= pageLimit) {
            pageNum = parseInt(args[0]);
        }

        pages[pageNum-1].setAuthor(`OptiBot Assistants | Page ${pageNum}/${pageLimit}`, 'attachment://icon.png')

        m.channel.send({ embed: pages[pageNum-1] }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
    }
}));

CMD.register(new Command({
    trigger: 'serverlist',
    short_desc: 'Displays a list of Discord servers.',
    long_desc: `Displays a handpicked list of Discord servers that are relevant to OptiFine.`,
    usage: `[page #]`,
    tags: ['BOT_CHANNEL_ONLY', 'DM_OPTIONAL'],
    fn: (m, args) => {
        let pageNum = 1;
        let maxPageLength = 10;
        let pageLimit = Math.ceil(serverlist.length / maxPageLength);
        if (args[0] && !isNaN(args[0]) && parseInt(args[0]) > 0 && parseInt(args[0]) <= pageLimit) {
            pageNum = parseInt(args[0]);
        }

        let embed = new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_discord.png'), "icon.png"))
            .setAuthor(`Related Discord Servers | Page ${pageNum}/${pageLimit}`, 'attachment://icon.png')
            .setDescription(`You can get a quick link to any of these servers by using the \`${memory.bot.trigger}server\` command. (See \`${memory.bot.trigger}help server\` for details)`);

        let i = (pageNum > 1) ? (maxPageLength * (pageNum - 1)) : 0;
        let added = 0;
        (function addList() {
            embed.addField(serverlist[i].name, serverlist[i].link);
            added++;
            
            if (added >= maxPageLength || i+1 >= serverlist.length) {
                embed.setFooter(`Showing ${added}/${serverlist.length} servers`)
                m.channel.send({embed: embed}).then(msg => TOOLS.messageFinalize(m.author.id, msg));
            } else {
                i++;
                addList();
            }
        })();
    }
}));

CMD.register(new Command({
    trigger: 'server',
    short_desc: 'Link a specific Discord server.',
    long_desc: `Searches for a Discord server with the given name, and then provides an invite link. \n\nNote that this only searches within a specially picked group of servers. (See \`${memory.bot.trigger}serverlist\`) This command does **not** search through ALL servers across the entirety of Discord.`,
    usage: '<server name?>',
    tags: ['DM_OPTIONAL'],
    fn: (m, args) => {
        if (!args[0]) {
            TOOLS.errorHandler({ err: "You must specify a server to find.", m:m });
        } else {
            let query = m.content.substring((memory.bot.trigger+'server ').length).toLowerCase();
            let match = cstr.findBestMatch(query, Object.keys(memory.bot.servers));

            if (match.bestMatch.rating < 0.1) {
                TOOLS.errorHandler({ err: "Could not find a Discord server with that name.", m:m });
            } else {
                bot.fetchInvite(memory.bot.servers[match.bestMatch.target]).then(invite => {
                    let filetype = 'png';
                    if (invite.guild.icon.startsWith('a_')) filetype = 'gif';

                    /*
                    let p0 = jimp.read(`https://cdn.discordapp.com/icons/${invite.guild.id}/${invite.guild.icon}.${filetype}`);
                    let p1 = jimp.read(memory.bot.icons.get('optifine_thumbnail_mask.png'));

                    Promise.all([p0, p1]).then((imgs) => {
                        imgs[0].mask(imgs[1].resize(128, 128, jimp.RESIZE_BILINEAR), 0, 0)
                        .getBuffer(jimp.AUTO, (err, buffer) => {
                            if (err) {
                                TOOLS.errorHandler({ err:new Error(err), m:m });
                            } else {
                                let embed = new discord.RichEmbed()
                                .setColor(cfg.vs.embed.default)
                                .attachFiles([new discord.Attachment(memory.bot.icons.get('opti_discord.png'), "icon.png"), new discord.Attachment(buffer, "thumbnail."+filetype)])
                                .setAuthor(invite.guild.name, 'attachment://icon.png')
                                .setThumbnail('attachment://thumbnail.'+filetype)
                                .setDescription(`${invite.url}\n\n${(match.bestMatch.rating * 100).toFixed(1)}% match during search.`);

                                m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                            }
                        });
                    });
                    */

                    let embed = new discord.RichEmbed()
                    .setColor(cfg.vs.embed.default)
                    .attachFile(new discord.Attachment(memory.bot.icons.get('opti_discord.png'), "icon.png"))
                    .setAuthor(invite.guild.name, 'attachment://icon.png')
                    .setThumbnail(`https://cdn.discordapp.com/icons/${invite.guild.id}/${invite.guild.icon}.${filetype}`)
                    .setDescription(`${invite.url}\n\n${(match.bestMatch.rating * 100).toFixed(1)}% match during search.`);

                    m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                }).catch(err => {
                    TOOLS.errorHandler({ err: err, m:m });
                })
            }
        }
    }
}));

CMD.register(new Command({
    trigger: 'medals',
    short_desc: "View someones medal count. Defaults to yourself if no name is provided.",
    usage: "[discord user]",
    tags: ['DM_OPTIONAL'],
    fn: (m, args) => {
        if (args[0]) {
            TOOLS.getTargetUser(m, args[0], (userid, name) => {
                if (userid) {
                    if (userid === m.author.id) {
                        log('search medals for self', 'trace');
                        final(m.author.id);
                    } else {
                        log('search medals for another user', 'trace');
                        final(userid, name);
                    }
                } else {
                    log('failed to find user, search medals for self', 'trace');
                    final(m.author.id);
                }
            });
        } else {
            log('search medals for self', 'trace');
            final(m.author.id);
        }

        function final(userid, name) {
            TOOLS.getProfile(m, userid, (profile) => {
                let embed = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFile(new discord.Attachment(memory.bot.icons.get('opti_medal.png'), "icon.png"))

                if (profile.medals) {
                    embed.setAuthor(`${(name) ? name+' has' : 'You have' } earned ${profile.medals.count} medal(s).`, 'attachment://icon.png')
                    m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                } else {
                    embed.setAuthor(`${(name) ? name+' has' : 'You have' } not earned any medals.`, 'attachment://icon.png')
                    m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                }
            });
        }
        
    }
}));

CMD.register(new Command({
    trigger: 'rule',
    short_desc: "Display a single rule.",
    usage: '<rule #>',
    tags: ['DM_OPTIONAL'],
    fn: (m, args) => {
        if (!args[0]) {
            TOOLS.errorHandler({ err: "You must specify a rule to display.", m:m });
        } else
        if (isNaN(args[0])) {
            TOOLS.errorHandler({ err: "You must specify a valid number.", m:m });
        } else {
            bot.guilds.get(cfg.basic.of_server).channels.get('479192475727167488').fetchMessage('621909657858080779').then((msg) => {
                let rules_rgx = msg.content.match(/\d\).+$/gmi);

                let rules = {}
                rules_rgx.forEach(rule => {
                    let split = rule.split(') ');
                    rules[parseInt(split[0])] = split[1];
                });

                if (rules[parseInt(args[0])]) {
                    let embed = new discord.RichEmbed()
                        .setColor(cfg.vs.embed.default)
                        .attachFile(new discord.Attachment(memory.bot.icons.get('opti_docs.png'), "icon.png"))
                        .setAuthor("Rule #"+parseInt(args[0]), 'attachment://icon.png')
                        .setDescription(rules[parseInt(args[0])]);

                        m.channel.send({embed:embed}).then(msg2 => { TOOLS.messageFinalize(m.author.id, msg2) });
                } else {
                    let joke;
                    if (parseInt(args[0]) < 0) {
                        joke = '.tsixe ton seod elur tahT';
                    } else
                    if (parseInt(args[0]) === 0) {
                        joke = 'undefined';
                    } else
                    if (args[0] === '007') {
                        joke = 'No, Mr. Bond, I expect you to die.';
                    } else
                    if (parseInt(args[0]) === 32) {
                        joke = '2,147,483,647';
                    } else
                    if (parseInt(args[0]) === 34) {
                        joke = 'Hilarious.';
                    } else
                    if (parseInt(args[0]) === 42) {
                        joke = 'The answer to life, the universe, and everything.';
                    } else
                    if (parseInt(args[0]) === 64) {
                        joke = 'YAHOOOOOOOOOOooo';
                    } else
                    if (parseInt(args[0]) === 69) {
                        joke = 'nice';
                    } else
                    if (parseInt(args[0]) === 88) {
                        joke = '88 MILES PER HOOOUURR';
                    } else
                    if (parseInt(args[0]) === 115) {
                        joke = "🎵 I'll bring you down all on my own 🎵";
                    } else
                    if (parseInt(args[0]) === 173) {
                        joke = '[REDACTED]';
                    } else
                    if (parseInt(args[0]) === 314) {
                        joke = Math.PI+'...';
                    } else
                    if (parseInt(args[0]) === 418) {
                        joke = "You better not put on Stal.";
                    } else
                    if (parseInt(args[0]) === 420) {
                        joke = 'DUDE WEED LMAO';
                    } else
                    if (parseInt(args[0]) === 523) {
                        joke = 'Happy birthday, Jack!';
                    } else
                    if (parseInt(args[0]) === 614) {
                        joke = '🙂';
                    } else
                    if (parseInt(args[0]) === 666) {
                        joke = 'Rip and tear, until it is done.';
                    } else
                    if (parseInt(args[0]) === 1337) {
                        joke = '7h47 rul3 d035 n07 3x157.';
                    } else
                    if (parseInt(args[0]) === 1701) {
                        joke = 'These are the voyages of the starship Enterprise...';
                    } else
                    if (parseInt(args[0]) === 1944) {
                        joke = 'ALLIES ARE TURNING THE WAR!';
                    } else
                    if (parseInt(args[0]) === 1962) {
                        joke = 'We choose to go to the moon in this decade and do the other things.';
                    } else
                    if (parseInt(args[0]) === 2000) {
                        joke = "Here's to another lousy millennium.";
                    } else
                    if (parseInt(args[0]) === 9001) {
                        joke = 'This joke died 10 years ago.';
                    } else 
                    if (parseInt(args[0]) === 80085) {
                        joke = 'Hilarious.';
                    } else
                    if (parseInt(args[0]) === 299792458) {
                        joke = "You just googled the speed of light, didn't you?";
                    } else 
                    if (parseInt(args[0]) > Number.MAX_SAFE_INTEGER) {
                        joke = 'https://stackoverflow.com/';
                    } else {
                        joke = 'That rule does not exist.';
                    }
                    TOOLS.errorHandler({ err: joke, m:m });
                }
            }).catch(err => {
                TOOLS.errorHandler({ err: err, m:m });
            });
        }
    }
}));

CMD.register(new Command({
    trigger: 'help',
    short_desc: `Getting started with OptiBot. (type \`${memory.bot.trigger}help help\` to learn how to use command arguments)`,
    long_desc: `Some commands *may* require additional details to tell the bot exactly how you want a command to be carried out. These details are called "arguments". \n\n\`<required>\` - Arguments in angle brackets are REQUIRED. The command cannot be used without this additional information.\n\n\`[optional]\` - Arguments in square brackets are optional. They can be freely omitted.\n\n\`<"literal phrase">\` - Arguments with quotation marks are literal. To use these, you simply type the specified word within the quotation marks.\n\n\`[match?]\` - Arguments that end with a question mark use string similarity, which makes the bot try to match your typed phrase with a set of options. Think of it as using a search engine, like Google.\n\n\`<this|or that>\` - Arguments with a vertical bar mean you can specify either one thing or the other. The bar can be simply translated to "or".\n\n\`[optional <required>]\` - Occasionally, arguments can be combined. In this example, the first argument is optional. However, specifying that argument means you MUST specify the second argument.`,
    usage: "[command]",
    image: 'args.png',
    tags: ['BOT_CHANNEL_ONLY', 'DM_OPTIONAL'],
    fn: (m, args, member, misc) => {
        if (!args[0]) {
            // default help page
            let embed = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFiles([new discord.Attachment(memory.bot.icons.get('opti_info.png'), "icon.png"), new discord.Attachment(memory.bot.avatar, "thumbnail.png")])
                .setAuthor('Getting Started', 'attachment://icon.png')
                .setDescription(`OptiBot is a Discord bot primarily designed for utility. Whether it's moderation tools, or something to help you make a resource pack, you can probably find it here. (see \`!about\` for more info about OptiBot itself)`)
                .setThumbnail('attachment://thumbnail.png')
                .addField('Commands List', `\`\`\`${memory.bot.trigger}list\`\`\``)
                .addField('Assistant Functions', `\`\`\`${memory.bot.trigger}assist\`\`\``)
                

            m.channel.send({ embed: embed }).then(msg => TOOLS.messageFinalize(m.author.id, msg));
        } else {
            // looking for info on command
            CMD.get(args[0], (cmd) => {
                if (!cmd || (cmd.getMetadata().tags['DEVELOPER_ONLY'] && !misc.isSuper)) {
                    TOOLS.errorHandler({ err: "That command does not exist.", m: m });
                } else
                if (cmd.getMetadata().tags['MODERATOR_ONLY'] && !(misc.isAdmin || misc.isSuper)) {
                    TOOLS.errorHandler({ err: "You do not have permission to view this command.", m: m });
                } else {
                    let md = cmd.getMetadata();
                    let files = [new discord.Attachment(memory.bot.icons.get('opti_info.png'), "icon.png")];
                    let embed = new discord.RichEmbed()
                        .setColor(cfg.vs.embed.default)
                        .setDescription(md.long_desc+`\n\`\`\`${md.usage}\`\`\``)

                    // todo: maybe move most of this to class command constructor
                    // this should be done since a lot of these same calculations are being made for !list

                    let role_restriction = `<:unlocked:642112465240588338> This command can be used by all members.`;
                    let usage = `<:okay:642112445997121536> This command can be used in any channel, including DMs (Direct Messages)`;
                        

                    if (md.tags['NO_DM']) {
                        if(md.tags['BOT_CHANNEL_ONLY']) {
                            usage = `<:error:642112426162126873> This command can *only* be used in the <#626843115650547743> channel.`;
                        } else {
                            usage = `<:warn:642112437218443297> This command can be used in any channel, but *not* in DMs (Direct Messages)`;
                        }
                    } else
                    if (md.tags['DM_ONLY']) {
                        usage = `<:error:642112426162126873> This command can *only* be used in DMs (Direct Messages)`;
                    } else
                    if (md.tags['BOT_CHANNEL_ONLY']) {
                        usage = `<:warn:642112437218443297> This command can *only* be used in DMs (Direct Messages) or the <#626843115650547743> channel.`;
                    } else
                    if (md.tags['MOD_CHANNEL_ONLY']) {
                        if(md.tags['NO_DM']) {
                            usage = `<:error:642112426162126873> This command can *only* be used in moderator-only channels.`;
                        } else {
                            usage = `<:error:642112426162126873> This command can *only* be used in DMs (Direct Messages) or any moderator-only channel.`;
                        }
                    }

                    if (md.tags['MODERATOR_ONLY']) {
                        if(md.tags['NO_JR_MOD']) {
                            role_restriction = '<:locked:642112455333511178> This command can *only* be used by **Senior Moderators & Administrators.**';
                        } else {
                            role_restriction = '<:locked:642112455333511178> This command can *only* be used by **Moderators & Administrators.**';
                        }
                    } else
                    if (md.tags['DEVELOPER_ONLY']) {
                        role_restriction = `<:locked:642112455333511178> This command can *only* be used by OptiBot developers.`;
                    }

                    embed.addField('Usage Restrictions', role_restriction+'\n'+usage);

                    if (md.image) {
                        files.push(new discord.Attachment(memory.bot.images.get(md.image), "thumbnail.png"));
                        embed.attachFiles(files)
                            .setAuthor('OptiBot Command: ' + memory.bot.trigger + md.trigger, 'attachment://icon.png')
                            .setThumbnail('attachment://thumbnail.png');
                    } else {
                        embed.attachFiles(files)
                            .setAuthor('OptiBot Command: ' + memory.bot.trigger + md.trigger, 'attachment://icon.png');
                    }

                    m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                }
            });
        }
    }
}));

CMD.register(new Command({
    trigger: 'list',
    short_desc: 'List OptiBot commands.',
    long_desc: `Lists OptiBot commands, including a short description for each.\n\n"Special" pages can be specified before or after the page number. It works either way. For example, if you're a moderator, you can list Moderator-only commands by typing "mod" or "admin".`,
    usage: "[page # [special] | special [page #]]",
    tags: ['BOT_CHANNEL_ONLY', 'DM_OPTIONAL'],
    fn: (m, args, member, misc) => {
        CMD.getAll((list) => {
            let filtered;
            let selectPage = 1;
            let menu;

            if (args[0] && isNaN(args[0])) {
                if ((args[0].toLowerCase() === 'admin' || args[0].toLowerCase() === 'mod') && misc.isAdmin) {
                    menu = 'admin'
                } else
                if (args[0].toLowerCase() === 'sudo' && misc.isSuper) {
                    menu = 'sudo'
                } else
                if (args[0].toLowerCase() === 'all' && misc.isSuper) {
                    menu = 'all'
                }
            } else 
            if (args[1] && isNaN(args[1])) {
                if ((args[1].toLowerCase() === 'admin' || args[1].toLowerCase() === 'mod') && misc.isAdmin) {
                    menu = 'admin'
                } else
                if (args[1].toLowerCase() === 'sudo' && misc.isSuper) {
                    menu = 'sudo'
                } else
                if (args[1].toLowerCase() === 'all' && misc.isSuper) {
                    menu = 'all'
                }
            }

            if(args[0] && !isNaN(args[0])) {
                selectPage = parseInt(args[0]);
            } else
            if(args[1] && !isNaN(args[1])) {
                selectPage = parseInt(args[1]);
            }

            if (menu === 'sudo') {
                filtered = list.filter((cmd) => (cmd.getMetadata().tags['DEVELOPER_ONLY'] === true));
            } else
            if (menu === 'admin') {
                filtered = list.filter((cmd) => (cmd.getMetadata().tags['MODERATOR_ONLY'] === true && cmd.getMetadata().tags['DEVELOPER_ONLY'] === false));
            } else 
            if (menu === 'all') {
                filtered = list
            } else {
                filtered = list.filter((cmd) => (cmd.getMetadata().tags['MODERATOR_ONLY'] === false && cmd.getMetadata().tags['DEVELOPER_ONLY'] === false));
            }

            let pageNum = 1
            let pageLimit = Math.ceil(filtered.length / 10);
            if (selectPage > 0 && selectPage <= pageLimit) {
                pageNum = selectPage;
            }

            let special_text = ""

            if (menu === 'sudo') {
                special_text = 'Special menu: Developers\n\n';
            } else 
            if (menu === 'admin') {
                special_text = 'Special menu: Administration/Moderation\n\n';
            } else
            if (menu === 'all') {
                special_text = 'Special menu: **Literally Everything**\n\n';
            }

            let embed = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFile(new discord.Attachment(memory.bot.icons.get('opti_docs.png'), "icon.png"))
                .setAuthor(`OptiBot Commands List | Page ${pageNum}/${pageLimit}`, 'attachment://icon.png')
                .setDescription(`${special_text} Hover over the tooltip icons \([\[\\❔\]](${m.url.replace(/\/\d+$/, '')} "No easter eggs here... 👀")\) or use \`${memory.bot.trigger}help <command>\` for detailed information.`)
                .setFooter(`Viewing ${filtered.length} commands, out of ${list.length} total. Many commands may be hidden based on your permissions.`);
            
                let i = (pageNum > 1) ? (10 * (pageNum - 1)) : 0;
                let added = 0;
                (function addList() {
    
                    let cmd = filtered[i].getMetadata();
                    let hover_text = [];

                    if(cmd.hover_desc) {
                        hover_text.push(cmd.hover_desc);
                    } else 
                    if(cmd.long_desc.length > 325) {
                        hover_text.push(`This description is too long to show here. Type "${memory.bot.trigger}help ${cmd.trigger}" for full details.`);
                    } else {
                        hover_text.push(cmd.long_desc);
                    }

                    hover_text.push(`\nUsage: ${cmd.usage}`);

                    if (cmd.tags['MODERATOR_ONLY']) {
                        if(cmd.tags['NO_JR_MOD']) {
                            hover_text.push('\n🔒 This command can *only* be used by Senior Moderators & Administrators.');
                        } else {
                            hover_text.push('\n🔒 This command can *only* be used by Moderators & Administrators.');
                        }
                    } else
                    if (cmd.tags['DEVELOPER_ONLY']) {
                        hover_text.push(`\n🔒 This command can *only* be used by OptiBot developers.`);
                    } else {
                        hover_text.push(`\n🔓 This command can be used by all members.`);
                    }

                    if (cmd.tags['NO_DM']) {
                        if(cmd.tags['BOT_CHANNEL_ONLY']) {
                            hover_text.push(`❌ This command can *only* be used in the #optibot channel.`)
                        } else {
                            hover_text.push(`⚠ This command can be used in any channel, but *not* in DMs (Direct Messages)`)
                        }
                    } else
                    if (cmd.tags['DM_ONLY']) {
                        hover_text.push(`❌ This command can *only* be used in DMs (Direct Messages)`)
                    } else
                    if (cmd.tags['BOT_CHANNEL_ONLY']) {
                        hover_text.push(`⚠ This command can *only* be used in DMs (Direct Messages) or the #optibot channel.`)
                    } else
                    if (cmd.tags['MOD_CHANNEL_ONLY']) {
                        if(cmd.tags['NO_DM']) {
                            hover_text.push(`❌ This command can *only* be used in moderator-only channels.`)
                        } else {
                            hover_text.push(`❌ This command can *only* be used in DMs (Direct Messages) or any moderator-only channel.`)
                        }
                    } else {
                        hover_text.push(`☑ This command can be used in any channel, including DMs (Direct Messages)`)
                    }
    
                    embed.addField(memory.bot.trigger+cmd.trigger, `${cmd.short_desc} [\[\\❔\]](${m.url.replace(/\/\d+$/, '')} "${hover_text.join('\n')}")`);
                    added++;
                    
                    if (added >= 10 || i+1 >= filtered.length) {
                        m.channel.send({embed: embed}).then(msg => TOOLS.messageFinalize(m.author.id, msg));
                    } else {
                        i++;
                        addList();
                    }
                })();
        });
    }
}));

CMD.register(new Command({
    trigger: 'json',
    short_desc: 'Simple JSON Validator.',
    long_desc: "Checks if a file is written with valid JSON syntax. Discord CDN links only.",
    usage: "<attachment|URL|^ shortcut>",
    tags: ['DM_OPTIONAL'],
    fn: (m, args) => {
        if (args[0]) {
            if (args[0] === '^' || args[0].toLowerCase() === 'that') {
                m.channel.fetchMessages({ limit: 25 }).then(msgs => {
                    let itr = msgs.values();
        
                    (function search() {
                        let thisID = itr.next();
                        if (thisID.done) {
                            TOOLS.errorHandler({ m: m, err: `Could not find an attachment to validate.` });
                        } else
                        if ([m.author.id, bot.user.id].indexOf(thisID.value.author.id) === -1) {
                            if (thisID.value.attachments.first(1)[0] !== undefined) {
                                finalValidate(thisID.value.attachments.first(1)[0].url)
                            } else {
                                TOOLS.errorHandler({ err: 'That message does not contain an attachment.', m: m });
                            }
                        } else search();
                    })();
                }).catch(err => TOOLS.errorHandler({ m: m, err: err }));
            } else {
                try {
                    let parseurl = new URL(args[0]);
    
                    if (parseurl.hostname === 'cdn.discordapp.com') {
                        finalValidate(parseurl.toString())
                    } else {
                        TOOLS.errorHandler({ err: 'Links outside of cdn.discordapp.com are not allowed.', m: m });
                    }
                }
                catch(e) {
                    TOOLS.errorHandler({ err: 'You must specify a valid link or upload a file attachment.', m: m });
                }
            }
        } else
        if (m.attachments.first(1)[0]) {
            finalValidate(m.attachments.first(1)[0].url)
        } else {
            TOOLS.errorHandler({ err: 'You must upload or link a file attachment to validate.', m: m });
        }

        function finalValidate(finalURL) {
            request({ url: finalURL, headers: { 'User-Agent': 'optibot' } }, (err, res, body) => {
                if (err || !res || !body || res.statusCode !== 200) {
                    TOOLS.errorHandler({ err: err || new Error('Unable to retrieve file from Discord API.'), m: m });
                } else {
                    if (body.length > 1048576) {
                        TOOLS.errorHandler({ err: 'File cannot exceed 1MB in size.', m: m });
                        return;
                    } 
                    const fileContent = body.toString('utf8', 0, Math.min(body.length, 0 + 24));
                    for (let i = 0; i < fileContent.length; ++i) {
                        const charCode = fileContent.charCodeAt(i);
                        if (charCode === 65533 || charCode <= 8) {
                            // binary
                            TOOLS.errorHandler({ err: 'File must be text-only.', m: m });
                            break;
                        }
    
                        if (i + 1 === fileContent.length) {
                            // text
                            try {
                                let validate = JSON.parse(body);
    
                                let embed = new discord.RichEmbed()
                                    .setColor(cfg.vs.embed.okay)
                                    .attachFile(new discord.Attachment(memory.bot.icons.get('opti_okay.png'), "thumbnail.png"))
                                    .setAuthor('Valid JSON', 'attachment://thumbnail.png')
                                    .setDescription(`Your file has valid JSON formatting. This does not necessarily mean your file will work for it's intended purpose, however. Be sure to check the documentation on whatever you're using this for.`)
    
                                m.channel.send({ embed: embed }).then(msg => {
                                    TOOLS.messageFinalize(m.author.id, msg)
                                }).catch(err => {
                                    TOOLS.errorHandler({ err: err, m: m });
                                });
                            }
                            catch (err) {
                                let errMsg = err.toString().split(' ');
                                let positionText = errMsg.indexOf('position');

                                if(positionText === -1) {
                                    TOOLS.errorHandler({ err: err, m: m });
                                } else {
                                    let position = parseInt(errMsg[positionText+1]);
                                    let bodyCut = body.substring(0, position);
                                    let lineSplits = bodyCut.split('\n');
                                    log(position);
                                    log(bodyCut);

                                    let index_invalid = errMsg.indexOf('token')+1;
                                    errMsg[index_invalid] = `"${errMsg[index_invalid]}"`;

                                    let embed = new discord.RichEmbed()
                                    .setColor(cfg.vs.embed.error)
                                    .attachFile(new discord.Attachment(memory.bot.icons.get('opti_err.png'), "thumbnail.png"))
                                    .setAuthor('Invalid JSON', 'attachment://thumbnail.png')
                                    .setDescription(`\`\`\`${errMsg.join(' ')} \n\nCalculated position: Ln ${lineSplits.length}, Col ${lineSplits[lineSplits.length-1].length+1}\`\`\` \nNote that this will only return the FIRST error the validator finds. You can use the following website to find all issues at once: https://jsonlint.com/`)
    
                                    m.channel.send({ embed: embed }).then(msg => {
                                        TOOLS.messageFinalize(m.author.id, msg)
                                    }).catch(err => {
                                        TOOLS.errorHandler({ err: err, m: m });
                                    });
                                }
                            }
                        }
                    }
                }
            });
        }
    }
}));

CMD.register(new Command({
    trigger: 'mock',
    short_desc: 'MoCkInG tOnE translator',
    long_desc: 'Rewrites a given message with a mOcKiNg tOnE. In other words, it makes every first character lowercase and every second character uppercase.',
    usage: "<text|^ shortcut>",
    tags: ['DM_OPTIONAL'],
    fn: (m, args) => {
        if (args[0]) {
            let translate = function(message) {
                let newStr = '';

                for(let i = 0; i < message.length; i++) {
                    let thisChar = message.charAt(i);

                    if (i % 2 === 1) {
                        thisChar = thisChar.toUpperCase();
                    } else {
                        thisChar = thisChar.toLowerCase();
                    }

                    newStr += thisChar;

                    if (i+1 === message.length) {
                        TOOLS.typerHandler(m.channel, false);
                        m.channel.send(newStr);
                    }
                }
            }

            if(args[0] === '^') {
                m.channel.fetchMessages({ limit: 25 }).then(msgs => {
                    let itr = msgs.values();
        
                    (function search() {
                        let thisID = itr.next();

                        if (thisID.done) {
                            let embed = new discord.RichEmbed()
                            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_err.png'), "icon.png"))
                            .setColor(cfg.vs.embed.error)
                            .setAuthor(`Could not find a user.`, "attachment://icon.png")
                            .setFooter('Note that this shortcut will skip yourself, and all bots. This includes OptiBot, obviously.');
        
                            m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                        } else
                        if ([m.author.id, bot.user.id].indexOf(thisID.value.author.id) === -1 && !thisID.value.author.bot) {
                            translate(thisID.value.content);
                        } else search();
                    })();
                }).catch(err => TOOLS.errorHandler({ m: m, err: err }));
            } else {
                translate(m.content.substring( (memory.bot.trigger + 'mock ').length ) );
            }
        } else {
            TOOLS.errorHandler({ err: "You must specify a message to translate.", m: m });
        }
    }
}));

CMD.register(new Command({
    trigger: 'dr',
    short_desc: 'Verifies your donator status.',
    long_desc: `Verifies your donator status. If successful, this will grant you the Donator role, and reset your Donator token in the process. \n\nYou can find your donator token by logging in through the website. https://optifine.net/login. Look at the bottom of the page for a string of random characters. (see picture for example) \n**Remember that your "Donation ID" is NOT your token!**\n\nPlease note that this will NOT automatically verify you for the \`${memory.bot.trigger}cape\` command. [See this FAQ entry for instructions on that.](https://discordapp.com/channels/423430686880301056/531622141393764352/622494425616089099)`,
    usage: "<donation e-mail> <token>",
    image: `token.png`,
    tags: ['DM_ONLY', 'DELETE_ON_MISUSE'],
    fn: (m, args, member) => {
        if (member.roles.has(cfg.roles.donator)) {
            TOOLS.errorHandler({ err: "You already have the donator role.", m: m });
        } else
        if (!args[0]) {
            TOOLS.errorHandler({ err: "You must provide the e-mail you used when donating.", m: m});
        } else
        if (args[0].indexOf('@') < 0 && args[0].indexOf('.') < 0) {
            TOOLS.errorHandler({ err: "You must provide a valid e-mail address.", m: m });
        } else
        if (!args[1]) {
            TOOLS.errorHandler({ err: "You must provide your donator token.", m: m });
        } else {
            request({ url: 'https://optifine.net/validateToken?e=' + encodeURIComponent(args[0]) + '&t=' + encodeURIComponent(args[1]), headers: { 'User-Agent': 'optibot' } }, (err, res, body) => {
                if (err || !res || !body || res.statusCode !== 200) {
                    TOOLS.errorHandler({ err: err || new Error('Failed to get a response from the OptiFine API'), m: m });
                } else 
                if (body === 'true') {
                    member.addRole(cfg.roles.donator, 'Donator status verified.').then(() => {
                        let embed = new discord.RichEmbed()
                            .setColor(cfg.vs.embed.okay)
                            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_okay.png'), "icon.png"))
                            .setAuthor('Thank you for your contribution! Your donator role has been granted.', 'attachment://icon.png')
                            .setFooter('Please note, your token has now been renewed.');

                        TOOLS.typerHandler(m.channel, false);
                        m.channel.send({ embed: embed });
                    }).catch(err => TOOLS.errorHandler({ err: err, m: m }));
                } else {
                    TOOLS.errorHandler({ err: 'Invalid credentials. Please be sure that your token and email are the same as what you see on https://optifine.net/login', m: m });
                }
            });
        }
    }
}));

CMD.register(new Command({
    trigger: 'exec',
    usage: "<js>",
    fn: (m, args, member) => {
        // args and member arent used in this by default, but given this commands purpose, it just makes sense to have them available anyway.
        try {
            let debug;
            let evaluation = eval(m.content.substring(5));

            bot.setTimeout(() => {
                let returnMsg = (debug) ? debug : evaluation;
                let cb_lang = (typeof returnMsg === 'string') ? "" : "javascript";
                let msg = `\`\`\`${cb_lang + '\n' + returnMsg}\`\`\``;

                let file_encoding;

                if (typeof returnMsg === 'string') file_encoding = 'txt';
                else if (typeof returnMsg === 'function' || typeof returnMsg === 'undefined') file_encoding = 'js';
                else file_encoding = 'json';



                try {
                    msg = `\`\`\`${cb_lang + '\n'}${(typeof returnMsg === 'string') ? returnMsg : JSON.stringify(returnMsg, null, 4)}\`\`\``;
                } catch (e) { }

                if (Buffer.isBuffer(returnMsg)) {
                    TOOLS.typerHandler(m.channel, false);
                    m.channel.send(undefined, new discord.Attachment(returnMsg, 'buffer.png'));
                } else 
                if (msg.length >= 2000) {
                    log(returnMsg, 'warn');
                    TOOLS.typerHandler(m.channel, false);
                    m.channel.send(`Output too long, see attached file.`, new discord.Attachment(Buffer.from(JSON.stringify(returnMsg)), 'output.json'));
                } else {
                    TOOLS.typerHandler(m.channel, false);
                    m.channel.send(msg);
                }
            }, 1500);
        }
        catch (err) {
            log("Error at eval(): " + err.stack, 'warn');
            let errMsg = `\`\`\`${err.stack}\`\`\``;

            if (errMsg.length >= 2000) {
                TOOLS.typerHandler(m.channel, false);
                m.channel.send('Error occurred during evaluation. (Stack trace too long, see log.)');
            } else {
                TOOLS.typerHandler(m.channel, false);
                m.channel.send(errMsg);
            }
        }
    }
}));

CMD.register(new Command({
    trigger: 'mute',
    short_desc: "Mute a user.",
    long_desc: "Enables text mute for the specified user. Time limit is optional, and will default to 1 hour if not specified. You can also specify the time measure in (m)inutes, (h)ours, and (d)ays. The maximum time limit is 7 days, but can be set to infinity by using 0. Additionally, you can adjust time limits for users by simply running this command again with the desired time.",
    usage: "<discord user> [time limit[time measurement?]] [reason]",
    tags: ['MODERATOR_ONLY', 'NO_DM'],
    fn: (m, args) => {
        if (!args[0]) {
            TOOLS.errorHandler({ m: m, err: `You must specify a user to mute.` });
        } else {
            TOOLS.muteHandler(m, args, true);
        }
    }
}));

CMD.register(new Command({
    trigger: 'unmute',
    short_desc: "Unmute a user.",
    long_desc: "Disables text mute for the specified user.",
    usage: "<discord user>",
    tags: ['MODERATOR_ONLY', 'NO_DM'],
    fn: (m, args) => {
        if (!args[0]) {
            TOOLS.errorHandler({ m: m, err: `You must specify a user to unmute.` });
        } else {
            TOOLS.muteHandler(m, args, false);
        }
    }
}));

CMD.register(new Command({
    trigger: 'cape',
    short_desc: "Donator Cape Viewer",
    long_desc: `Displays donator capes for a specified user. \n\nIf someone has a *verified* cape, you can use their @mention in place of their Minecraft username. Additionally, if no username is provided, this will default to yourself. Finally, you can view the full cape texture by typing "full" after the username.`,
    usage: `[minecraft username OR discord user] ["full"]`,
    tags: ['BOT_CHANNEL_ONLY','DM_OPTIONAL'],
    fn: (m, args) => {
        let target = (args[0]) ? args[0] : m.author.id;

        function getOFcape(result) {
            let username = result.name;
            request({ url: 'https://optifine.net/capes/' + username + '.png', encoding: null }, (err, res, data) => {
                if (err || !res || !data || [200, 404].indexOf(res.statusCode) === -1) {
                    TOOLS.errorHandler({ err: err || new Error('Failed to get a response from the OptiFine API'), m: m });
                } else
                if (res.statusCode === 404) {
                    TOOLS.errorHandler({ err: 'That player does not have an OptiFine cape', m: m });
                } else {
                    jimp.read(data, (err_j, image) => {
                        if (err_j) TOOLS.errorHandler({ err: err, m: m });
                        else {
                            let full = false;
                            let fallback = false;
                            if (args[1] && args[1].toLowerCase() === 'full' && image.bitmap.width <= 92) {
                                full = true;
                                image.resize(276, jimp.AUTO, jimp.RESIZE_NEAREST_NEIGHBOR);
                                finalize(image);
                            } else
                            if(image.bitmap.width > 92) {
                                fallback = true;
                                finalize(image);
                            } else
                            if (jimp.intToRGBA(image.getPixelColor(1, 1)).a !== 0) {
                                // standard capes
                                let elytra = image.clone();
                                let cape = image.clone();

                                cape.crop(1, 1, 10, 16);
                                elytra.crop(36, 2, 10, 20);

                                new jimp(21, 20, (err_s2, image_s2) => {
                                    if (err_s2) TOOLS.errorHandler({ err: err_s2, m: m });
                                    else {
                                        image_s2.composite(cape, 0, 0);
                                        image_s2.composite(elytra, 11, 0);
                                        image_s2.resize(jimp.AUTO, 200, jimp.RESIZE_NEAREST_NEIGHBOR);

                                        finalize(image_s2);
                                    }
                                });
                            } else {
                                // banner capes
                                let elytra = image.clone();
                                let cape = image.clone();

                                cape.crop(2, 2, 20, 32);
                                elytra.crop(72, 4, 20, 40);

                                new jimp(42, 40, (err_s2, image_s2) => {
                                    if (err_s2) TOOLS.errorHandler({ err: err_s2, m: m });
                                    else {
                                        image_s2.composite(cape, 0, 0);
                                        image_s2.composite(elytra, 22, 0);
                                        image_s2.resize(jimp.AUTO, 200, jimp.RESIZE_NEAREST_NEIGHBOR);

                                        finalize(image_s2);
                                    }
                                });
                            }

                            function finalize(image_p) {
                                image_p.getBuffer(jimp.AUTO, (err_b, imgFinal) => {
                                    if (err_b) TOOLS.errorHandler({ err: err_b, m: m });
                                    else {
                                        let embed = new discord.RichEmbed()
                                            .setColor(cfg.vs.embed.default)
                                            .attachFiles([new discord.Attachment(memory.bot.icons.get('opti_cape.png'), "thumbnail.png"), new discord.Attachment(imgFinal, "cape.png")])
                                            .setImage('attachment://cape.png')
                                            .setFooter('IGN: ' + username);

                                        let desc = "";

                                        memory.db.profiles.find({ "cape.uuid": result.id }, (dberr, dbdocs) => {
                                            if (dberr) TOOLS.errorHandler({ err: dberr, m: m });
                                            else {
                                                if (dbdocs.length !== 0) {
                                                    desc += '<:okay:642112445997121536> Cape owned by <@' + dbdocs[0].member_id + '>\n\n';
                                                }
                                                if (fallback && (!args[1] || (args[1] && args[1].toLowerCase() !== 'full'))) {
                                                    desc += `This image could not be cropped because the cape texture has an unusual resolution.`;
                                                }

                                                if (full || fallback) {
                                                    embed.setAuthor('Donator Cape (Full Texture)', 'attachment://thumbnail.png');
                                                } else {
                                                    embed.setAuthor('Donator Cape', 'attachment://thumbnail.png');
                                                }

                                                if (desc.length > 0) {
                                                    embed.setDescription(desc);
                                                }

                                                m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                                            }
                                        });
                                    }
                                });
                            }
                        }
                    });
                }
            });
        }

        TOOLS.getTargetUser(m, target, (userid, name) => {
            if (userid) {
                TOOLS.getProfile(m, userid, (profile) => {
                    if (!profile.cape) {
                        if(userid === m.author.id) {
                            let embed = new discord.RichEmbed()
                            .setColor(cfg.vs.embed.error)
                            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_err.png'), "thumbnail.png"))
                            .setAuthor('You must specify a Minecraft username, @mention, or Discord user ID.', 'attachment://thumbnail.png')
                            .setDescription(`If you're a donator and you're trying to view your own cape, enter your Minecraft username or [get your cape verified.](https://discordapp.com/channels/423430686880301056/531622141393764352/622494425616089099)`);
                            

                        m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                        } else {
                            TOOLS.errorHandler({ err: `${name} does not have a verified donator cape.`, m: m });
                        }
                    } else {
                        request({ url: 'https://api.mojang.com/user/profiles/' + profile.cape.uuid + '/names', encoding: null }, (err, res, data) => {
                            if (err || !res || !data || [200, 204].indexOf(res.statusCode) === -1) {
                                TOOLS.errorHandler({ err: err || new Error('Failed to get a response from the Mojang API'), m: m });
                            } else
                            if (res.statusCode === 204) {
                                TOOLS.errorHandler({ err: new Error('Unable to get Minecraft UUID of that user.'), m: m });
                            } else {
                                let dp = JSON.parse(data);
                                let dataNormalized = {
                                    name: dp[dp.length - 1]["name"],
                                    id: profile.cape.uuid
                                }
                                getOFcape(dataNormalized);
                            }
                        });
                    }
                });
            } else
            if (target.match(/\W+/) !== null) {
                TOOLS.errorHandler({ err: 'Minecraft usernames can only contain upper/lowercase letters, numbers, and underscores (_)', m: m });
            } else
            if (target.length > 16) {
                TOOLS.errorHandler({ err: 'Minecraft usernames cannot exceed 16 characters in length.', m: m });
            } else {
                request({ url: 'https://api.mojang.com/users/profiles/minecraft/' + target, encoding: null }, (err, res, data) => {
                    if (err || !res || !data || [200, 204].indexOf(res.statusCode) === -1) {
                        TOOLS.errorHandler({ err: err || new Error('Failed to get a response from the Mojang API'), m: m });
                    } else
                    if (res.statusCode === 204) {
                        let embed = new discord.RichEmbed()
                            .setColor(cfg.vs.embed.error)
                            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_err.png'), "thumbnail.png"))
                            .setAuthor('That player does not exist.', 'attachment://thumbnail.png')
                            .setFooter('Maybe check your spelling?');

                        m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                    } else {
                        getOFcape(JSON.parse(data));
                    }
                });
            }
        });
    }
}));

CMD.register(new Command({
    trigger: 'role',
    short_desc: "Toggle roles for users.",
    long_desc: "Gives or removes roles for the specified user. OptiBot uses string similarity for roles, so typos and capitalization don't matter.",
    usage: "<discord user> <role?>",
    tags: ['MODERATOR_ONLY', 'NO_DM'],
    fn: (m, args) => {
        if (!args[0]) {
            TOOLS.errorHandler({err: "Please specify the user to give a role to.", m:m});
        } else {
            TOOLS.getTargetUser(m, args[0], (userid) => {
                if (!userid) TOOLS.errorHandler({err: "You must specify a valid user @mention, ID, or last user shortcut (^)", m:m});
                else if (!args[1]) TOOLS.errorHandler({err: "You must specify a role to give to that user.", m:m});
                else {
                    let role_types = {
                        'shader developer': cfg.roles.shader_dev,
                        'texture artist': cfg.roles.texture_artist,
                        'mod developer': cfg.roles.mod_dev
                    };

                    let role_match = cstr.findBestMatch(m.content.substring(memory.bot.trigger.length+5+args[0].length+1).toLowerCase(), Object.keys(role_types));
                    let selected_role = role_types[role_match.bestMatch.target];

                    log(role_match.bestMatch.rating)

                    if (role_match.bestMatch.rating < 0.2) {
                        TOOLS.errorHandler({err: "What kind of role is that?", m:m});
                        return;
                    }

                    bot.guilds.get(cfg.basic.of_server).fetchMember(userid).then(member => {
                        if (member.id === m.author.id) {
                            TOOLS.errorHandler({err: "Nice try.", m:m});
                        } else
                        if (cfg.superusers.indexOf(member.user.id) > -1 || member.permissions.has("KICK_MEMBERS", true)) {
                            TOOLS.errorHandler({err: "You're not strong enough to manage that user.", m:m});
                        } else {
                            if (!member.roles.has(selected_role)) {
                                member.addRole(selected_role, `Role granted by ${m.author.username}#${m.author.discriminator}`).then(() => {
                                    let embed = new discord.RichEmbed()
                                    .setColor(cfg.vs.embed.okay)
                                    .attachFile(new discord.Attachment(memory.bot.icons.get('opti_okay.png'), "icon.png"))
                                    .setAuthor(`Successfully granted role "${role_match.bestMatch.target}" to ${member.user.username}#${member.user.discriminator}`, 'attachment://icon.png')

                                    m.channel.send({embed: embed}).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                                });
                            } else {
                                member.removeRole(selected_role, `Role removed by ${m.author.username}#${m.author.discriminator}`).then(() => {
                                    let embed = new discord.RichEmbed()
                                    .setColor(cfg.vs.embed.okay)
                                    .attachFile(new discord.Attachment(memory.bot.icons.get('opti_okay.png'), "icon.png"))
                                    .setAuthor(`Successfully removed role "${role_match.bestMatch.target}" from ${member.user.username}#${member.user.discriminator}`, 'attachment://icon.png')

                                    m.channel.send({embed: embed}).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                                });
                            }
                        }
                    }).catch(err => TOOLS.errorHandler({err: err, m:m}));
                }
            })
        }
    }
}));

CMD.register(new Command({
    trigger: 'google',
    short_desc: 'Let me Google that for you.',
    usage: '<query>',
    tags: ['DM_OPTIONAL'],
    fn: (m, args) => {
        if (!args[0]) {
            var embed = new discord.RichEmbed()
            .setColor(cfg.vs.embed.error)
            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_search_error.png'), "thumbnail.png"))
            .setAuthor('An Incredibly Convenient Search Tool', 'attachment://thumbnail.png')
            .setDescription('[All your questions will be answered if you just click this link.](http://lmgtfy.com/?q='+encodeURIComponent('how to use discord bots')+'&s=g)')

            m.channel.send({embed: embed}).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
        } else {
            var embed = new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_search.png'), "thumbnail.png"))
            .setAuthor('An Incredibly Convenient Search Tool', 'attachment://thumbnail.png')
            .setDescription('[All your questions will be answered if you just click this link.](http://lmgtfy.com/?q='+encodeURIComponent(m.content.substr(8))+'&s=g)')

            m.channel.send({embed: embed}).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
        }
    }
}));

CMD.register(new Command({
    trigger: 'modmail',
    short_desc: `Message moderators directly and privately.`,
    long_desc: `Sends a message directly to a private channel for only moderators to read. Messages must have a minimum length of 32 characters, and a maximum length of 1024.`,
    usage: `<message>`,
    tags: ['DM_ONLY'],
    fn: (m, args) => {
        // could maybe delete messages when used in server chat, but also try sending the existing message to the users DM to avoid having to retype everything
        let modmail = m.content.substring( (`${memory.bot.trigger}modmail `).length );
        let modmail_ver = 2;
        if(!args[0]) {
            TOOLS.errorHandler({err: "You must specify a message to send.", m:m});
        } else
        if(modmail.length < 32) {
            TOOLS.errorHandler({err: "Messages must be at least 32 characters in length.", m:m});
        } else
        if(modmail.length > 1024) {
            TOOLS.errorHandler({err: "Messages cannot exceed 1024 characters in length.", m:m});
        } else {
            TOOLS.getProfile(m, m.author.id, (profile) => {
                if(!profile.modmail || profile.modmail === true || (typeof profile.modmail === 'object' && profile.modmail.constructor === Object && (profile.modmail.version < modmail_ver || profile.modmail.accepted === false)) ) {
                    let desc = `**__Please read this information to completion.__ This is your first time using this command, so you will only have to read this once.**`;

                    if(profile.modmail === true || (typeof profile.modmail === 'object' && profile.modmail.constructor === Object && profile.modmail.version < modmail_ver)) {
                        desc = `**__Please read this information to completion.__ This information has been updated since the last time you used this command.**`;
                    } else
                    if (typeof profile.modmail === 'object' && profile.modmail.constructor === Object && profile.modmail.accepted === false) {
                        desc = `**__Please read this information to completion.__ You must confirm that you've read the following before you can send your message.**`;
                    }

                    let warning = new discord.RichEmbed()
                    .setColor(cfg.vs.embed.default)
                    .attachFile(new discord.Attachment(memory.bot.icons.get('opti_warn.png'), "icon.png"))
                    .setAuthor(`Important Notice`, 'attachment://icon.png')
                    .setDescription(desc)
                    .addField('What is this?', `This command allows you to send messages directly to server moderators in the privacy of your DMs. We've created this function to allow users to still be able to contact us, even when we have our DMs disabled or we're ignoring random friend requests.`)
                    .addField(`How it works`, `Upon submitting your message, OptiBot will take your text and send it directly to a private channel where only us server moderators can view it. Here, we can see your message and your username, much like a regular DM. (Or more accurately, a group DM.) \n\nFrom here, one of the moderators will "take your case" and attempt to respond by sending you a DM or friend request.`)
                    .addField('Misuse, Spam, and Abuse', `To be absolutely clear: __**This is not an invitation to freely message us about literally anything.**__ This command is designed for users to privately contact us for safety concerns, reports, and other genuinely important matters. Using this command to ask about donation/cape-related issues, request technical support, and to otherwise purposefully send us spam and nonsense **will result in an immediate ban.**`)
                    .addField(`With all that said...`, `Type \`${memory.bot.trigger}confirm\` to confirm that you've read and understood these terms.\nType \`${memory.bot.trigger}cancel\` or simply ignore this message to cancel.`)

                    profile.modmail = {
                        version: modmail_ver,
                        accepted: false,
                    }

                    memory.db.profiles.update({member_id: profile.member_id}, profile, {}, (err) => {
                        if(err) {
                            TOOLS.errorHandler({err: err, m:m});
                        } else {
                            m.channel.send({embed: warning}).then(msg => {
                                TOOLS.typerHandler(m.channel, false);
                                TOOLS.confirmationHandler(m, (result) => {
                                    if (result === 1) {
                                        profile.modmail.accepted = true;
                                        memory.db.profiles.update({member_id: profile.member_id}, profile, {}, (err) => {
                                            if(err) {
                                                TOOLS.errorHandler({err: err, m:m});
                                            } else {
                                                confirmSend();
                                            }
                                        });
                                    } else
                                    if (result === 0) {
                                        let embed = new discord.RichEmbed()
                                        .setColor(cfg.vs.embed.default)
                                        .attachFile(new discord.Attachment(memory.bot.icons.get('opti_wait.png'), "icon.png"))
                                        .setAuthor(`Request cancelled.`, 'attachment://icon.png')
                                        .setDescription(`Your message has not been sent. You must confirm that you've read and understood the terms.`)
            
                                        m.channel.send({embed: embed}).then(msg2 => { TOOLS.messageFinalize(m.author.id, msg2) });
                                    } else
                                    if (result === -1) {
                                        let embed = new discord.RichEmbed()
                                        .setColor(cfg.vs.embed.default)
                                        .attachFile(new discord.Attachment(memory.bot.icons.get('opti_wait.png'), "icon.png"))
                                        .setAuthor(`Request timed out.`, 'attachment://icon.png')
                                        .setDescription(`Your message has not been sent. You must confirm that you've read and understood the terms.`)
                                        
                                        m.channel.send({embed: embed}).then(msg2 => { TOOLS.messageFinalize(m.author.id, msg2) });
                                    }
                                });
                            });
                        }
                    });
                } else {
                    confirmSend();
                }
            });

            function confirmSend() {
                let confirm = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFile(new discord.Attachment(memory.bot.icons.get('opti_warn.png'), "icon.png"))
                .setAuthor(`Are you sure want to send this message?`, 'attachment://icon.png')
                .setDescription(`This action cannot be undone. \n\nType \`${memory.bot.trigger}confirm\` to continue.\nType \`${memory.bot.trigger}cancel\` or simply ignore this message to cancel.`)
                .addField('The following message will be sent:', modmail);

                m.channel.send({embed: confirm}).then(msg => {
                    TOOLS.typerHandler(m.channel, false);
                    TOOLS.confirmationHandler(m, (result) => {
                        if (result === 1) {
                            let mm_message = new discord.RichEmbed()
                            .setColor(cfg.vs.embed.default)
                            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_mail.png'), "icon.png"))
                            .setAuthor(`You've got mail!`, 'attachment://icon.png')
                            .setDescription(`New message from ${m.author} (${m.author.username}#${m.author.discriminator})`)
                            .setThumbnail(m.author.displayAvatarURL)
                            .addField(`Message Contents`, modmail)
                            .setFooter(`Author User ID: ${m.author.id}`)


                            bot.guilds.get(cfg.basic.of_server).channels.get('467073441904984074').send({embed: mm_message}).then(() => {
                                let embed = new discord.RichEmbed()
                                .setColor(cfg.vs.embed.okay)
                                .attachFile(new discord.Attachment(memory.bot.icons.get('opti_okay.png'), "icon.png"))
                                .setAuthor(`Message sent.`, 'attachment://icon.png');
                                
                                m.channel.send({embed: embed}).then(msg2 => { TOOLS.messageFinalize(m.author.id, msg2) });
                            }).catch((err) => {
                                TOOLS.errorHandler({err: err, m:m});
                            });
                        } else
                        if (result === 0) {
                            let embed = new discord.RichEmbed()
                            .setColor(cfg.vs.embed.default)
                            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_wait.png'), "icon.png"))
                            .setAuthor(`Request cancelled.`, 'attachment://icon.png')
                            .setDescription('Your message has not been sent.')

                            m.channel.send({embed: embed}).then(msg2 => { TOOLS.messageFinalize(m.author.id, msg2) });
                        } else
                        if (result === -1) {
                            let embed = new discord.RichEmbed()
                            .setColor(cfg.vs.embed.default)
                            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_wait.png'), "icon.png"))
                            .setAuthor(`Request timed out.`, 'attachment://icon.png')
                            .setDescription('Your message has not been sent.')
                            
                            m.channel.send({embed: embed}).then(msg2 => { TOOLS.messageFinalize(m.author.id, msg2) });
                        }
                    });
                });
            }
        }
    }
}));

CMD.register(new Command({
    trigger: 'purge',
    short_desc: 'Delete several messages at once.',
    long_desc: "Delete the last [x amount] messages. Useful for mass spam. \n\nWhen using this command, OptiBot will ask you to CONFIRM your request before proceeding. The bot will retain the position the original command was used at, meaning that messages that happen to be posted while you're confirming the request will be ignored.",
    usage: '<# of messages>',
    tags: ['MODERATOR_ONLY', 'NO_JR_MOD', 'NO_DM'],
    fn: (m, args, member) => {
        if (!args[0]) {
            TOOLS.errorHandler({err: "You must specify how many messages to delete.", m:m});
        } else
        if (isNaN(args[0])) {
            TOOLS.errorHandler({err: "You must specify a valid number.", m:m});
        } else
        if (parseInt(args[0]) > 32 && !(member.permissions.has("ADMINISTRATOR", true))) {
            TOOLS.errorHandler({err: "You can only delete up to 32 messages at once.", m:m});
        } else
        if (parseInt(args[0]) === 1) {
            TOOLS.errorHandler({err: "This is an incredibly inefficient way to delete messages.", m:m});
        } else
        if (parseInt(args[0]) < 1) {
            TOOLS.errorHandler({err: "How... and why?", m:m});
        } else {
            let amount = Math.round(parseInt(args[0]));
            let confirm = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFile(new discord.Attachment(memory.bot.icons.get('opti_warn.png'), "icon.png"))
                .setAuthor(`Are you sure want to remove ${amount} messages?`, 'attachment://icon.png')
                .setDescription(`This action cannot be undone. \n\nType \`${memory.bot.trigger}confirm\` to continue.\nType \`${memory.bot.trigger}cancel\` or simply ignore this message to cancel.`)

            m.channel.send({embed: confirm}).then(msg => {
                TOOLS.typerHandler(m.channel, false);
                TOOLS.confirmationHandler(m, (result) => {
                    if (result === 1) {
                        m.channel.fetchMessages({before: m.id, limit: amount}).then(index_messages=> {
                            m.channel.bulkDelete(index_messages).then(deleted_messages => {
                                let embed = new discord.RichEmbed()
                                .setColor(cfg.vs.embed.okay)
                                .attachFile(new discord.Attachment(memory.bot.icons.get('opti_okay.png'), "icon.png"))
                                .setAuthor(`Successfully deleted ${amount} messages.`, 'attachment://icon.png');
                                
                                m.channel.send({embed: embed}).then(msg2 => { TOOLS.messageFinalize(m.author.id, msg2) });
                            }).catch(err => {
                                TOOLS.errorHandler({err: err, m:m});    
                            });
                        }).catch(err => {
                            TOOLS.errorHandler({err: err, m:m});
                        });
                    } else
                    if (result === 0) {
                        let embed = new discord.RichEmbed()
                        .setColor(cfg.vs.embed.default)
                        .attachFile(new discord.Attachment(memory.bot.icons.get('opti_wait.png'), "icon.png"))
                        .setAuthor(`Request cancelled.`, 'attachment://icon.png')
                        .setDescription('No messages have been deleted.')

                        m.channel.send({embed: embed}).then(msg2 => { TOOLS.messageFinalize(m.author.id, msg2) });
                    } else
                    if (result === -1) {
                        let embed = new discord.RichEmbed()
                        .setColor(cfg.vs.embed.default)
                        .attachFile(new discord.Attachment(memory.bot.icons.get('opti_wait.png'), "icon.png"))
                        .setAuthor(`Request timed out.`, 'attachment://icon.png')
                        .setDescription('No messages have been deleted.')
                        
                        m.channel.send({embed: embed}).then(msg2 => { TOOLS.messageFinalize(m.author.id, msg2) });
                    }
                });
            });
        }
    }
}));

CMD.register(new Command({
    trigger: 'docs', 
    short_desc: 'Search OptiFine documentation.',
    long_desc: `Search for various files in the current version of OptiFine documentation. If no search query is provided, OptiBot will just give you a link to the documentation on GitHub. \n\nDue to the nature of this command, *some* files may be missing, especially if they've only been recently added. For the legacy version of this command, use \`${memory.bot.trigger}docfile\`. This command will always be up-to-date, as it downloads directly from OptiFine's GitHub repository.`,
    usage: '[query?]',
    tags: ['DM_OPTIONAL'],
    fn: (m, args) => {
        if (!args[0]) {
            let embed = new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(memory.bot.icons.get("opti_docs.png"), "icon.png"))
            .setAuthor("Official OptiFine Documentation", 'attachment://icon.png')
            .addField("Main Directory", "https://github.com/sp614x/optifine/tree/master/OptiFineDoc/doc");

            m.channel.send({embed: embed}).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
        } else {
            let query = m.content.substring((memory.bot.trigger + 'docs ').length).toLowerCase();
            let match = cstr.findBestMatch(query, Object.keys(memory.bot.docs_cat));

            if (match.bestMatch.rating < 0.1) {
                TOOLS.errorHandler({ err: "Could not find any files matching that query.", m:m });
            } else {
                let data = memory.bot.docs_cat[match.bestMatch.target];

                let embed = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFile(new discord.Attachment(memory.bot.icons.get("opti_docs.png"), "icon.png"))
                .setAuthor("Official OptiFine Documentation", 'attachment://icon.png')
                .setDescription(`You can link to individual files by using the \`${memory.bot.trigger}docfile\` command.`)
                .addField(data.name, data.links.join('\n\n'))
                .setFooter(`${(match.bestMatch.rating * 100).toFixed(1)}% match during search.`)

                m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
            }
        }
    }
}));

CMD.register(new Command({
    trigger: 'docfile',
    short_desc: 'Search/link a single file in the OptiFine documentation.',
    long_desc: "Search for files in the current version of OptiFine documentation.",
    usage: '<query?> [line #]',
    tags: ['DM_OPTIONAL'],
    fn: (m, args) => {
        let embed = new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(memory.bot.icons.get("opti_docs.png"), "thumbnail.png"))
            .setAuthor("Official OptiFine Documentation", 'attachment://thumbnail.png')

        if (!args[0]) {
            TOOLS.errorHandler({err: "You must specify a file to search for.", m:m});
        } else {
            let files = [];

            for(let i = 0; i < memory.bot.docs.length; i++) {
                files.push(memory.bot.docs[i].name);

                if (i+1 === memory.bot.docs.length) {
                    let match = cstr.findBestMatch(args[0], files)

                    if (match.bestMatch.rating < 0.1) {
                        TOOLS.errorHandler({err: "Could not find a file matching that query.", m:m});
                    } else {
                        let title = match.bestMatch.target;
                        let url = memory.bot.docs[match.bestMatchIndex].html_url;

                        if (match.bestMatch.target.endsWith('.png')) {
                            embed.setImage(memory.bot.docs[match.bestMatchIndex].download_url);
                        } else
                        if (args[1] && !isNaN(args[1]) && Math.round(parseInt(args[1])) > 0) {
                            url += '#L'+Math.round(parseInt(args[1]));
                            title += ' | Line '+Math.round(parseInt(args[1]));
                        }
    
                        embed.addField(title, url)
                        embed.setFooter(`${(match.bestMatch.rating * 100).toFixed(1)}% match during search.`)
    
                        m.channel.send({embed: embed}).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                    }
                }
            }
        }
    }
}));

CMD.register(new Command({
    trigger: 'say',
    short_desc: 'Ventriloquism!',
    usage: '<message AND/OR attachment>',
    fn: (m, args) => {
        if (!args[0]) {
            TOOLS.errorHandler({err: "You must specify a channel ID to speak in.", m:m});
        } else
        if (!args[1] && m.attachments.size === 0) {
            TOOLS.errorHandler({err: "You must specify something to say/send", m:m});
        } else {
            let v_msg = (args[1]) ? m.content.substring((memory.bot.trigger+'say '+args[0]+' ').length) : undefined
            let attachment = (m.attachments.size !== 0) ? {files:[m.attachments.first(1)[0].url]} : undefined

            log('[saying] '+v_msg+'\n[attachment] '+attachment, 'warn');

            bot.guilds.get(cfg.basic.of_server).channels.get(args[0]).send(v_msg, attachment).then(() => {
                let embed = new discord.RichEmbed()
                    .setColor(cfg.vs.embed.okay)
                    .attachFile(new discord.Attachment(memory.bot.icons.get('opti_okay.png'), "thumbnail.png"))
                    .setAuthor('Message sent.', 'attachment://thumbnail.png')

                m.channel.send({embed: embed}).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
            })
        }
    }
}));

CMD.register(new Command({
    trigger: 'award',
    short_desc: 'Give medals to users.',
    long_desc: 'Gives a medal to the specified user. This is an alternative to adding a medal emoji to someones message.',
    usage: '<discord user>',
    tags: ['MODERATOR_ONLY', 'NO_DM'],
    fn: (m, args) => {
        if (!args[0]) {
            TOOLS.errorHandler({err: "You must specify a user to give an medal to.", m:m});
        } else {
            TOOLS.getTargetUser(m, args[0], (userid, name) => {
                if (!userid) {
                    TOOLS.errorHandler({err: "You must specify a valid user.", m:m});
                } else
                if (userid === bot.user.id) {
                    TOOLS.errorHandler({err: "I'm not allowed to have medals. :(", m:m});
                } else
                if (userid === m.author.id) {
                    let embed = new discord.RichEmbed()
                        .attachFiles([new discord.Attachment(memory.bot.images.get('medal_self.png'), "image.png")])
                        .setColor(cfg.vs.embed.error)
                        .setImage('attachment://image.png');

                    m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                } else {
                    TOOLS.getProfile(m, userid, (profile) => {
                        if (!profile.medals) {
                            profile.medals = {
                                count: 1,
                                msgs: []
                            }
                        } else {
                            profile.medals.count++;
                        }
                        
                        memory.db.profiles.update({ member_id: userid }, profile, (err) => {
                            if (err) TOOLS.errorHandler({ err: err, m: m });
                            else {
                                log(`${name} was awarded a medal by ${m.author.username}#${m.author.discriminator}`);
        
                                let embed = new discord.RichEmbed()
                                    .setColor(cfg.vs.embed.default)
                                    .attachFile(new discord.Attachment(memory.bot.icons.get('opti_medal.png'), "icon.png"))
                                    .setAuthor('Medal awarded', 'attachment://icon.png')
                                    .setDescription(`<@${userid}> was awarded a medal by ${m.author}!`)

                                m.channel.send({ embed: embed }).then(msg => {
                                    TOOLS.messageFinalize(m.author.id, msg);
                                });
                            }
                        });
                    });
                }
            });
        }
    }
}));

CMD.register(new Command({
    trigger: 'chkmute',
    short_desc: 'Check the status of a muted user.',
    long_desc: 'Checks the status of a muted user, and provides an approximate date for when the user will be unmuted, if at all.',
    usage: '<discord user>',
    tags: ['MODERATOR_ONLY', 'DM_OPTIONAL'],
    fn: (m, args) => {
        if (args[0]) {
            TOOLS.getTargetUser(m, args[0], (userid, name) => {
                if (!userid) {
                    TOOLS.errorHandler({err: "You must specify a valid user.", m:m});
                } else {
                    getFinal(userid, name);
                }
            });
        } else {
            TOOLS.errorHandler({err: "You must specify a user to check.", m:m});
        }

        function getFinal(target, name) {
            TOOLS.getProfile(m, target, (profile) => {
                if (!profile.mute) {
                    let embed = new discord.RichEmbed()
                    .attachFile(new discord.Attachment(memory.bot.icons.get('opti_err.png'), "icon.png"))
                    .setColor(cfg.vs.embed.error)
                    .setAuthor(`${name} is not muted.`, "attachment://icon.png")
                    .setDescription('If this information is false, contact <@181214529340833792> immediately.');

                    m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                } else
                if (typeof profile.mute.end === 'number') {
                    let embed = new discord.RichEmbed()
                    .attachFile(new discord.Attachment(memory.bot.icons.get('opti_wait.png'), "icon.png"))
                    .setColor(cfg.vs.embed.default)
                    .setAuthor(`Mute Status`, "attachment://icon.png")
                    .setDescription(`Status of mute for user <@${target}>`)
                    .addField('Mute start date', `User was muted by <@${profile.mute.executor}> on ${new Date(profile.mute.start).toUTCString()}.`)
                    .addField('Mute end date', `User will be unmuted on ${new Date(profile.mute.end).toUTCString()}. ${(profile.mute.updater.length > 0) ? `This time limit was last updated by <@${profile.mute.updater}>` : ""} \n\n**This is an approximation.** Due to the nature of OptiBot's mute system, it may take up to 5 minutes for a user to be unmuted automatically. If it's been more than 5 minutes, or any of this information is otherwise false, please contact <@181214529340833792> immediately.`)

                    m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                } else {
                    let embed = new discord.RichEmbed()
                    .attachFile(new discord.Attachment(memory.bot.icons.get('opti_wait.png'), "icon.png"))
                    .setColor(cfg.vs.embed.default)
                    .setAuthor(`Mute Status`, "attachment://icon.png")
                    .setDescription(`Status of mute for user <@${target}>`)
                    .addField('Mute start date', `User was muted by <@${profile.mute.executor}> on ${new Date(profile.mute.start).toUTCString()}.`)
                    .addField('Mute end date', `This user will never be unmuted. ${(profile.mute.updater.length > 0) ? `This was last updated by <@${profile.mute.updater}>` : ""} \n\nIf any of this information is false, please contact <@181214529340833792> immediately.`)

                    m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                }
            });
        }
    }
}));

CMD.register(new Command({
    trigger: 'faq',
    short_desc: 'Search for a question in <#531622141393764352>',
    long_desc: 'Searches for an answered question in the <#531622141393764352> channel. Due to the complexity of this command, results may vary.',
    usage: '<query?>',
    tags: ['DM_OPTIONAL'],
    fn: (m, args) => {
        if (!args[0]) {
            TOOLS.errorHandler({ err: `You must specify a question to search for.`, m:m });
        } else {
            let highest = {
                rating: 0,
                message: undefined
            };
            let query = m.content.substring( (memory.bot.trigger + 'faq ').length );
            let qrgx = new RegExp('(?<=Q: \\*\\*).+(?=\\*\\*)');

            bot.guilds.get(cfg.basic.of_server).channels.get('531622141393764352').fetchMessages({ limit: 100, after: '531629512559951872' }).then(entries => {
                let messages = [...entries.values()];
                let i = 0;
                (function search() {
                    log('search loop'+i, 'trace');
                    let question = messages[i].content.match(qrgx);
                    let answer = messages[i].content.split('\n').slice(1).join('\n').replace(/A:/i, "").replace(/_\s+_\s*$/, "").trim();

                    if (question !== null) {
                        let match = cstr.compareTwoStrings(query.toLowerCase(), question[0].toLowerCase());

                        if (match > highest.rating) {
                            highest.rating = match;
                            highest.message = messages[i];
                            highest.question = question;
                            highest.answer = answer;
                        }
                    }

                    if (i+1 === messages.length || highest.rating === 1) {
                        if (highest.rating < 0.05 || highest.message === undefined) {
                            TOOLS.errorHandler({ err: 'Could not find an answer to that question.', m:m });
                        } else {
                            let embed = new discord.RichEmbed()
                            .setColor(cfg.vs.embed.default)
                            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_faq.png'), "icon.png"))
                            .setAuthor('Frequently Asked Questions', 'attachment://icon.png')
                            .setFooter(`${(highest.rating * 100).toFixed(1)}% match during search.`);

                            let infotext = `Click here to go to the original message link.](${highest.message.url})\n\n Be sure to also check out the <#531622141393764352> channel for more questions and answers.`;
                            
                            if (highest.answer) {
                                if (highest.answer.length < 512) {
                                    embed.setDescription('['+infotext)
                                    .addField(highest.question, highest.answer);
                                } else {
                                    embed.setDescription(`[**The answer to this question is too long to show in an embed.**\n ${infotext}`)
                                    .addField(highest.question, highest.answer.substring(0, 512).trim()+'...');
                                }
                            } else {
                                embed.setDescription('['+infotext)
                                .addField(highest.question, "_ _");
                            }

                            if (highest.message.attachments.size > 0) {
                                if (highest.message.attachments.first(1)[0].url.match(/.(jpg|jpeg|png|gif)$/i) !== null) {
                                    embed.setImage(highest.message.attachments.first(1)[0].url)
                                } else {
                                    highest.message += '\n\n'+highest.message.attachments.first(1)[0].url;
                                }
                            }

                            m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                        }
                    } else {
                        i++
                        search();
                    }
                })();
            }).catch(err => {
                TOOLS.errorHandler({ err: err, m:m });
            })
        }
    }
}));

CMD.register(new Command({
    trigger: 'mcwiki',
    short_desc: 'Search the Minecraft Wiki.',
    query: '[query]',
    tags: ['DM_OPTIONAL'],
    fn: (m, args) => {
        let embed = new discord.RichEmbed()
        .setColor(cfg.vs.embed.default)
        .attachFile(new discord.Attachment(memory.bot.icons.get('opti_mcwiki.png'), "icon.png"))
        .setAuthor('Official Minecraft Wiki', 'attachment://icon.png');

        if (!args[0]) {
            embed.setDescription('https://minecraft.gamepedia.com/Minecraft_wiki')
            .setFooter('To link a specific article, please specify a search query.')

            m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
        } else {
            let query = m.content.split("\n", 1)[0].substring( (memory.bot.trigger+'mcwiki ').length ).trim();
            let url = "https://minecraft.gamepedia.com/api.php?action=query&format=json&generator=search&gsrsearch="+encodeURIComponent(query)+"&gsrlimit=1&prop=info&inprop=url";
            if (query.toLowerCase() === 'random') url = "https://minecraft.gamepedia.com/api.php?action=query&format=json&generator=random&prop=info&inprop=url";

            request(url, (err, res, data) => {
                if (err || !res || !data) {
                    TOOLS.errorHandler({ err: err || new Error('Failed to get a response from the Minecraft Wiki API'), m: m });
                } else {
                    let result = JSON.parse(data);

                    if (!result.query) {
                        embed.setDescription('https://minecraft.gamepedia.com/Minecraft_wiki')
                        .setFooter('Could not find a page matching that query.')

                        m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                    } else {
                        let resultID = Object.keys(result.query.pages)[0];
                        embed.addField(result.query.pages[resultID].title, result.query.pages[resultID].fullurl);

                        m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                    }
                }
            });
        }
    }
}));

CMD.register(new Command({
    trigger: 'setmotd',
    short_desc: 'Set MOTD message.',
    long_desc: `Adds a message to OptiBot's MOTD, which is sent to every new user that joins the server. This can be undone by using the \`${memory.bot.trigger}clearmotd\` command.`,
    usage: '[message]',
    tags: ['MODERATOR_ONLY', 'NO_JR_MOD', 'NO_DM'],
    fn: (m, args) => {
        if(!args[0]) {
            TOOLS.errorHandler({ err: "You must specify a message.", m: m });
        } else {
            let newMsg = m.content.substring( (memory.bot.trigger + 'motd ').length );
            let messageformatted = '> '+newMsg.replace('\n', '> \n').substring(0, 1024);

            if (memory.bot.motd.fields[0] && memory.bot.motd.fields[0].value.toLowerCase() === newMsg.trim().toLowerCase()) {
                TOOLS.errorHandler({ err: "New MOTD Message cannot be the same as the current message.", m: m });
                return;
            }

            let confirm = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFile(new discord.Attachment(memory.bot.icons.get('opti_warn.png'), "icon.png"))
                .setAuthor(`Are you sure want to change the MOTD message?`, 'attachment://icon.png')
                .setDescription(`This message will be shown to ALL users who join the server. \n\nType \`${memory.bot.trigger}confirm\` to continue.\nType \`${memory.bot.trigger}cancel\` or simply ignore this message to cancel.`)

            if (memory.bot.motd.fields[0]) {
                confirm.addField('Current Message Preview', memory.bot.motd.fields[0].value);
            }

            confirm.addField('New Message Preview', messageformatted)
                .setFooter('Note that messages must be less than 1024 characters in length. Your message may have been automatically shortened to fit.');

            
            m.channel.send({ embed: confirm }).then(() => {
                TOOLS.typerHandler(m.channel, false);
                TOOLS.confirmationHandler(m, (result) => {
                    if (result === 1) {
                        let motd_data = {
                            motd: true,
                            date: new Date(),
                            message: messageformatted,
                        }
                        
                        memory.db.motd.update({motd: true}, motd_data, { upsert: true }, (err) => {
                            if (err) {
                                TOOLS.errorHandler({ m:m, err:err });
                            } else {
                                if (memory.bot.motd.fields[0]) {
                                    memory.bot.motd.fields[0].name = `A message from Moderators (Posted on ${motd_data.date.toUTCString()})`;
                                    memory.bot.motd.fields[0].value = messageformatted;
                                } else {
                                    memory.bot.motd.addField(`A message from Moderators (Posted on ${motd_data.date.toUTCString()})`, messageformatted)
                                }
        
                                let embed = new discord.RichEmbed()
                                    .attachFile(new discord.Attachment(memory.bot.icons.get('opti_okay.png'), "icon.png"))
                                    .setColor(cfg.vs.embed.okay)
                                    .setAuthor("Message set.", "attachment://icon.png")
                                    .setDescription(`Type \`${memory.bot.trigger}motd\` to see how it looks.`)
        
                                m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                            }
                        });
                    } else
                    if (result === 0) {
                        let embed = new discord.RichEmbed()
                        .setColor(cfg.vs.embed.default)
                        .attachFile(new discord.Attachment(memory.bot.icons.get('opti_wait.png'), "icon.png"))
                        .setAuthor(`Request cancelled.`, 'attachment://icon.png')
                        .setDescription('MOTD message has not been changed.')

                        m.channel.send({embed: embed}).then(msg2 => { TOOLS.messageFinalize(m.author.id, msg2) });
                    } else
                    if (result === -1) {
                        let embed = new discord.RichEmbed()
                        .setColor(cfg.vs.embed.default)
                        .attachFile(new discord.Attachment(memory.bot.icons.get('opti_wait.png'), "icon.png"))
                        .setAuthor(`Request timed out.`, 'attachment://icon.png')
                        .setDescription('MOTD message has not been changed.')
                        
                        m.channel.send({embed: embed}).then(msg2 => { TOOLS.messageFinalize(m.author.id, msg2) });
                    }
                });
            });
        }
    }
}));

CMD.register(new Command({
    trigger: 'split',
    short_desc: 'Split a texture into smaller textures.',
    long_desc: `Split a given image attachment into smaller textures. Define the size of each block with the \`width\` and \`height\` arguments. **All numbers must be EVEN, including the resolution of your intial image texture!**`,
    usage:`<width> <height>`,
    fn: (m, args) => {
        // todo: make minimum block size dependent on the total image size.
        let timeStart = new Date().getTime();
        if (m.attachments.size === 0) {
            TOOLS.errorHandler({ err:'You must include an image to dice.', m:m });
        } else
        if (!args[0]) {
            TOOLS.errorHandler({ err:'You must specify the width of the grid blocks.', m:m });
        } else
        if (!args[1]) {
            TOOLS.errorHandler({ err:'You must specify the height of the grid blocks.', m:m });
        } else
        if (isNaN(args[0]) || isNaN(args[1])) {
            TOOLS.errorHandler({ err:'You must specify valid numbers.', m:m });
        } else
        if (parseInt(args[0]) % 2 === 1 || parseInt(args[0]) % 2 === 1) {
            TOOLS.errorHandler({ err:'You cannot use odd numbers.', m:m });
        } else
        if (parseInt(args[0]) < 8 || parseInt(args[0]) < 8) {
            TOOLS.errorHandler({ err:'Blocks cannot be smaller than 8x8 pixels.', m:m });
        } else {
            jimp.read(m.attachments.first(1)[0].url, (err, image) => {
                if (err) {
                    TOOLS.errorHandler({ err:err, m:m });
                } else
                if (image.bitmap.width % 2 === 1 || image.bitmap.height % 2 === 1) {
                    TOOLS.errorHandler({ err:'Image must have an even width and height.', m:m });
                } else 
                if (image.bitmap.width > 1024 || image.bitmap.height > 1024) {
                    TOOLS.errorHandler({ err:'Image cannot exceed 1024 pixels in width or height.', m:m });
                } else 
                if (image.bitmap.width < parseInt(args[0]) || image.bitmap.height < parseInt(args[1])) {
                    TOOLS.errorHandler({ err:'Block size cannot exceed image dimensions.', m:m });
                } else {
                    let column = 0;
                    let row = 0;
                    
                    let filenum = 0;
                    let zip = new archive();

                    (function splitter() {
                        log(`now doing c${column+1} r${row+1}`, 'trace');
                        log(`this image at x${parseInt(args[0]) * column} y${parseInt(args[1]) * row}`)
                        let newimg = image.clone();

                        newimg.crop((parseInt(args[0]) * column), (parseInt(args[1]) * row), parseInt(args[0]), parseInt(args[1]))
                        .getBuffer(jimp.AUTO, (err, buffer) => {
                            if (err) {
                                TOOLS.errorHandler({ err:err, m:m });
                            } else {
                                zip.addFile(`${filenum}.png`, buffer);

                                filenum++;
                                if (column+2 > (image.bitmap.width / parseInt(args[0])) ) {
                                    if (row+2 > (image.bitmap.height / parseInt(args[1])) ) {
                                        let embed = new discord.RichEmbed()
                                        .setColor(cfg.vs.embed.okay)
                                        .attachFiles([new discord.Attachment(memory.bot.icons.get('opti_okay.png'), "icon.png"), new discord.Attachment(zip.toBuffer(), "output.zip")])
                                        .setAuthor(`Successfully generated ${filenum} images in ${(new Date().getTime() - timeStart) / 1000} seconds.`, 'attachment://icon.png')

                                        m.channel.send({embed: embed}).then(msg => TOOLS.messageFinalize(m.author.id, msg));
                                    } else {
                                        column = 0;
                                        row++;
                                        splitter();
                                    }
                                } else {
                                    column++;
                                    splitter();
                                }
                            }
                        });
                    })();
                }
            });
        }
    }
}));

CMD.register(new Command({
    trigger: 'join',
    short_desc: 'Stitch several textures together.',
    long_desc: `Stitches a series of given images into a single texture. You must include all images to join, in the form of a .zip file. Define the size of the canvas the \`width\` and \`height\` arguments. **All numbers must be EVEN, including the resolution of your intial image textures!**`,
    usage:`<width> <height>`,
    fn: (m, args) => {
        let timeStart = new Date().getTime();
        if (m.attachments.size === 0) {
            TOOLS.errorHandler({ err:'You must include a zip file.', m:m });
        } else
        if (!args[0]) {
            TOOLS.errorHandler({ err:'You must specify the width of the canvas.', m:m });
        } else
        if (!args[1]) {
            TOOLS.errorHandler({ err:'You must specify the height of the canvas.', m:m });
        } else
        if (isNaN(args[0]) || isNaN(args[1])) {
            TOOLS.errorHandler({ err:'You must specify valid numbers.', m:m });
        } else
        if (parseInt(args[0]) % 2 === 1 || parseInt(args[0]) % 2 === 1) {
            TOOLS.errorHandler({ err:'You cannot use odd numbers.', m:m });
        } else {
            request(m.attachments.first(1)[0].url, (err, res, data) => {
                if (err || res.statusCode === 404) {
                    TOOLS.errorHandler({ err:err||new Error('Unable to download attachment.'), m:m });
                } else {
                    let zip = new archive(data);
                    let entries = zip.getEntries();

                    // todo
                }
            });
        }
    }
}));

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
// TOOLS
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

/**
 * Handles commands that require confirmation.
 * 
 * @param {discord.Message} m The Discord message that triggered this confirmation.
 * @param {function(number)} cb The result of the confirmation.
 * 
 * -1 = Action timed out.
 * 
 * 0 = Action cancelled.
 * 
 * 1 = Action confirmed.
 */
TOOLS.confirmationHandler = (m, cb) => {
    let c = memory.bot.cdb;
    c.push({
        member_id: m.author.id,
        channel_id: m.channel.id,
        emitter: new events.EventEmitter()
    });
    log('added confirmation', 'trace');

    TOOLS.confirmationFinder({ member_id: m.author.id, channel_id: m.channel.id }, (index) => {
        if (index > -1) {
            log(JSON.stringify(c[index]), 'trace');

            const timedout = () => {
                log('confirmation timed out', 'trace');
                cleanup();
                cb(-1);
            }

            const confirmed = () => {
                log('confirmation success', 'trace');
                bot.clearTimeout(timeout);
                cleanup();
                cb(1);
            }

            const cancelled = () => {
                log('confirmation cancelled', 'trace');
                cleanup();
                cb(0);
            }

            let timeout = bot.setTimeout(timedout, 1000*60*5);

            c[index].emitter.addListener('confirm', confirmed);

            c[index].emitter.addListener('cancel', cancelled);

            function cleanup() {
                c[index].emitter.removeListener('confirm', confirmed);
                c[index].emitter.removeListener('cancel', cancelled);
                bot.setTimeout(() => {
                    delete c[index].emitter;
                    c.splice(index, 1);
                }, 250);
            }
        }
    });
}

/**
 * Searches for active pending confirmations in OptiBot's memory.
 * 
 * @param {object} data Object containing relevant data to find pending confirmations.
 * @param {string} data.member_id ID of the user that must respond.
 * @param {string} data.channel_id ID of the channel the user must respond in.
 * @param {function(number)} cb Callback function to be executed when finished searching.
 */
TOOLS.confirmationFinder = (data, cb) => {
    let c = memory.bot.cdb
    if (c.length === 0) {
        log('cdb is empty', 'trace');
        cb(-1);
    } else {
        for (let i = 0; i < c.length; i++) {
            if (c[i].member_id === data.member_id && c[i].channel_id === data.channel_id) {
                log('found in cdb', 'trace');
                cb(i);
                break;
            } else
            if (i + 1 === c.length) {
                log('could not find in cdb', 'trace');
                cb(-1);
            }
        }
    }
}

/**
 * Simple Discord status handler
 * 
 * @param {number} type Type of status to switch to.
 * 
 * -1 = Shutting Down
 * 
 * 0 = Booting
 * 
 * 1 = Default/Normal State
 * 
 * 2 = Cooldown Activated
 */
TOOLS.statusHandler = (type) => {
    let ACT_status = 'online';
    let ACT_type;
    let ACT_game;
    let ACT_url;

    if (type === -1) {
        // shutting down
        ACT_status = 'invisible';
    } else
    if (type === 0) {
        // booting
        ACT_status = 'idle';
        ACT_type = 'WATCHING';
        ACT_game = 'assets load 🔄';
    } else
    if (type === 1) {
        // default state
        if (memory.bot.locked) {
            if (memory.bot.debug) {
                ACT_status = 'dnd';
                ACT_type = 'PLAYING';
                ACT_game = 'Code Mode 💻';
            } else {
                ACT_status = 'dnd';
                ACT_type = 'PLAYING';
                ACT_game = 'Mod Mode 🔒';
            }
        } else {
            ACT_status = 'online';
        }
    } else
    if (type === 2) {
        // cooldown active
        ACT_status = 'idle';
    }

    bot.user.setStatus(ACT_status);
    bot.user.setActivity(ACT_game, { url: ACT_url, type: ACT_type });
    memory.activity.status = ACT_status;
    memory.activity.game = ACT_game;
    memory.activity.type = ACT_type;
    memory.activity.url = ACT_url;
}

/**
 * Simple typing status handler.
 * 
 * @param {discord.TextChannel|discord.DMChannel} channel The channel to start/stop typing in.
 * @param {boolean} state Start typing? If true, the bot will begin typing in the specified channel. If false, the bot will stop typing in that channel.
 */
TOOLS.typerHandler = (channel, state) => {
    if (cfg.vs.typer) {
        if (state) {
            channel.startTyping();
        } else {
            channel.stopTyping();
            setTimeout(() => {
                channel.stopTyping();
            }, 2000);
        }
    }
}

/**
 * Simple shutdown handler.
 * 
 * @param {number} code The exit code, or the reason for shutting down.
 * 
 * 0 = User-initiated shutdown. (!stop)
 * 
 * 1 = Error occurred, automatic restart.
 * 
 * 2 = User-initiated restart. (!restart)
 * 
 * 3 = User-initiated reset. (!reset)
 * 
 * 10 = Scheduled restart.
 * 
 * 24 = Fatal error occurred, shutdown.
 */
TOOLS.shutdownHandler = (code) => {
    if(bot.status === 0) {
        TOOLS.statusHandler(-1);
    }

    clearInterval(memory.bot.status_check);

    bot.setTimeout(() => {
        bot.destroy();
        process.title = 'OptiBot ' + pkg.version;
        setTimeout(() => {
            process.exit(code);
        }, 500);
    }, 250);
}

/**
 * Function to be executed upon sending (most) bot messages.
 * 
 * @param {string} author ID of the user the bot is responding to.
 * @param {discord.Message} botm The new message posted by OptiBot.
 */
TOOLS.messageFinalize = (author, m) => {
    TOOLS.typerHandler(m.channel, false);

    log('message sent, adding to cache', 'debug');
    m.react(bot.guilds.get(cfg.basic.ob_server).emojis.get('642085525460877334')).then(() => {
        let cacheData = {
            time: new Date().getTime(),
            guild: m.guild.id,
            channel: m.channel.id,
            message: m.id,
            user: author
        }

        memory.db.msg.insert(cacheData, (err) => {
            if (err) {
                TOOLS.errorHandler({ err: err });
            } else {
                log('successfully added message to cache', 'debug');
                log('checking cache limit', 'debug');
                memory.db.msg.find({}).sort({ time: 1 }).exec((err, docs) => {
                    if (err) {
                        TOOLS.errorHandler({ err: err });
                    } else
                    if (docs.length > cfg.db.size) {
                        log('reached cache limit, removing first element from cache.', 'debug');
                        memory.db.msg.remove(docs[0], {}, (err) => {
                            if (err) {
                                TOOLS.errorHandler({ err: err });
                            } else {
                                bot.guilds.get(docs[0].guild).channels.get(docs[0].channel).fetchMessage(docs[0].message).then((msg) => {
                                    let reaction = msg.reactions.get('click_to_delete:642085525460877334');

                                    if(reaction && reaction.me) {
                                        reaction.remove().then(() => {
                                            log('Time expired for message deletion.', 'trace');
                                        }).catch(err => {
                                            TOOLS.errorHandler({ err: err });
                                        })
                                    }
                                }).catch(err => {
                                    TOOLS.errorHandler({ err: err });
                                });
                            }
                        });
                    }
                });
            }
        })
    }).catch(err => {
        TOOLS.errorHandler({ err: err });
    });
}

/**
 * Simple error handler.
 * 
 * @param {object} data Object containing all relevant data.
 * @param {(string|object)} data.err The error message or error object. Strings will not be logged. If an error requires logging, the error message should use the Error constructor.
 * @param {discord.Message} [data.m] Message object to be used to post an error message in Discord. If omitted, the error will only be printed to the console.
 * @param {boolean} [data.temp] Sets the error message to only show temporarily.
 */
TOOLS.errorHandler = (data) => {
    let embed = new discord.RichEmbed()
    .attachFile(new discord.Attachment(memory.bot.icons.get('opti_err.png'), "icon.png"))
    .setColor(cfg.vs.embed.error);

    let cid = callerId.getData();
    let path = (cid.evalFlag) ? 'eval()' : cid.filePath;
    let filename = path.substring(path.lastIndexOf('\\')+1);
    let line = cid.lineNumber;

    if (!data || typeof data !== 'object' || data.constructor !== Object) {
        log(`An error occured during operation and was caught, but no valid data was passed to the handler. [method call @ ${filename}:${line}]`, 'fatal');
    } else {
        if ((data.err === undefined || data.err === null) || ((data.err instanceof Error) && data.err.message.length === 0)) {
            log(`An error occured during operation and was caught, but no error object or string was passed to the handler. [method call @ ${filename}:${line}]`, 'fatal');
    
            embed.setAuthor('Something went wrong while doing that. Oops.', 'attachment://icon.png')
            .setDescription('If this continues, please contact <@181214529340833792>.')
        } else {
            if (data.err instanceof Error) {
                log(data.err.stack, 'error', line);
    
                // display contact message + error
                embed.setAuthor('Something went wrong while doing that. Oops.', 'attachment://icon.png')
                .setDescription(`\`\`\`[Ln ${line}] ${data.err}\`\`\` \nIf this continues, please contact <@181214529340833792>.`)
            } else {
                // display error only, minified
                embed.setAuthor(data.err, 'attachment://icon.png');
            }
        }
    
        if (data.m) {
            if (data.temp) {
                embed.setFooter('This message will self-destruct in 10 seconds.')
                data.m.channel.send({ embed: embed }).then(msg => {
                    TOOLS.typerHandler(data.m.channel, false);
                    bot.setTimeout(() => {
                        if (!msg.deleted) {
                            msg.delete();
                        }
                    }, 10000);
                });
            } else {
                data.m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(data.m.author.id, msg) });
            }
        }
    }
}

/**
 * Simplified RNG handler.
 * 
 * @param {*} val1 First value.
 * @param {*} [val2] Second value.
 * 
 * If val1 is an Array, this will pick a random item from the array.
 * 
 * If val1 is an Object Literal, this will pick a random key from the first level of the object.
 * 
 * If val1 and val2 are both numbers, this will pick a random number between the two.
 */
TOOLS.randomizer = (val1, val2) => {
    if (Array.isArray(val1)) {
        // array []
        return val1[~~(Math.random() * val1.length)];
    } else
    if (typeof val1 === 'object' && val1.constructor === Object) {
        // object {}
        let keys = Object.keys(val1);
        if (keys.length > 0) return keys[~~(Math.random() * keys.length)];
        else return null;
    } else
    if (!isNaN(val1) && !isNaN(val2)) {
        // numbers
        if (val1 >= 0) return ~~((Math.random() * val2) + val1);
        else return ~~((Math.random() * (val2 - val1)) + val1);
    } else {
        return null;
    }
}

/**
 * Handler for muting and unmuting users.
 * 
 * @param {discord.Message} m The Discord message that triggered this handler.
 * @param {string[]} args User-defined arguments for muting.
 * @param {boolean} action True = Mute. False = Unmute.
 */
TOOLS.muteHandler = (m, args, action) => {
    let now = new Date().getTime();
    let update = false;
    let reason = (args[2]) ? m.content.substring(m.content.indexOf(args[2])) : 'No reason provided.';
    TOOLS.getTargetUser(m, args[0], (userid) => {
        if (userid) {
            validateMute(userid);
        } else {
            TOOLS.errorHandler({ m: m, err: `You must specify a valid user @mention, user ID, or the 'last active user' shortcut. (^)` });
        }
    });

    function validateMute(target) {
        if (target === m.author.id || target === bot.user.id) {
            TOOLS.errorHandler({ err: `Nice try.`, m:m });
        } else {
            bot.guilds.get(cfg.basic.of_server).fetchMember(target).then(member => {
                if (member.permissions.has("KICK_MEMBERS", true) || member.roles.has(cfg.roles.junior_mod) || member.user.bot) {
                    TOOLS.errorHandler({ m: m, err: `That user is too powerful to be ${(action) ? "muted." : "muted in the first place."}` });
                } else
                if (action && member.roles.has(cfg.roles.muted)) {
                    if (!args[1]) {
                        TOOLS.errorHandler({ m: m, err: `That user has already been muted. If you'd like to change or add a time limit, please specify.` });
                    } else {
                        update = true;
                        getTimeLimit(member);
                    }
                } else
                if (!action && !member.roles.has(cfg.roles.muted)) {
                    TOOLS.errorHandler({ m: m, err: "That user is not muted." });
                } else {
                    getTimeLimit(member);
                }
            }).catch(err => {
                TOOLS.errorHandler({ m: m, err: err });
            });
        }
    }

    function getTimeLimit(target) {
        let data = {
            start: now,
            end: now + (1000*60*60), // default to 1 hour
            executor: m.author.id,
            updater: ""
        }

        if (!action) {
            finalMute(target);
        } else
        if (!args[1]) {
            finalMute(target, data);
        } else {
            let number = parseInt(args[1]);
            let measure = 'hours'

            if (isNaN(args[1])) {
                log('is not a number', 'trace');
                let num_split = args[1].split(/\D/, 1);
                log(num_split, 'trace');
                if (isNaN(num_split[0]) || num_split[0].length === 0) {
                    TOOLS.errorHandler({ m: m, err: `You must specify a valid time limit.` });
                    return;
                } else {
                    number = Math.round(parseInt(num_split[0]));
                    measure = args[1].substring(num_split[0].length).replace(/\./g, "").toLowerCase();

                    if (measure.length === 1) {
                        if (measure === 'm') {
                            measure = 'minutes';
                        } else
                        if (measure === 'h') {
                            measure = 'hours';
                        } else
                        if (measure === 'd') {
                            measure = 'days';
                        }
                    }
                }
            }

            if (number <= 0) {
                data.end = null;
                finalMute(target, data);
            } else {
                let measure_match = cstr.findBestMatch(measure, ['minutes', 'hours', 'days']);

                log(number, 'trace')
                log(measure, 'trace')
                log(measure_match.bestMatch.target, 'trace')

                if (measure_match.bestMatch.target === 'minutes') {
                    if (number < 10) {
                        TOOLS.errorHandler({ m: m, err: `Time limit must be greater than 10 minutes.` });
                    } else
                    if (number > 10080) {
                        TOOLS.errorHandler({ m: m, err: `Time limit cannot exceed 7 days.` });
                    } else {
                        data.end = now + (1000*60*number);
                        finalMute(target, data);
                    }
                } else
                if (measure_match.bestMatch.target === 'hours') {
                    if (number < 1) {
                        TOOLS.errorHandler({ m: m, err: `Be reasonable.` });
                    } else
                    if (number > 168) {
                        TOOLS.errorHandler({ m: m, err: `Time limit cannot exceed 7 days.` });
                    } else {
                        data.end = now + (1000*60*60*number);
                        finalMute(target, data);
                    }
                    
                } else
                if (measure_match.bestMatch.target === 'days') {
                    if (number < 1) {
                        TOOLS.errorHandler({ m: m, err: `Be reasonable.` });
                    } else
                    if (number > 7) {
                        TOOLS.errorHandler({ m: m, err: `Time limit cannot exceed 7 days.` });
                    } else {
                        data.end = now + (1000*60*60*24*number);
                        finalMute(target, data);
                    }
                    
                }
            }
        }
    }

    function finalMute(target, data) {
        let muted_name = target.user.username+'#'+target.user.discriminator;
        let executor = m.author.username+'#'+m.author.discriminator;

        TOOLS.getProfile(m, target.user.id, profile => {
            if (action) {
                if (profile.mute) {
                    data.start = profile.mute.start;
                    data.updater = data.executor;
                    data.executor = profile.mute.executor;
                }

                if(!profile.violations) {
                    profile.violations = [];
                }

                let remaining = data.end - now;
                let minutes = Math.round(remaining/1000/60)
                let hours = Math.round(remaining/(1000*60*60))
                let days = Math.round(remaining/(1000*60*60*24))
                let final;

                if (minutes < 60) {
                    final = `${minutes} minute(s)`;
                } else
                if (hours < 24) {
                    final = `${hours} hour(s)`;
                } else {
                    final = `${days} day(s)`;
                }

                if(update) {
                    profile.violations.push({
                        date: now,
                        moderator: m.author.id,
                        action: 'Mute Time Update',
                        reason: reason,
                        misc: `Mute updated to last for ${final}.`
                    });
                } else {
                    profile.violations.push({
                        date: now,
                        moderator: m.author.id,
                        action: 'Mute',
                        reason: reason,
                        misc: `Mute initially set to last for ${final}.`
                    });
                }

                profile.mute = data;
            } else {
                delete profile.mute;
            }

            memory.db.profiles.update({ member_id: target.user.id }, profile, {}, (err) => {
                if (err) {
                    TOOLS.errorHandler({ m: m, err: err });
                } else
                if (action) {
                    target.addRole(cfg.roles.muted, `User muted by ${executor} (via ${memory.bot.trigger}mute)`).then(() => {
                        log(`User ${muted_name} was muted by ${executor} (via ${memory.bot.trigger}mute)`, 'warn');
                        resultMsg(target, data.end);
                    }).catch(err => TOOLS.errorHandler({ m: m, err: err }));
                } else {
                    target.removeRole(cfg.roles.muted, `User unmuted by ${executor}`).then(() => {
                        log(`User ${muted_name} was unmuted by ${executor}`, 'warn');
                        resultMsg(target);
                    }).catch(err => TOOLS.errorHandler({ m: m, err: err }));
                }
            })
        });
    }

    function resultMsg(target, time) {
        let muted_name = target.user.username+'#'+target.user.discriminator;
        let embed = new discord.RichEmbed()
        .setColor(cfg.vs.embed.okay)
        .attachFile(new discord.Attachment(memory.bot.icons.get('opti_okay.png'), "icon.png"));

        if (action) {
            let remaining = time - now;
            let minutes = Math.round(remaining/1000/60)
            let hours = Math.round(remaining/(1000*60*60))
            let days = Math.round(remaining/(1000*60*60*24))
            let final;

            if (minutes < 60) {
                final = `${minutes} minute(s)`;
            } else
            if (hours < 24) {
                final = `${hours} hour(s)`;
            } else {
                final = `${days} day(s)`;
            }

            if (update) {
                if (time === null) {
                    embed.setAuthor(`Updated. ${muted_name} will now be muted forever.`, 'attachment://icon.png');
                } else {
                    embed.setAuthor(`Updated. ${muted_name} will now be muted for ${final}.`, 'attachment://icon.png');   
                }
            } else {
                if (time === null) {
                    embed.setAuthor(`Muted ${muted_name} until hell freezes over.`, 'attachment://icon.png');
                } else {
                    embed.setAuthor(`Muted ${muted_name} for ${final}.`, 'attachment://icon.png');
                }
            }
        } else {
            embed.setAuthor(`Unmuted ${muted_name}.`, 'attachment://icon.png');
        }

        m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
    }
}

/**
 * Simple handler for getting a profile for a user.
 * 
 * @param {discord.Message} m
 * @param {string} userid
 * @param {function(object)} cb
 */
TOOLS.getProfile = (m, userid, cb) => {
    memory.db.profiles.find({ member_id: userid }, (err, docs) => {
        if (err) {
            TOOLS.errorHandler({ m:m, err:err });
        } else 
        if (docs[0]) {
            cb(docs[0]);
        } else {
            let profile = {
                member_id: userid
            }

            let profilecomplete = {
                member_id: userid,
                cape: {
                    uuid: ""
                },
                medals: {
                    count: 1,
                    msgs: []
                },
                warnings: [],
                mute: {
                    start: 0,
                    end: null,
                    executor: "",
                    updater: ""
                }
            }

            /*
            let profile = {
                member_id: userid,
                cape: {
                    uuid: ""
                },
                medals: {
                    count: 0,
                    msgs: []
                },
                warnings: [],
                mute: {
                    status: 0,
                    start: 0,
                    expiration: 0,
                    executor: "",
                }
            }
            */

            memory.db.profiles.insert(profile, (err) => {
                if (err) {
                    TOOLS.errorHandler({ m:m, err:err });
                } else {
                    cb(profile);
                }
            });
        }
    });
}

TOOLS.getTargetUser = (m, target, cb) => {
    log('get user id out of '+target, 'trace');

    log(target.match(/^(<@).*(>)$/) !== null, 'trace');
    log(m.mentions.users.size > 0, 'trace');
    log(target.match(/^(<@).*(>)$/) !== null && m.mentions.users.size > 0, 'trace');

    if (target.toLowerCase() === 'me' || target.toLowerCase() === 'myself' || target.toLowerCase() === 'self') {
        cb(m.author.id, `${m.author.username}#${m.author.discriminator}`)
    } else
    if (target.match(/^(<@).*(>)$/) !== null && m.mentions.users.size > 0) {
        cb(m.mentions.users.first(1)[0].id, `${m.mentions.users.first(1)[0].username}#${m.mentions.users.first(1)[0].discriminator}`);
    } else
    if (target === "^" || target.toLowerCase() === "him" || target.toLowerCase() === "her" || target.toLowerCase() === "them" || target.toLowerCase() === "it") {
        m.channel.fetchMessages({ limit: 25 }).then(msgs => {
            let itr = msgs.values();

            (function search() {
                let thisID = itr.next();
                if (thisID.done) {
                    let embed = new discord.RichEmbed()
                    .attachFile(new discord.Attachment(memory.bot.icons.get('opti_err.png'), "icon.png"))
                    .setColor(cfg.vs.embed.error)
                    .setAuthor(`Could not find a user.`, "attachment://icon.png")
                    .setFooter('Note that this shortcut will skip yourself, and all bots. This includes OptiBot, obviously.');

                    m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                } else
                    if ([m.author.id, bot.user.id].indexOf(thisID.value.author.id) === -1 && !thisID.value.author.bot) {
                        cb(thisID.value.author.id, `${thisID.value.author.username}#${thisID.value.author.discriminator}`);
                    } else search();
            })();
        }).catch(err => TOOLS.errorHandler({ m: m, err: err }));
    } else
    if (!isNaN(target)) {
        bot.guilds.get(cfg.basic.of_server).fetchMember(target).then(mem => {
            cb(mem.user.id, `${mem.user.username}#${mem.user.discriminator}`);
        }).catch(err => {
            if (err.stack.indexOf('Invalid or uncached') > -1) {
                TOOLS.errorHandler({ err:`That user does not exist.`, m:m })
            } else {
                TOOLS.errorHandler({ m:m, err:err })
            }
        });
    } else {
        cb();
    }
}

TOOLS.cooldownHandler = (m, isAdmin) => {
    if (isAdmin) return;
    if (memory.cd.active) return;

    memory.cd.threshold++;
    log('CD: command issued', 'debug');
    log('memory.cd.threshold === ' + memory.cd.threshold, 'debug');

    if (memory.cd.timer && memory.cd.threshold > cfg.cd.ol_threshold) {
        TOOLS.statusHandler(2);
        log('COOLDOWN MODE ACTIVATED', 'warn');
        memory.cd.threshold = 0;
        memory.cd.timer = false;
        log('memory.cd.timer === ' + memory.cd.timer, 'debug');
        memory.cd.active = true;

        let timeout = new Number(cfg.cd.timer_min * memory.cd.mult);

        bot.setTimeout(() => {
            let embed = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFile(new discord.Attachment(memory.bot.icons.get('opti_timer.png'), 'timeout.png'))
                .setAuthor("OptiBot is in cooldown mode!", 'attachment://timeout.png')
                .setDescription("Please wait " + timeout + " seconds.");

            TOOLS.typerHandler(m.channel, false);
            m.channel.send("_ _", { embed: embed }).then(msg => {
                let CD_interval = 0;
                let countdown = bot.setInterval(() => {
                    timeout--;

                    if (timeout <= 0) {
                        memory.cd.active = false;

                        log('COOLDOWN MODE DEACTIVATED');
                        TOOLS.statusHandler(1);

                        msg.delete();
                        bot.clearInterval(countdown);

                        let newMult = memory.cd.mult + cfg.cd.post_timer_mult;
                        if (memory.cd.mult === 1) {
                            memory.cd.mult = newMult - 1;
                        } else {
                            (newMult > cfg.cd.timer_max) ? (memory.cd.mult = cfg.cd.timer_max) : (memory.cd.mult = newMult);
                        }

                        let extendTimer = bot.setInterval(() => {
                            if (memory.cd.mult === 1 || memory.cd.active) {
                                bot.clearInterval(extendTimer);
                            } else {
                                memory.cd.mult--;
                            }
                        }, cfg.cd.post_timer * 1000);
                    } else
                        if (cfg.cd.show_countdown) {
                            CD_interval++;
                            if (CD_interval === cfg.cd.countdown_interval) {
                                CD_interval = 0;

                                embed.description = "Please wait " + timeout + " seconds.";
                                msg.edit("_ _", { embed: embed });
                            }
                        }
                }, 1000);
            });
        }, 300);
    } else {
        memory.cd.timer = true;
        log('memory.cd.timer === ' + memory.cd.timer, 'debug');
        bot.setTimeout(() => {
            if (!memory.cd.active) {
                memory.cd.timer = false;
                log('memory.cd.timer === ' + memory.cd.timer, 'debug');
            }
        }, cfg.cd.ol_timer * 1000);
    }
}

/**
 * Gets data from parent process (bootstrapper)
 */
TOOLS.pickupData = (type, cb) => {
    let data_id = new Date().getTime();
    process.send({
        type: type,
        id: data_id
    });

    let tries = 0;
    let check = bot.setInterval(() => {
        tries++;
        let pickup = memory.bot.dataPickup[data_id];
        if(pickup) {
            if(pickup.type === type) {
                cb(pickup);
            } else {
                cb(null);
            }
            
            bot.clearInterval(check);
        } else
        if(tries > 30) {
            TOOLS.errorHandler({err: new Error(`Failed to get data "${type}" from parent node.`)});
            cb(null);

            bot.clearInterval(check);
        }
    }, 1000);
}

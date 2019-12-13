// Written by Kyle Edwards <wingedasterisk@gmail.com>, December 2019
// They put the god damn Muppets on the Game Awards show

////////////////////////////////////////////////////////////////////////////////
// Dependencies & Configuration files
////////////////////////////////////////////////////////////////////////////////

const discord = require('discord.js');
const cstr = require('string-similarity');
const wink = require('jaro-winkler');
const database = require('nedb');
const callerId = require('caller-id');

const fs = require('fs');
const util = require('util');
const events = require('events');

const cfg = require('./cfg/config.json');
const keys = require('./cfg/keys.json');
const pkg = require('./package.json');
const build = require('./data/build.json');

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
        profiles: new database({ filename: './data/profiles.db', autoload: true })
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
        cdb: [],
        log: [],
        dataPickup: {},
        botStatus: null,
        botStatusTime: new Date().getTime()
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
                    HIDDEN: false // Command is treated as non-existent to any user apart from developers.
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

memory.db.profiles.persistence.setAutocompactionInterval(100000);

const bot = new discord.Client();
bot.login(keys.discord).then(() => {
    process.title = 'Loading required assets...';
    TOOLS.statusHandler(0);
}).catch(err => {
    log(err.stack, 'fatal');
    TOOLS.shutdownHandler(24);
});

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
    if(memory.bot.botStatusTime+(1000*60*2.5) < new Date().getTime()) {
        if(memory.bot.botStatus === 0) {
            if(memory.bot.booting) {
                log(`OptiBot has maintained status ${memory.bot.botStatus} for too long. Attempting restart for good measure.`, 'warn');
                TOOLS.shutdownHandler(10);
            }
        } else {
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
        memory.bot.status_check = bot.setInterval(status_check, 1000);
        status_check();
    
        let bootTimeStart = new Date();
        let stages = []
        let stagesAsync = [];
    
        // ASYNC STAGES
    
        stagesAsync.push({
            name: "Command Sorter",
            fn: function(cb) {
                try {
                    CMD.sort();
                    cb();
                }
                catch (err) {
                    log(err.stack, 'error')
                    cb();
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
            name: "Audit Log Initial Cache",
            fn: function(cb) {
                try {
                    bot.guilds.get(cfg.basic.of_server).fetchAuditLogs({ limit: 10, type: 'MESSAGE_DELETE' }).then((audit) => {
                        try {
                            memory.bot.log = [...audit.entries.values()];
                            cb();
                        }
                        catch (err) {
                            log(err.stack, 'error')
                            cb();
                        }
                    }).catch(err => {
                        log(err.stack, 'error')
                        cb();
                    });
                }
                catch (err) {
                    log(err.stack, 'error')
                    cb();
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
                log(centerText(`OptiBot Lite ${pkg.version} (Build ${build.num})`, width));
                log(centerText(`(c) Kyle Edwards <wingedasterisk@gmail.com>, 2019`, width));
                log(centerText(`Successfully booted in ${bootTimeTaken} seconds.`, width));
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
        }).catch(err => {
            TOOLS.errorHandler({err:err});
        });
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

    let user = member.user.username + '#' + member.user.discriminator;

    log('User has joined the server: ' + user + ' (' + member.user.id + ')');

    bot.setTimeout(function () {
        if (!member.deleted && member.roles.size === 0) {
            log('10 Minute wait has expired for new user ' + user + ' (' + member.user.id + ')');
        }
    }, 600000);

    if (memory.bot.debug && cfg.superusers.indexOf(member.user.id) === -1) return;

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

                log(msg, 'warn');
            } else
            if (ad.action === 'MEMBER_BAN_ADD' && ad.target.id === member.user.id && ad.createdTimestamp + 3000 > new Date().getTime()) {
                return;
            } else {
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
    if (m.author.bot || m.author.system) return;
    if(m.channel.type === 'dm') return;

    if (m.content.toLowerCase().startsWith(`${memory.bot.trigger}obs`) && m.member.permissions.has("KICK_MEMBERS", true)) {
        log('Emergency shutdown initiated.', 'fatal');
        clearInterval(memory.bot.status_check);
        bot.destroy();
        setTimeout(() => {
            process.exit(1000);
        }, 1000);
        return;
    }

    if (memory.bot.booting) return;
    if (memory.bot.shutdown) return;
    if (cfg.channels.blacklist.indexOf(m.channel.id) > -1) return;

    let input = m.content.trim().split("\n", 1)[0];
    let cmd = input.toLowerCase().split(" ")[0].substr(1);
    let args = input.split(" ").slice(1).filter(function (e) { return e.length != 0 });
    let cmdValidator = input.match(new RegExp("\\" + memory.bot.trigger + "\\w"));

    let isSuper = cfg.superusers.indexOf(m.author.id) > -1;
    let isAdmin = m.member.permissions.has("KICK_MEMBERS", true) || m.member.roles.has(cfg.roles.junior_mod);

    memory.bot.lastInt = new Date().getTime();

    ////////////////////////////////////////////////////////////////
    // COMMANDS
    ////////////////////////////////////////////////////////////////

    if (cmdValidator && input.indexOf(cmdValidator[0]) === 0) {

        log('isAdmin: '+isAdmin, 'trace');
        log('isSuper: '+isSuper, 'trace');

        let l_tag = '';

        if(isSuper) {
            l_tag = '[DEV]';
        } else
        if(m.member.permissions.has("ADMINISTRATOR", true)) {
            l_tag = '[ADMIN]';
        } else
        if(m.member.roles.has(cfg.roles.moderator)) {
            l_tag = '[MOD]';
        } else
        if(m.member.roles.has(cfg.roles.junior_mod)) {
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
                    if (res.getMetadata().tags['HIDDEN'] && !isSuper) {
                        log('User attempted to use hidden command.', 'warn');
                        log(JSON.stringify(res.getMetadata()));
                        unknown();
                    } else
                    if ( (res.getMetadata().tags['MODERATOR_ONLY'] && !isAdmin) || (res.getMetadata().tags['NO_JR_MOD'] && m.member.roles.has(cfg.roles.junior_mod)) || (res.getMetadata().tags['DEVELOPER_ONLY'] && !isSuper) ) {
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
                        res.exec(m, args, m.member, { isAdmin: isAdmin, isSuper: isSuper });
                    }
                });
            }
        });
    }
});

////////////////////////////////////////////////////////////////////////////////
// Command Handlers
////////////////////////////////////////////////////////////////////////////////

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

        m.channel.send({ embed: embed }).then(msg => {
            TOOLS.shutdownHandler(2);
        }).catch(err => {
            TOOLS.errorHandler({ err: err });
            TOOLS.shutdownHandler(2);
        });
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

        m.channel.send({ embed: embed }).then(msg => {
            TOOLS.shutdownHandler(0);
        }).catch(err => {
            TOOLS.errorHandler({ err: err });
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
                        "user_profile_count": (err) ? `[error]` : docs.length,
                    }

                    m.channel.send(`\`\`\`json\n${JSON.stringify(data, null, 4)}\`\`\``).then(msg => { TOOLS.messageFinalize(m.author.id, msg) }).catch(err => {
                        TOOLS.errorHandler({err:err});
                    });
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
            .setTitle('https://adoptopenjdk.net/')

        m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) }).catch(err => {
            TOOLS.errorHandler({err:err});
        });
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
            .setTitle('https://sol.gfxile.net/dontask.html');

        m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) }).catch(err => {
            TOOLS.errorHandler({err:err});
        });
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
            .setTitle('https://github.com/sp614x/optifine/issues');

        m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) }).catch(err => {
            TOOLS.errorHandler({err:err});
        });
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
            .setTitle('https://bugs.mojang.com/projects/MC/summary');

        m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) }).catch(err => {
            TOOLS.errorHandler({err:err});
        });
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
            .setDescription(`This embed includes ALL official download links for every version of OptiFine. **You should not trust any other website that claims to be official.**`)
            .addField('Main Website', 'https://optifine.net/downloads')
            .addField('Alternate/Backup', 'https://optifined.net/downloads')
            .addField('Older Versions (b1.4 - 1.9)', '[OptiFine History at minecraftforum.net](https://www.minecraftforum.net/forums/mapping-and-modding-java-edition/minecraft-mods/1286605-b1-4-1-9-optifine-history)')

        m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) }).catch(err => {
            TOOLS.errorHandler({err:err});
        });
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
            .setTitle(`https://optifine.net/shaderPacks`)
            .setDescription('You can find this same link in-game, next to the "Shaders Folder" button.')

        m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) }).catch(err => {
            TOOLS.errorHandler({err:err});
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

        m.channel.send({embed: embed}).then(msg => { TOOLS.messageFinalize(m.author.id, msg) }).catch(err => {
            TOOLS.errorHandler({err:err});
        });
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

        m.channel.send({embed: embed}).then(msg => { TOOLS.messageFinalize(m.author.id, msg) }).catch(err => {
            TOOLS.errorHandler({err:err});
        });
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
            .setTitle('https://johann.loefflmann.net/en/software/jarfix/index.html');

        m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) }).catch(err => {
            TOOLS.errorHandler({err:err});
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

        m.channel.send(embed).then(msg => { TOOLS.messageFinalize(m.author.id, msg) }).catch(err => {
            TOOLS.errorHandler({err:err});
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
                        m.channel.send(new discord.Attachment(data, `${logFile}.log`)).then(msg => { TOOLS.messageFinalize(m.author.id, msg) }).catch(err => {
                            TOOLS.errorHandler({err:err});
                        });
                    }
                });
            }
        });
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
                m.channel.send("CodeMode restriction disabled.").then(msg => { TOOLS.messageFinalize(m.author.id, msg) }).catch(err => {
                    TOOLS.errorHandler({err:err});
                });
            } else {
                let embed = new discord.RichEmbed()
                .attachFile(new discord.Attachment(memory.bot.icons.get('opti_okay.png'), "icon.png"))
                .setColor(cfg.vs.embed.okay)
                .setAuthor("Mod-only Mode disabled.", "attachment://icon.png");
    
                memory.bot.locked = false;
                TOOLS.statusHandler(1);
                m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) }).catch(err => {
                    TOOLS.errorHandler({err:err});
                });
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
                                        }).catch(err => {
                                            TOOLS.errorHandler({err:err, m:m});
                                        });
                                    }).catch(err => {
                                        TOOLS.errorHandler({err:err, m:m});
                                    });
                                } else {
                                    success();
                                }
                            }).catch(err => {
                                TOOLS.errorHandler({err:err, m:m});
                            });
                        }
        
                        function success() {
                            let embed = new discord.RichEmbed()
                            .setColor(cfg.vs.embed.okay)
                            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_okay.png'), "icon.png"))
                            .setAuthor(`Channel successfully unlocked.`, 'attachment://icon.png')
        
                            m.channel.send({embed: embed}).catch(err => {
                                TOOLS.errorHandler({err:err});
                            });
                        }
                    }
                }).catch(err => {
                    TOOLS.errorHandler({err:err, m:m});
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
                m.channel.send("Code Mode restriction enabled.").then(msg => { TOOLS.messageFinalize(m.author.id, msg) }).catch(err => {
                    TOOLS.errorHandler({err:err});
                });
            } else {
                let embed = new discord.RichEmbed()
                .attachFile(new discord.Attachment(memory.bot.icons.get('opti_okay.png'), "icon.png"))
                .setColor(cfg.vs.embed.okay)
                .setAuthor("Mod-only Mode enabled.", "attachment://icon.png");
    
                memory.bot.locked = true;
                TOOLS.statusHandler(1);
                m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) }).catch(err => {
                    TOOLS.errorHandler({err:err});
                });
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
                                    }).catch(err => {
                                        TOOLS.errorHandler({err:err, m:m});
                                    });
                                }).catch(err => {
                                    TOOLS.errorHandler({err:err, m:m});
                                });
                            } else {
                                success();
                            }
                        }).catch(err => {
                            TOOLS.errorHandler({err:err, m:m});
                        });
        
                        function success() {
                            let embed = new discord.RichEmbed()
                            .setColor(cfg.vs.embed.okay)
                            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_okay.png'), "icon.png"))
                            .setAuthor(`Channel successfully locked.`, 'attachment://icon.png')
        
                            m.channel.send({embed: embed}).catch(err => {
                                TOOLS.errorHandler({err:err});
                            });
                        }
                    }
                }).catch(err => {
                    TOOLS.errorHandler({err:err, m:m});
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

            m.channel.send({embed: embed}).catch(err => {
                TOOLS.errorHandler({err:err});
            });
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

                            m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) }).catch(err => {
                                TOOLS.errorHandler({err:err});
                            });
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
                                    m.channel.send({embed: embed}).then(msg => TOOLS.messageFinalize(m.author.id, msg)).catch(err => {
                                        TOOLS.errorHandler({err:err});
                                    });
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

                                m.channel.send({embed: embed}).then(msg2 => { TOOLS.messageFinalize(m.author.id, msg2) }).catch(err => {
                                    TOOLS.errorHandler({err:err});
                                });
                            }
                        })
                    });
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
            
                                        m.channel.send({embed: embed}).then(msg2 => { TOOLS.messageFinalize(m.author.id, msg2) }).catch(err => {
                                            TOOLS.errorHandler({err:err});
                                        });
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
                .attachFile(new discord.Attachment(memory.bot.icons.get('opti_info.png'), "icon.png"))
                .setAuthor('Getting Started', 'attachment://icon.png')
                .setTitle(`WARNING: OptiBot is currently in Ultralight mode.`)
                .setDescription(`All non-essential commands and features are disabled, and only moderators are allowed to use this bot.`)
                .setThumbnail(bot.user.displayAvatarURL)
                .addField('Commands List', `\`\`\`${memory.bot.trigger}list\`\`\``)
                

            m.channel.send({ embed: embed }).then(msg => TOOLS.messageFinalize(m.author.id, msg)).catch(err => {
                TOOLS.errorHandler({err:err});
            });
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

                        if(md.tags['HIDDEN']) {
                            embed.setFooter(`This is a hidden command. OptiBot will act as if this command does not exist to any user who does not have permission.`)
                        }
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

                    m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) }).catch(err => {
                        TOOLS.errorHandler({err:err});
                    });
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
                        m.channel.send({embed: embed}).then(msg => TOOLS.messageFinalize(m.author.id, msg)).catch(err => {
                            TOOLS.errorHandler({err:err});
                        });
                    } else {
                        i++;
                        addList();
                    }
                })();
        });
    }
}));

CMD.register(new Command({
    trigger: 'mock',
    short_desc: 'MoCkInG tOnE translator',
    long_desc: 'Rewrites a message with a mOcKiNg tOnE. In other words, this will pseudo-randomize the capitalization of each letter in the given text.',
    usage: "<text|^ shortcut>",
    tags: ['DM_OPTIONAL'],
    fn: (m, args) => {
        if (!args[0]) {
            TOOLS.errorHandler({ err: "You must specify a message to translate.", m: m });
        } else {
            let translate = function(message) {
                let newStr = '';

                for(let i = 0; i < message.length; i++) {
                    let thisChar = message.charAt(i);

                    let fss = i;

                    fss ^= fss >>> 16;
                    fss ^= fss >>> 8;
                    fss ^= fss >>> 4;
                    fss ^= fss >>> 2;
                    fss ^= fss >>> 1;
                    fss = fss & 1;

                    if (fss) {
                        thisChar = thisChar.toUpperCase();
                    } else {
                        thisChar = thisChar.toLowerCase();
                    }

                    newStr += thisChar;

                    if (i+1 === message.length) {
                        m.channel.send(newStr).then(msg => { TOOLS.messageFinalize(m.author.id, msg) }).catch(err => {
                            TOOLS.errorHandler({err:err});
                        });
                    }
                }
            }

            if(args[0] !== '^') {
                translate(m.content.substring( (memory.bot.trigger + 'mock ').length ) );
            } else {
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
        
                            m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) }).catch(err => {
                                TOOLS.errorHandler({err:err});
                            });
                        } else
                        if ([m.author.id, bot.user.id].indexOf(thisID.value.author.id) === -1 && !thisID.value.author.bot) {
                            translate(thisID.value.content);
                        } else search();
                    })();
                }).catch(err => TOOLS.errorHandler({ m: m, err: err }));
            }
        }
    }
}));

CMD.register(new Command({
    trigger: 'exec',
    usage: "<js>",
    tags: ['DM_OPTIONAL', 'HIDDEN', 'DEVELOPER_ONLY'],
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
                    m.channel.send(undefined, new discord.Attachment(returnMsg, 'buffer.png'));
                } else 
                if (msg.length >= 2000) {
                    log(returnMsg, 'warn');
                    m.channel.send(`Output too long, see attached file.`, new discord.Attachment(Buffer.from(JSON.stringify(returnMsg)), 'output.json'));
                } else {
                    m.channel.send(msg);
                }
            }, 1500);
        }
        catch (err) {
            log("Error at eval(): " + err.stack, 'warn');
            let errMsg = `\`\`\`${err.stack}\`\`\``;

            if (errMsg.length >= 2000) {
                m.channel.send('Error occurred during evaluation. (Stack trace too long, see log.)');
            } else {
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
                                }).catch(err => {
                                    TOOLS.errorHandler({err:err, m:m});
                                });
                            } else {
                                member.removeRole(selected_role, `Role removed by ${m.author.username}#${m.author.discriminator}`).then(() => {
                                    let embed = new discord.RichEmbed()
                                    .setColor(cfg.vs.embed.okay)
                                    .attachFile(new discord.Attachment(memory.bot.icons.get('opti_okay.png'), "icon.png"))
                                    .setAuthor(`Successfully removed role "${role_match.bestMatch.target}" from ${member.user.username}#${member.user.discriminator}`, 'attachment://icon.png')

                                    m.channel.send({embed: embed}).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                                }).catch(err => {
                                    TOOLS.errorHandler({err:err, m:m});
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
                TOOLS.confirmationHandler(m, (result) => {
                    if (result === 1) {
                        m.channel.fetchMessages({before: m.id, limit: amount}).then(index_messages=> {
                            m.channel.bulkDelete(index_messages).then(deleted_messages => {
                                let embed = new discord.RichEmbed()
                                .setColor(cfg.vs.embed.okay)
                                .attachFile(new discord.Attachment(memory.bot.icons.get('opti_okay.png'), "icon.png"))
                                .setAuthor(`Successfully deleted ${amount} messages.`, 'attachment://icon.png');
                                
                                m.channel.send({embed: embed}).then(msg2 => { TOOLS.messageFinalize(m.author.id, msg2) }).catch(err => {
                                    TOOLS.errorHandler({err:err});
                                });
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

                        m.channel.send({embed: embed}).then(msg2 => { TOOLS.messageFinalize(m.author.id, msg2) }).catch(err => {
                            TOOLS.errorHandler({err:err});
                        });
                    } else
                    if (result === -1) {
                        let embed = new discord.RichEmbed()
                        .setColor(cfg.vs.embed.default)
                        .attachFile(new discord.Attachment(memory.bot.icons.get('opti_wait.png'), "icon.png"))
                        .setAuthor(`Request timed out.`, 'attachment://icon.png')
                        .setDescription('No messages have been deleted.')
                        
                        m.channel.send({embed: embed}).then(msg2 => { TOOLS.messageFinalize(m.author.id, msg2) }).catch(err => {
                            TOOLS.errorHandler({err:err});
                        });
                    }
                });
            }).catch(err => {
                TOOLS.errorHandler({err:err});
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

                    m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) }).catch(err => {
                        TOOLS.errorHandler({err:err});
                    });
                } else
                if (typeof profile.mute.end === 'number') {
                    let embed = new discord.RichEmbed()
                    .attachFile(new discord.Attachment(memory.bot.icons.get('opti_wait.png'), "icon.png"))
                    .setColor(cfg.vs.embed.default)
                    .setAuthor(`Mute Status`, "attachment://icon.png")
                    .setDescription(`Status of mute for user <@${target}>`)
                    .addField('Mute start date', `User was muted by <@${profile.mute.executor}> on ${new Date(profile.mute.start).toUTCString()}.`)
                    .addField('Mute end date', `User will be unmuted on ${new Date(profile.mute.end).toUTCString()}. ${(profile.mute.updater.length > 0) ? `This time limit was last updated by <@${profile.mute.updater}>` : ""} \n\n**This is an approximation.** Due to the nature of OptiBot's mute system, it may take up to 5 minutes for a user to be unmuted automatically. If it's been more than 5 minutes, or any of this information is otherwise false, please contact <@181214529340833792> immediately.`)

                    m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) }).catch(err => {
                        TOOLS.errorHandler({err:err});
                    });
                } else {
                    let embed = new discord.RichEmbed()
                    .attachFile(new discord.Attachment(memory.bot.icons.get('opti_wait.png'), "icon.png"))
                    .setColor(cfg.vs.embed.default)
                    .setAuthor(`Mute Status`, "attachment://icon.png")
                    .setDescription(`Status of mute for user <@${target}>`)
                    .addField('Mute start date', `User was muted by <@${profile.mute.executor}> on ${new Date(profile.mute.start).toUTCString()}.`)
                    .addField('Mute end date', `This user will never be unmuted. ${(profile.mute.updater.length > 0) ? `This was last updated by <@${profile.mute.updater}>` : ""} \n\nIf any of this information is false, please contact <@181214529340833792> immediately.`)

                    m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) }).catch(err => {
                        TOOLS.errorHandler({err:err});
                    });
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
            ACT_status = 'dnd';
            ACT_type = 'PLAYING';
            ACT_game = 'Ultralight Mode 🔒';
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
                    bot.setTimeout(() => {
                        if (!msg.deleted) {
                            msg.delete();
                        }
                    }, 10000);
                }).catch(err => {
                    TOOLS.errorHandler({err:err});
                });
            } else {
                data.m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(data.m.author.id, msg) }).catch(err => {
                    TOOLS.errorHandler({err:err});
                });
            }
        }
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
            } else
            if (time === null) {
                embed.setAuthor(`Muted ${muted_name} until hell freezes over.`, 'attachment://icon.png');
            } else {
                embed.setAuthor(`Muted ${muted_name} for ${final}.`, 'attachment://icon.png');
            }
        } else {
            embed.setAuthor(`Unmuted ${muted_name}.`, 'attachment://icon.png');
        }

        m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) }).catch(err => {
            TOOLS.errorHandler({err:err});
        });
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

                    m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) }).catch(err => {
                        TOOLS.errorHandler({err:err});
                    });
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
// Written by Kyle Edwards <wingedasterisk@gmail.com>, August 2019
// I put a lot of work into this, please don't redistribute it or anything.
// ========================================================================
// OptiBot 2.0 Child Node: Main Program

////////////////////////////////////////////////////////////////////////////////
// Dependencies & Configuration files
////////////////////////////////////////////////////////////////////////////////

const discord = require('discord.js');
const request = require('request');
const events = require('events');
const jimp = require('jimp');
const fs = require('fs');
const cstr = require('string-similarity');
const database = require('nedb');
const callerId = require('caller-id');
const archive = require('adm-zip');

const cfg = require('./cfg/config.json');
const keys = require('./cfg/keys.json');
const pkg = require('./package.json');
const build = require('./data/build.json');
const serverlist = require('./cfg/servers.json');
const docs_list = require('./cfg/docs.json');

////////////////////////////////////////////////////////////////////////////////
// Pre-initialize
////////////////////////////////////////////////////////////////////////////////

const log = (message, level, linenum) => {
    let cid = callerId.getData();
    let path = (cid.evalFlag) ? 'eval()' : cid.filePath;
    let filename = path.substring(path.lastIndexOf('\\')+1);
    let line = cid.lineNumber;

    process.send({
        message: message,
        level: level,
        misc: (linenum) ? linenum : filename+':'+line 
    });
}

class Command {
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
                usage: (md.usage) ? cfg.basic.trigger + md.trigger + ' ' + md.usage : cfg.basic.trigger + md.trigger,
                icon: md.icon || false,
                admin_only: md.admin_only || false,
                hidden: (typeof md.hidden === 'boolean') ? md.hidden : true,
                dm: (typeof md.dm === 'number') ? md.dm : 1 // 0 = cant use in DM, 1 = can use in DM, 2 = can ONLY use in DM
            }

            this.fn = md.fn;
        }
    }

    exec(...args) {
        this.fn(...args);
    }

    getMetadata() {
        return this.metadata;
    }
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

////////////////////////////////////////////////////////////////////////////////
// Initialize
////////////////////////////////////////////////////////////////////////////////

const memory = {
    db: {
        msg: new database({ filename: './data/messages.db', autoload: true }),
        muted: new database({ filename: './data/muted.db', autoload: true }), // REMOVE
        cape: new database({ filename: './data/vcape.db', autoload: true }), // REMOVE
        mdl: new database({ filename: './data/mdl.db', autoload: true }), // REMOVE
        mdlm: new database({ filename: './data/mdl_messages.db', autoload: true }), // REMOVE
        motd: new database({ filename: './data/motd.db', autoload: true }),
        profiles: new database({ filename: './data/profiles.db', autoload: true }),
        stats: new database({ filename: './data/statistics.db', autoload: true }),
        smr: new database({ filename: './data/smr.db', autoload: true })
    },
    bot: {
        debug: false,
        shutdown: false,
        booting: true,
        locked: false,
        lastInt: 0,
        startup: process.argv[3],
        icons: new ImageIndex(),
        images: new ImageIndex(),
        smr: [],
        docs: [],
        docs_cat: {},
        cdb: [],
        limitRemove: new events.EventEmitter().setMaxListeners(cfg.db.size + 1),
        alog: 0,
        log: [],
        servers: {},
        avatar: {},
        status: {},
        motd: {},
    },
    stats: {
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
    debug: {
        SLOT0: undefined,
        SLOT1: undefined,
        SLOT2: undefined,
        SLOT3: undefined,
        SLOT4: undefined,
        SLOT5: undefined,
        SLOT6: undefined,
        SLOT7: undefined,
        SLOT8: undefined,
        SLOT9: undefined
    }
}
const TOOLS = {}
const CMD = {
    // Command Registry
    index: [],
    register(cmd) {
        if (cmd instanceof Command) {
            log('command registered: ' + cmd.getMetadata().trigger, 'trace');
            this.index.push(cmd);
        } else {
            throw new Error('Command must be an instance of class Command');
        }
    },
    sort() {
        this.index.sort((a, b) => a.getMetadata().trigger.localeCompare(b.getMetadata().trigger));
    },
    getAll(cb) {
        cb(this.index);
    },
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

if (process.argv[2] === 'true') {
    log('OPTIBOT RUNNING IN DEBUG MODE', 'warn');
    memory.bot.debug = true;
}

log('Logging into Discord API...', 'warn');
process.title = 'Logging in...';

memory.db.msg.persistence.setAutocompactionInterval(300000);
memory.db.profiles.persistence.setAutocompactionInterval(100000);
memory.db.stats.persistence.setAutocompactionInterval(10000);

const bot = new discord.Client();
bot.login(keys.discord).then(() => {
    process.title = 'Loading required assets...';
    log('Successfully logged in using token: ' + keys.discord, 'debug');
    TOOLS.statusHandler(0);
}).catch(err => {
    log(err.stack, 'fatal');
    TOOLS.shutdownHandler(24);
});

memory.bot.activity_check = bot.setInterval(() => {
    if (!memory.bot.shutdown && !memory.bot.booting) {
        log('begin activity_check', 'trace');
        bot.user.setStatus(memory.activity.status);
        bot.user.setActivity(memory.activity.game, { url: memory.activity.url, type: memory.activity.type });
    }
}, 900000);

memory.bot.mute_check = bot.setInterval(() => {
    if (!memory.bot.shutdown && !memory.bot.booting) {
        log('begin mute_check', 'trace');
        TOOLS.muteHandler();
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
                    } else {
                        if (Object.keys(docs[i]).length === 3 && docs[i].warns && docs[i].warns.current.length === 0) {
                            bot.guilds.get(cfg.basic.of_server).fetchMember(docs[i].member_id).catch((err) => {
                                if (err.message.toLowerCase().indexOf('invalid or uncached id provided') > -1 || err.message.toLowerCase().indexOf('unknown member') > -1) {
                                    log('insignificant profile found', 'trace');
                                    remove_list.push(docs[i].member_id);
                                } else {
                                    TOOLS.errorHandler({ err: err });
                                }
                            })
                        }
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
        log('begin warn_check', 'trace');
        memory.db.profiles.find({ warns: { $exists: true } }, (err, docs) => {
            if (err) {
                TOOLS.errorHandler({ err: err });
            } else 
            if (!docs[0]) {
                log('No users with warnings.', 'debug');
            } else {
                let i = 0;
                let warns_expired = 0;
                (function loopover() {
                    if (i === docs.length) {
                        if (warns_expired > 0) {
                            log(`${warns_expired} user warnings have expired.`);

                        } else {
                            log(`No user warnings have expired.`, 'debug');
                        }
                    } else
                    if (docs[i].warns.current.length === 0) {
                        i++;
                        loopover();
                    } else {
                        for(let i2 in docs[i].warns.current) {
                            if (new Date().getTime() > docs[i].warns.current[i2].expiration) {
                                delete docs[i].warns.current[i2];
                                warns_expired++;
                            }

                            if (parseInt(i2)+1 === docs[i].warns.current.length) {
                                i++;
                                loopover();
                            }
                        }
                    }
                })();

                for(let i in docs) {
                    if (Object.keys(docs[i]).length === 1 || (Object.keys(docs[i]).length === 2 && docs[i].warns && docs[i].warns.current.length === 0)) {
                        remove_list.push(docs[i].member_id);
                    }

                    if (i+1 === docs.length) {
                        if (remove_list.length === 0) {
                            log(`All current users in database have some significant data.`, 'debug');
                        } else {
                            remove_loop();
                        }
                    }
                }
            }
        })
    }
}, 300000);

////////////////////////////////////////////////////////////////////////////////
// Event Handlers
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////
// Bot Ready Event
////////////////////////////////////////

bot.on('ready', () => {
    (function bootS1() {
        log('Initialization: Booting (Stage 1, Sub-Op 1)');
        let timeStart = new Date();
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
            log('Initialization: Booting (Stage 1, Sub-Op 2)', 'debug');
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
                                        let timeEnd = new Date();
                                        let timeTaken = (timeEnd.getTime() - timeStart.getTime()) / 1000;
                                        log(`Successfully loaded all images in ${timeTaken} seconds.`);
                                        bootS2();
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
    })();

    function bootS2() {
        log('Initialization: Booting (Stage 2, Sub-Op 1)');
        let timeStart = new Date();
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
            log('Initialization: Booting (Stage 2, Sub-Op 2)', 'debug');
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
                                    let timeEnd = new Date();
                                    let timeTaken = (timeEnd.getTime() - timeStart.getTime()) / 1000;
                                    log(`Successfully loaded GitHub documentation in ${timeTaken} seconds.`);
                                    bootS3();
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

    function bootS3() {
        log('Initialization: Booting (Stage 3, Sub-Op 1)');
        let timeStart = new Date();
        try {
            memory.db.msg.find({}, (err, docs) => {
                try {
                    if (err) {
                        throw err
                    } else {
                        let i = 0;
        
                        (function fetchNext() {
                            try {
                                if (i === docs.length) {
                                    let timeEnd = new Date();
                                    let timeTaken = (timeEnd.getTime() - timeStart.getTime()) / 1000;
                                    log(`Successfully loaded bot messages in ${timeTaken} seconds.`);
                                    bootS4();
                                } else {
                                    bot.guilds.get(docs[i].guild).channels.get(docs[i].channel).fetchMessage(docs[i].message).then(m => {
                                        try {
                                            if (m.deleted) {
                                                i++
                                                fetchNext();
                                            } else {
                                                let getEmoji = m.reactions.find(rct => rct.emoji.id === '572025612605325322');
                                                if (!getEmoji) {
                                                    m.react(bot.guilds.get(cfg.basic.ob_server).emojis.get('572025612605325322')).catch(err => log('Failed to react to message: ' + err.stack, 'error'));
                
                                                    i++
                                                    fetchNext();
                                                } else {
                                                    getEmoji.fetchUsers().then(u => {
                                                        try {
                                                            if (u.has(docs[i].user)) {
                                                                memory.db.msg.remove(docs[i], (err) => {
                                                                    if (err) {
                                                                        log(err.stack, 'error');
                                                                        m.delete();
                                                                        i++
                                                                        fetchNext();
                                                                    } else {
                                                                        log('message removed from cache', 'debug');
                                                                        m.delete();
                                                                        i++
                                                                        fetchNext();
                                                                    }
                                                                });
                                                            } else {
                                                                TOOLS.deleteMessageHandler({stage:2, m:m, userid:docs[i].user, cacheData:docs[i]});
                                                                let rri = 0;
                                                                let rUsers = u.firstKey(100);
                                                                (function reactRemove() {
                                                                    try {
                                                                        if (rUsers[rri] === undefined) {
                                                                            i++;
                                                                            fetchNext();
                                                                        } else
                                                                        if (rUsers[rri] === bot.user.id) {
                                                                            rri++;
                                                                            reactRemove();
                                                                        } else {
                                                                            m.reactions.get('click_to_delete:572025612605325322').remove(rUsers[rri]);
                                                                            rri++;
                                                                            reactRemove();
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
                                                    }).catch(err => {
                                                        log('Failed to fetch users from message: ' + err.stack, 'error');
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
                                        log('Failed to load cached message: ' + err.stack, 'error');
                                        i++
                                        fetchNext();
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

    function bootS4() {
        log('Initialization: Booting (Stage 4)');
        let timeStart = new Date();
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
                                    smr_data.push(sitelist[i].domain);
                                    log('item added', 'trace');
        
                                    if(i+1 >= sitelist.length) {
                                        memory.bot.smr = smr_data;
            
                                        let timeEnd = new Date();
                                        let timeTaken = (timeEnd.getTime() - timeStart.getTime()) / 1000;
                                        log(`Successfully updated SMR database in ${timeTaken} seconds.`);
                                        bootS5();
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

    function bootS5() {
        log('Initialization: Booting (Stage 5)');
        let timeStart = new Date();
        try {
            bot.guilds.get(cfg.basic.of_server).fetchAuditLogs({ limit: 10, type: 'MESSAGE_DELETE' }).then((audit) => {
                try {
                    memory.bot.log = [...audit.entries.values()];
    
                    let timeEnd = new Date();
                    let timeTaken = (timeEnd.getTime() - timeStart.getTime()) / 1000;
                    log(`Successfully updated Audit Log cache in ${timeTaken} seconds.`);
                    bootS6()
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

    function bootS6() {
        log('Initialization: Booting (Stage 6)');
        let timeStart = new Date();
        try {
            CMD.sort();
            let timeEnd = new Date();
            let timeTaken = (timeEnd.getTime() - timeStart.getTime()) / 1000;
            log(`Successfully sorted commands list in ${timeTaken} seconds.`);
            bootS7();
        }
        catch (err) {
            log(err.stack, 'fatal')
            TOOLS.shutdownHandler(24);
        }
    }

    function bootS7() {
        log('Initialization: Booting (Stage 7)');
        let timeStart = new Date();
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
                        let timeEnd = new Date();
                        let timeTaken = (timeEnd.getTime() - timeStart.getTime()) / 1000;
                        log(`Successfully parsed server list in ${timeTaken} seconds.`);
                        bootS8();
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

    function bootS8() {
        log('Initialization: Booting (Stage 8)');
        let timeStart = new Date();
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

                                let timeEnd = new Date();
                                let timeTaken = (timeEnd.getTime() - timeStart.getTime()) / 1000;
                                log(`Successfully generated bot avatar in ${timeTaken} seconds.`);
                                bootS9();
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

    function bootS9() {
        log('Initialization: Booting (Stage 9)');
        let timeStart = new Date();

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
                            .setDescription(`Please be sure to read the <#479192475727167488> BEFORE posting, not to mention the <#531622141393764352>. If you're a donator, use the command \`${cfg.basic.trigger}help dr\` for instructions to get your donator role.`)
                            .setFooter('Thank you for reading!')
                        
                        if (docs[0] && docs[0].message.length > 0) {
                            embed.addField(`A message from Moderators (Posted on ${docs[0].date.toUTCString()})`, docs[0].message);
                        }
        
                        memory.bot.motd = embed;
        
                        let timeEnd = new Date();
                        let timeTaken = (timeEnd.getTime() - timeStart.getTime()) / 1000;
                        log(`Successfully generated MOTD in ${timeTaken} seconds.`);
                        bootS10()
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

    function bootS10() {
        log('Initialization: Booting (Stage 10)');
        let timeStart = new Date();

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
                        let timeEnd = new Date();
                        let timeTaken = (timeEnd.getTime() - timeStart.getTime()) / 1000;
                        log(`Successfully parsed categorized documentation in ${timeTaken} seconds.`);
                        bootS11()
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

    function bootS11() {
        log('Initialization: Booting (Stage 11)');
        let timeStart = new Date();

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
                    let timeEnd = new Date();
                    let timeTaken = (timeEnd.getTime() - timeStart.getTime()) / 1000;
                    log(`Successfully loaded statistics module in ${timeTaken} seconds.`);
                    finalReady();
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

    function finalReady() {
        try {
            memory.bot.booting = false;
            if (memory.bot.debug) memory.bot.locked = true;

            TOOLS.statusHandler(1);

            let width = 60; //inner width of box
            function centerText(text, totalWidth) {
                try {
                    let leftMargin = Math.floor((totalWidth - (text.length)) / 2);
                    let rightMargin = Math.ceil((totalWidth - (text.length)) / 2);

                    return '//' + (' '.repeat(leftMargin)) + text + (' '.repeat(rightMargin)) + '//';
                }
                catch (err) {
                    log(err.stack, 'fatal')
                    TOOLS.shutdownHandler(24);
                }
            }

            log('/'.repeat(width + 4));
            log(centerText(`  `, width));
            log(centerText(`OptiBot ${pkg.version} (Build ${build.num})`, width));
            log(centerText(TOOLS.randomizer(cfg.splash), width));
            log(centerText(`(c) Kyle Edwards <wingedasterisk@gmail.com>, 2019`, width));
            log(centerText(`  `, width));
            log('/'.repeat(width + 4));

            process.title = `OptiBot ${pkg.version} (Build ${build.num}) - ${Math.round(bot.ping)}ms Response Time`;

            memory.bot.title_check = bot.setInterval(() => {
                if (!memory.bot.shutdown) process.title = `OptiBot ${pkg.version} (Build ${build.num}) - ${Math.round(bot.ping)}ms Response Time`;
            }, 1000);
        }
        catch (err) {
            log(err.stack, 'fatal')
            TOOLS.shutdownHandler(24);
        }
    }
});

////////////////////////////////////////
// Message Reaction Add
////////////////////////////////////////

bot.on('messageReactionAdd', (mr, user) => {
    if (mr.message.channel.type === 'dm') return;
    if (mr.message.guild.id !== cfg.basic.of_server) return;
    if (user.id === bot.user.id) return;
    if (mr.message.author.id === bot.user.id) return;

    if (mr.emoji.name === '🏅') {
        bot.guilds.get(cfg.basic.of_server).fetchMember(user.id).then((member) => {
            if (member.permissions.has("KICK_MEMBERS", true)) {
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
    }
});

////////////////////////////////////////
// Message Deleted Event
////////////////////////////////////////

bot.on('messageDelete', m => {
    if (m.channel.type === 'dm') return;
    if (m.guild.id !== cfg.basic.of_server) return;
    if (m.author.system || m.author.bot) return;
    if (memory.bot.shutdown) return;
    if (memory.bot.booting) return;
    if (m.content.toLowerCase().startsWith(`${cfg.basic.trigger}dr`)) return;

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
    }, 500);
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
    if (m.content.toLowerCase().startsWith(`${cfg.basic.trigger}dr`)) return;

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

    if (memory.bot.debug && cfg.superusers.indexOf(member.user.id) === -1) return;

    member.send({ embed: memory.bot.motd }).catch((err) => {
        if (err.code === 50007) {
            log('Could not send MOTD to new member ' + user + ' (User has server DMs disabled)', 'warn');
        } else {
            log('Could not send MOTD to new member ' + user + ': ' + err.stack, 'error');
        }
    });

    bot.setTimeout(function () {
        if (!member.deleted && member.roles.size > 0) {
            log('10 Minute wait has expired for new user ' + user + ' (' + member.user.id + ')');
        }
    }, 600000);

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

    if (m.channel.type !== 'dm' && m.content.toLowerCase().startsWith(`${cfg.basic.trigger}obs`) && m.member.permissions.has("KICK_MEMBERS", true)) {
        log('Emergency shutdown initiated.', 'fatal');
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
    let cmdValidator = input.match(new RegExp("\\" + cfg.basic.trigger + "\\w"));

    let isSuper = cfg.superusers.indexOf(m.author.id) > -1;

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

    bot.guilds.get(cfg.basic.of_server).fetchMember(m.author.id).then(member => {
        let isAdmin = member.permissions.has("KICK_MEMBERS", true);

        if (memory.cd.active && !isAdmin && !isSuper) return; // bot is in cooldown mode and the user does not have mod/superuser permissions

        if (memory.bot.locked && !isAdmin && !isSuper) return; // bot is in mods-only mode and the user is not a mod/superuser.

        memory.bot.lastInt = new Date().getTime();

        if (cmdValidator && input.indexOf(cmdValidator[0]) === 0) {
            ////////////////////////////////////////////////////////////////
            // COMMANDS
            ////////////////////////////////////////////////////////////////

            memory.db.stats.update({day: new Date().getDate()}, { $inc: { commands: 1 } }, (err) => {
                if (err) TOOLS.errorHandler({err:err});
            });

            log('isAdmin: '+isAdmin, 'trace');
            log('isSuper: '+isSuper, 'trace');

            TOOLS.typerHandler(m.channel, true);
            TOOLS.cooldownHandler(m, (isAdmin || isSuper));

            log(`${(isAdmin) ? "[ADMIN] " : ""}${(isSuper) ? "[SUDO] " : ""}COMMAND ISSUED BY ${m.author.username}#${m.author.discriminator}: ${cfg.basic.trigger+cmd} ${(cmd === 'dr') ? args.join(' ').replace(/\S/gi, '*') : args.join(' ')}`);

            bot.setTimeout(() => {
                TOOLS.confirmationFinder({ member_id: m.author.id, channel_id: m.channel.id }, (index) => {
                    if (index > -1 && cmd !== 'confirm' && cmd !== 'cancel') {
                        TOOLS.errorHandler({ err: 'You cannot use other commands until you confirm or cancel your previous request.', m: m });
                    } else {
                        CMD.get(cmd, (res) => {
                            function unknown() {
                                let embed = new discord.RichEmbed()
                                    .setColor(cfg.vs.embed.default)
                                    .attachFile(new discord.Attachment(memory.bot.icons.get('opti_info.png'), "icon.png"))
                                    .setAuthor('Unknown command. Type ' + cfg.basic.trigger + 'list for a list of commands.', 'attachment://icon.png');

                                CMD.getAll((list) => {
                                    let filtered;
                                    let commands_list = [];
                                    if (isSuper && m.channel.type === 'dm') {
                                        filtered = list
                                    } else
                                    if (isAdmin) {
                                        filtered = list.filter((cmd2) => (cmd2.getMetadata().hidden === false));
                                    } else {
                                        filtered = list.filter((cmd2) => (cmd2.getMetadata().admin_only === false && cmd2.getMetadata().hidden === false));
                                    }

                                    filtered.forEach((cmd3) => {
                                        commands_list.push(cmd3.getMetadata().trigger)
                                    });

                                    let closest = cstr.findBestMatch(cmd, commands_list);

                                    log(commands_list, 'trace')
                                    log(closest.bestMatch, 'trace')

                                    if (closest.bestMatch.rating > 0.2) {
                                        embed.setDescription(`Perhaps you meant \`${cfg.basic.trigger}${closest.bestMatch.target}\`? (${(closest.bestMatch.rating * 100).toFixed(1)}% match)`)
                                    }

                                    m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                                });
                            }

                            if (!res) {
                                log('unknown cmd', 'trace');
                                unknown();
                            } else
                            if (res.getMetadata().hidden && !isSuper) {
                                log('User attempted to use hidden command.', 'warn');
                                log(JSON.stringify(res.getMetadata()));
                                unknown();
                            } else
                            if (res.getMetadata().admin_only && !isAdmin) {
                                log(res.getMetadata().admin_only && !isAdmin);
                                TOOLS.errorHandler({ err: 'You do not have permission to use this command.', m: m });
                            } else
                            if (res.getMetadata().dm === 0 && m.channel.type === 'dm') {
                                TOOLS.errorHandler({ err: 'This command can only be used in server chat.', m: m });
                            } else
                            if (res.getMetadata().dm === 2 && m.channel.type !== 'dm' && (!isAdmin || !isSuper)) {
                                m.delete();
                                TOOLS.errorHandler({ err: 'This command can only be used in DMs.', m: m, temp: true });
                            } else {
                                bot.setTimeout(() => {
                                    res.exec(m, args, member, { isAdmin: isAdmin, isSuper: isSuper });
                                }, 300);
                            }
                        });
                    }
                });
            }, 100);
        } else {
            ////////////////////////////////////////////////////////////////
            // ASSISTANTS
            ////////////////////////////////////////////////////////////////

            if (m.channel.type === 'dm') {
                let embed = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFile(new discord.Attachment(memory.bot.icons.get('opti_info.png'), "icon.png"))
                .setAuthor(`Hi there! For a list of commands, type "${cfg.basic.trigger}list". If you've donated and you would like to receive your donator role, type "${cfg.basic.trigger}help dr" for detailed instructions.`, 'attachment://icon.png');

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
                            .setAuthor('StopModReposts', 'attachment://icon.png')
                            .setDescription(`A link to an illegal Minecraft mod website was detected in [this](${m.url}) message. Remember to avoid suspicious links, and proceed with caution. \nhttps://stopmodreposts.org/`)
                            .addField("Detected URL(s)", "```" + foundLinks.join(', ') + "```");

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
            if (m.content.toLowerCase().indexOf('r/') > -1) {
                log('possible subreddits match', 'trace');
                //remove everything in quotes, single-line codeblocks, multi-line codeblocks, and strikethroughs.
                let filtered = m.content.replace(/"[^"]+"|`{3}[^```]+`{3}|~{2}[^~~]+~{2}|`{1}[^`]+`{1}|<[^<>]+>/gi, "");

                let rgx = filtered.match(/(?<=\s|^)(?:\/?)r\/[a-z_]{3,20}\b/gi);
                let urls = [];
                let urls_final = [];
                let limit = 4;
                let requestLimit = 8;
                let limited = false;
                let delay = 500;

                if (rgx) {
                    log('found subreddits match', 'trace');
                    TOOLS.typerHandler(m.channel, true);
                    rgx.forEach(e => {
                        let link = 'https://www.reddit.com/subreddits/search.json?q='+e.substring(2)+'&limit=1';
                        if (e.startsWith('/')) {
                            link = 'https://www.reddit.com/subreddits/search.json?q='+e.substring(3)+'&limit=1';
                        }
                        
                        if (urls.indexOf(link) === -1) {
                            urls.push(link);
                        }
                    });

                    log(urls, 'trace');

                    let i = 0;
                    (function requestLoop() {
                        log("looking at: "+urls[i], 'trace');
                        request({url: urls[i], headers: { 'User-Agent': 'optibot' } }, (err, res, body) => {
                            if (err || !res || !body) {
                                TOOLS.errorHandler({ err: err || new Error('Failed to get a response from the Reddit API'), m:m });
                            } else 
                            if (res.statusCode !== 200) {
                                TOOLS.errorHandler({ err: new Error('Unexpected status code '+res.statusCode), m:m });
                            } else {
                                log(body, 'trace');
                                let json = JSON.parse(body);

                                if (json.kind === "Listing" && json.data.children.length > 0 && json.data.children[0].kind === "t5") {
                                    let firstResult = json.data.children[0].data;
                                    urls_final.push(`[${firstResult.display_name_prefixed}](https://www.reddit.com${firstResult.url})`);
                                }

                                if (urls_final.length === limit && urls[i+1] !== undefined) {
                                    limited = true;
                                }

                                if (limited || i+1 === requestLimit || i+1 >= urls.length) {
                                    log("done", 'trace');
                                    if (urls_final.length !== 0) {
                                        let embed = new discord.RichEmbed()
                                            .setColor(cfg.vs.embed.default)
                                            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_reddit.png'), "icon.png"))
                                            .setAuthor('Subreddit Matcher', 'attachment://icon.png')
                                            .setDescription(`In response to [this](${m.url}) message...\n\n${urls_final.join('\n')}`);

                                        if (limited) {
                                            embed.setFooter(`Other subreddits were omitted to prevent spam.`)
                                        } else
                                        if (i+1 === requestLimit) {
                                            embed.setFooter(`Other subreddits were omitted to prevent ratelimiting.`)
                                        }

                                        m.channel.send({embed: embed}).then(msg => TOOLS.messageFinalize(m.author.id, msg));
                                    } else {
                                        TOOLS.errorHandler({ err: 'Could not find any subreddits.', m:m, temp:true });
                                    }
                                } else {
                                    i++;
                                    if (i === 5) delay = 1000;
                                    bot.setTimeout(() => {
                                        requestLoop();
                                    }, delay);
                                }
                            }
                        });
                    })();
                }
            }

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
                m.react(bot.guilds.get(cfg.basic.ob_server).emojis.get('588182322944278528'));
            }

            if (m.content.toLowerCase() === 'band' && isAdmin) {
                m.react('🎺').then(()=>{
                    m.react('🎸').then(()=>{
                        m.react('🥁').then(()=>{
                            m.react('🎤');
                        });
                    });
                });
            }
        }
    }).catch(err => {
        if (err.code === 10007) {
            TOOLS.errorHandler({ err: 'Sorry, you must be a member of the OptiFine Discord server to use this bot.', m: m });
        } else {
            throw (err);
        }
    });
});

////////////////////////////////////////////////////////////////////////////////
// Command Handlers
////////////////////////////////////////////////////////////////////////////////

CMD.register(new Command({
    trigger: 'crash',
    short_desc: "Throws an error that won't be catched.",
    long_desc: "It crashes the bot. Literally. There's no fanfare at all, just a single line of code here using the `throw` statement.",
    fn: (m) => {
        throw new Error('User-initiated error.');
    }
}));

CMD.register(new Command({
    trigger: 'obs',
    short_desc: 'Emergency Shutoff',
    long_desc: `To be used in the event that OptiBot encounters a fatal error and does not shut down automatically. This should especially be used in the case of the bot spamming a text channel. \n\n**This is a last resort option, which could potentially corrupt data if used incorrectly. If at all possible, you should attempt to use the \`${cfg.basic.trigger}stop\` command first.**`,
    admin_only: true,
    hidden: false,
    dm: 0,
    fn: (m) => {
        log('Emergency shutdown initiated.', 'fatal');
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
    admin_only: true,
    hidden: false,
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
    admin_only: true,
    hidden: true,
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
    admin_only: true,
    hidden: false,
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
    trigger: 'members',
    short_desc: 'Show member count.',
    long_desc: 'Displays the number of people in the Discord server, as well as the number of subscribers on the r/OptiFine subreddit.',
    hidden: false,
    fn: (m) => {
        request({ url: "https://api.reddit.com/r/Optifine/about/", headers: { 'User-Agent': 'optibot' } }, (err, res, body) => {
            function final(reddit_res) {
                let embed = new discord.RichEmbed()
                    .setColor(cfg.vs.embed.default)
                    .attachFile(new discord.Attachment(memory.bot.icons.get('opti_member.png'), "icon.png"))
                    .setAuthor('Member Count', 'attachment://icon.png')
                    .addField('Discord', '[' + bot.guilds.get(cfg.basic.of_server).memberCount + ' members](https://discord.gg/3mMpcwW)')
                    .addField('Reddit', reddit_res);

                m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
            }

            if (err || !res || !body) {
                let errmsg = "Failed to get a response from the Reddit API"
                TOOLS.errorHandler({ err: err || new Error(errmsg) });
                final(errmsg);
            } else {
                let redata = JSON.parse(body);
                final('[' + redata.data.subscribers + ' subscribers](https://www.reddit.com/r/OptiFine/)');
            }
        });

    }
}));

CMD.register(new Command({
    trigger: 'ping',
    short_desc: 'Websocket ping.',
    admin_only: true,
    fn: (m) => {
        m.channel.send(Math.round(bot.ping) + "ms").then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
    }
}));

CMD.register(new Command({
    trigger: 'reddit',
    short_desc: 'Provides a link to the official OptiFine subreddit.',
    hidden: false,
    fn: (m) => {
        let embed = new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_reddit.png'), "icon.png"))
            .setAuthor('OptiFine Official Subreddit', 'attachment://icon.png')
            .setDescription('https://www.reddit.com/r/OptiFine/');

        m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
    }
}));

CMD.register(new Command({
    trigger: 'jre',
    short_desc: 'Provides a link to download AdoptOpenJDK',
    hidden: false,
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
    long_desc: 'Displays basic information about OptiBot, including credits and the current version.',
    hidden: false,
    fn: (m) => {
        let pkg2 = JSON.parse(fs.readFileSync('./node_modules/discord.js/package.json'));

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
            .setDescription('The official OptiFine Discord server bot. Developed independently by <@181214529340833792> out of love for a great community.')
            .addField('OptiBot', `Version ${pkg.version}\n(Build ${build.num})`, true)
            .addField('Uptime', `Session: ${uptime(process.uptime() * 1000)}\nTotal: ${uptime(new Date().getTime() - memory.bot.startup)}`, true)
            .addField('Discord.js', `Version ${pkg2.version}`, true)
            .addField('Node.js', `Version ${process.version.replace('v', '')}`, true)
            .addField('Contributors', cntbrs.join(', '))
            .addField('Donators', dntrs.join(', '))

        m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
    }
}));

CMD.register(new Command({
    trigger: 'offtopic',
    short_desc: "Go directly to <#426005631997181963>.",
    long_desc: "Go directly to <#426005631997181963>. Do not pass go, do not collect $200.",
    hidden: false,
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
    hidden: false,
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
    trigger: 'unlock',
    short_desc: "Disables usage restriction.",
    long_desc: "Disables usage restriction, AKA Mods-Only mode.",
    admin_only: true,
    hidden: false,
    dm: 0,
    fn: (m) => {
        if (memory.bot.debug) {
            memory.bot.locked = false;
            TOOLS.statusHandler(1);
            m.channel.send("CodeMode restriction disabled.").then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
        } else 
        if (!memory.bot.locked) {
            TOOLS.errorHandler({ err: "Mod Mode is already disabled.", m: m });
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
}));

CMD.register(new Command({
    trigger: 'lock',
    short_desc: "Enables usage restriction.",
    long_desc: "Enables usage restriction, AKA Mod-Only Mode.",
    admin_only: true,
    hidden: false,
    dm: 0,
    fn: (m) => {
        if (memory.bot.debug) {
            memory.bot.locked = true;
            TOOLS.statusHandler(1);
            m.channel.send("CodeMode restriction enabled.").then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
        } else
        if (memory.bot.locked) {
            TOOLS.errorHandler({ err: "Mod Mode is already enabled.", m: m });
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
}));

CMD.register(new Command({
    trigger: 'perms',
    short_desc: "Lists OptiBot's permissions",
    long_desc: "Lists all Discord permissions, and whether they are enabled for OptiBot.",
    hidden: true,
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
    admin_only: true,
    hidden: false,
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
    short_desc: "Don't ask to ask, just ask.",
    hidden: false,
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
    hidden: false,
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
    hidden: false,
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
    hidden: false,
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
    hidden: false,
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
        let s = (`<:spacer:621259217193402370>`);



        let rules = [
            `Do not spam.`,
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
        .setDescription(`${s}â˘ `+content.join(`\n${s}â˘ `));



        let guidelines = [
            `Use common sense. Please. It's not difficult, I promise.`,
            `**PLEASE** at least try reading the #faq, channel descriptions, pinned messages, #announcements, and recent chat history **BEFORE** blindly posting a question.`,
            `This is an English-speaking server. If you cannot fluently write in English, please try using a translator.`,
            `If you see something, say something. We encourage you to ping @moderator if you notice someone breaking the rules.`,
            `If you'd like to invite a friend to this server, we encourage you to use this permanent invite link: \`\`\`https://discord.gg/3mMpcwW\`\`\` `
        ]

        let guidelines_embed = new discord.RichEmbed()
        .attachFile(new discord.Attachment(memory.bot.icons.get('opti_okay.png'), "icon.png"))
        .setColor(cfg.vs.embed.okay)
        .setAuthor("Guidelines & Other Things", 'attachment://icon.png')
        .setDescription(`${s}â˘ `+guidelines.join(`\n${s}â˘ `));

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
    trigger: 'open',
    short_desc: "Open text channel.",
    long_desc: "Opens the active text channel, if already closed.",
    admin_only: true,
    hidden: false,
    dm: 0,
    fn: (m) => {
        m.guild.fetchMember(bot.user.id).then(bot_member => {
            let everyone = m.channel.permissionOverwrites.get(m.guild.id);
            if (m.channel.memberPermissions(bot_member).serialize().MANAGE_ROLES_OR_PERMISSIONS === false) {
                TOOLS.errorHandler({ err: "OptiBot does not have permission to modify this channel.", m:m });
            } else 
            if (everyone && new discord.Permissions(everyone.allow).serialize().SEND_MESSAGES === true) {
                TOOLS.errorHandler({ err: "Channel is already open.", m:m });
            } else {
                {
                    let permissions = {
                        SEND_MESSAGES: null
                    }
            
                    m.channel.overwritePermissions(m.guild.id, permissions, `Channel opened by ${m.author.username}#${m.author.discriminator}.`).then(() => {
                        if (m.channel.memberPermissions(bot_member).serialize().SEND_MESSAGES === false) {
                            m.channel.overwritePermissions(bot_member, { SEND_MESSAGES: true }, `Allowing OptiBot and Moderators to bypass.`).then(() => {
                                // cfg.roles.moderator
                                m.channel.overwritePermissions('518607343357788191', { SEND_MESSAGES: true }, `Allowing OptiBot and Moderators to bypass.`).then(() => {
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
                    .setAuthor(`Channel successfully opened.`, 'attachment://icon.png')

                    m.channel.send({embed: embed}).then(msg => { TOOLS.typerHandler(msg.channel, false); });
                }
            }
        });
    }
}));

CMD.register(new Command({
    trigger: 'close',
    short_desc: "Close text channel.",
    long_desc: "Closes the active text channel, preventing users from sending messages. Only works if the channel is already open, obviously.",
    admin_only: true,
    hidden: false,
    dm: 0,
    fn: (m) => {
        m.guild.fetchMember(bot.user.id).then(bot_member => {
            let everyone = m.channel.permissionOverwrites.get(m.guild.id);
            if (m.channel.memberPermissions(bot_member).serialize().MANAGE_ROLES_OR_PERMISSIONS === false) {
                TOOLS.errorHandler({ err: "OptiBot does not have permission to modify this channel.", m:m });
            } else 
            if (everyone && new discord.Permissions(everyone.deny).serialize().SEND_MESSAGES === true) {
                TOOLS.errorHandler({ err: "Channel is already closed.", m:m });
            } else {
                {
                    let permissions = {
                        SEND_MESSAGES: false
                    }
            
                    m.channel.overwritePermissions(m.guild.id, permissions, `Channel closed by ${m.author.username}#${m.author.discriminator}.`).then(() => {
                        if (m.channel.memberPermissions(bot_member).serialize().SEND_MESSAGES === false) {
                            m.channel.overwritePermissions(bot_member, { SEND_MESSAGES: true }, `Allowing OptiBot and Moderators to bypass.`).then(() => {

                                m.channel.overwritePermissions('518607343357788191', { SEND_MESSAGES: true }, `Allowing OptiBot and Moderators to bypass.`).then(() => {
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
                    .setAuthor(`Channel successfully closed.`, 'attachment://icon.png')

                    m.channel.send({embed: embed}).then(msg => { TOOLS.typerHandler(msg.channel, false); });
                }
            }
        });
    }
}));

CMD.register(new Command({
    trigger: 'goodboy',
    short_desc: "Good boy!",
    hidden: false,
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
    hidden: false,
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
    long_desc: `Provides a link to download Jarfix, a tool to fix .jar filetype associations.`,
    hidden: false,
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
    hidden: false,
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
    trigger: 'cdb',
    fn: (m) => {
        let finaldocs = {}
        let finaldata = [];

        let i = 0;
        (function loadNextExisting() {
            let list = ['muted', 'cape', 'mdl'];
            memory.db[[list[i]]].find({}, (err, docs) => {
                if (err) {
                    TOOLS.errorHandler({ err: err, m:m });
                } else {
                    for(let iu = 0; iu < docs.length; iu++) {
                        if (i === 0) {
                            if (!finaldocs[[docs[iu].member_id]]) finaldocs[[docs[iu].member_id]] = {};
                            finaldocs[[docs[iu].member_id]].muted = {
                                executor: docs[iu].executor,
                                time: docs[iu].time
                            }
                        } else
                        if (i === 1) {
                            if (!finaldocs[[docs[iu].userid]]) finaldocs[[docs[iu].userid]] = {};
                            finaldocs[[docs[iu].userid]].cape = {
                                mcid: docs[iu].mcid
                            }
                        } else
                        if (i === 2) {
                            if (!finaldocs[[docs[iu].user_id]]) finaldocs[[docs[iu].user_id]] = {};
                            finaldocs[[docs[iu].user_id]].mdl = {
                                count: docs[iu].count
                            }
                        }

                        if (iu+1 === docs.length) {
                            if (i === 2) {
                                i = 0;
                                final();
                            } else {
                                i++;
                                loadNextExisting();
                            }
                        }
                    }
                }
            });
        })();

        function final() {
            log(finaldocs, 'trace');

            let profile = {
                member_id: Object.keys(finaldocs)[i]
            }

            let user = finaldocs[[profile.member_id]];
            
            if (user.mdl) {
                profile.medals = {
                    count: user.mdl.count,
                    msgs: []
                }
            }

            if (user.cape) {
                profile.cape = {
                    uuid: user.cape.mcid
                }
            }

            if (user.muted) {
                profile.mute = {
                    start: 0,
                    end: user.muted.time,
                    executor: user.muted.executor,
                    updater: ""
                }
            }

            if (Object.keys(profile).length > 1) {
                finaldata.push(profile);
            }

            if (i+1 === Object.keys(finaldocs).length) {
                memory.db.profiles.insert(finaldata, (err) => {
                    if (err) {
                        TOOLS.errorHandler({ err: err, m:m });
                    } else {
                        m.channel.send("Successfully converted databases.").then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                    }
                })
            } else {
                i++
                final();
            }
        }
    }
}));

// commands with arguments

CMD.register(new Command({
    trigger: 'warn',
    short_desc: 'Adds a warning to a user.',
    long_desc: `Adds warnings to a user, which will be saved and remembered for about one week. This will automatically punish the user, depending on how many warnings they have already. First offenders will be given a simple verbal warning, and all others will be given a mute with increasing time limits.`,
    admin_only: true,
    hidden: false,
    dm: 0,
    fn: (m, args) => {
        if (!args[0]) {
            TOOLS.errorHandler({ err: "You must specify a user to give a warning to.", m:m });
        } else {
            TOOLS.getTargetUser(m, args[0], (userid, name) => {
                if (!userid) {
                    TOOLS.errorHandler({ err: "You must specify a valid user.", m:m });
                } else {
                    TOOLS.getProfile(m, userid, (profile) => {
                        let first_offense = false;
                        let mute_added = false;
                        let now = new Date().getTime();
                        let executor = m.author.username+'#'+m.author.discriminator;
                        let mute_hours;
                        

                        if (typeof profile.warns === 'undefined') {
                            first_offense = true;
                            profile.warns = {
                                lifetime: 1,
                                current: []
                            };
                        } else {
                            profile.warns.lifetime++;

                            mute_hours = (5**profile.warns.current.length >= 168) ? 168 : 5**profile.warns.current.length; // starts at 1 hour. multiplies exponentially by 5 depending on the mute count. maxes out at 168 hours, or one week.

                            if (typeof profile.mute === 'undefined') {
                                profile.mute = {
                                    start: now,
                                    end: now + (1000*60*60 * mute_hours), 
                                    executor: m.author.id,
                                    updater: ""
                                };

                                mute_added = true;
                            }
                        }

                        profile.warns.current.push({
                            expiration: now + (1000*60*60*24*7),
                            executor: m.author.id,
                        });

                        memory.db.profiles.update({ member_id: userid }, profile, {}, (err) => {
                            if (err) {
                                TOOLS.errorHandler({ m: m, err: err });
                            } else {
                                if (first_offense) {
                                    let embed = new discord.RichEmbed()
                                    .setColor(cfg.vs.embed.default)
                                    .attachFile(new discord.Attachment(memory.bot.icons.get('opti_warn.png'), "icon.png"))
                                    .setAuthor(`User Warnings`, 'attachment://icon.png')
                                    .setDescription(`<@${userid}> has been warned. This is their first offense, so no punishment will be handed out.`);
        
                                    m.channel.send({embed: embed}).then(msg2 => { TOOLS.messageFinalize(m.author.id, msg2) });
                                } else
                                if (profile.mute && mute_added === false) {
                                    let embed = new discord.RichEmbed()
                                    .setColor(cfg.vs.embed.default)
                                    .attachFile(new discord.Attachment(memory.bot.icons.get('opti_warn.png'), "icon.png"))
                                    .setAuthor(`User Warnings`, 'attachment://icon.png')
                                    .setDescription(`<@${userid}> has been warned. They have ${profile.warns.current.length-1} other warning(s) on record. No punishment will be added, as they have already been muted.`);
        
                                    m.channel.send({embed: embed}).then(msg2 => { TOOLS.messageFinalize(m.author.id, msg2) });
                                } else {
                                    bot.guilds.get(cfg.basic.of_server).fetchMember(userid).then(target => {
                                        target.addRole(cfg.roles.muted, `User muted by ${executor} (via ${cfg.basic.trigger}warn)`).then(() => {
                                            log(`User ${name} was muted by ${executor} (via ${cfg.basic.trigger}warn)`, 'warn');

                                            let remaining = profile.mute.end - now;
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
        
                                            let embed = new discord.RichEmbed()
                                            .setColor(cfg.vs.embed.default)
                                            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_warn.png'), "icon.png"))
                                            .setAuthor(`User Warnings`, 'attachment://icon.png')
                                            .setDescription(`<@${userid}> has been warned. They have ${profile.warns.current.length-1} other warning(s) on record. They have been muted for ${final}.`);
        
                                            m.channel.send({embed: embed}).then(msg2 => { TOOLS.messageFinalize(m.author.id, msg2) });
                                        }).catch(err => TOOLS.errorHandler({ m: m, err: err }));
                                    }).catch(err => TOOLS.errorHandler({ m: m, err: err }));
                                }
                            }
                        });
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
    hidden: false,
    fn: (m, args) => {
        if (!args[0]) {
            let embed = new discord.RichEmbed()
            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_err.png'), "icon.png"))
            .setColor(cfg.vs.embed.error)
            .setAuthor("You must specify the file name of the OptiFine installer.", "attachment://icon.png")
            .setDescription(`For detailed instructions, type \`${cfg.basic.trigger}help bat\``)

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
    long_desc: `Displays current server status of OptiFine. Alternatively, you can view the status of the Minecraft/Mojang services by typing \`${cfg.basic.trigger}status minecraft\` or \`${cfg.basic.trigger}status mojang\`.`,
    usage: '["minecraft"|"mojang"|"all"]',
    hidden: false,
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
                    cb1(`${bot.guilds.get(cfg.basic.ob_server).emojis.get('578346059965792258')} Pinging [${target[index].server}](https://${target[index].server}/ "Awaiting response... | ${target[index].desc}")...`);
                } else
                if (target[index].status === 'green') {
                    cb1(`<:okay:546570334233690132> [${target[index].server}](https://${target[index].server}/ "Code ${target[index].code} | ${target[index].desc}") is online`);
                } else {
                    footer = "Hover over the links for detailed information. | Maybe try again in 10 minutes?";
                    if (target[index].status === 'teal') {
                        cb1(`<:warn:546570334145609738> Unknown response from [${target[index].server}](https://${target[index].server}/ "Code ${target[index].code} | ${target[index].desc}")`);
                    } else
                    if (target[index].status === 'yellow') {
                        cb1(`<:warn:546570334145609738> Partial outage at [${target[index].server}](https://${target[index].server}/ "Code ${target[index].code} | ${target[index].desc}")`);
                    } else
                    if (target[index].status === 'orange') {
                        cb1(`<:error:546570334120312834> An error occurred while pinging [${target[index].server}](https://${target[index].server}/ "Code ${target[index].code} | ${target[index].desc}")`);
                    } else
                    if (target[index].status === 'red') {
                        cb1(`<:error:546570334120312834> [${target[index].server}](https://${target[index].server}/ "Code ${target[index].code} | ${target[index].desc}") is down`);
                    } else
                    if (target[index].status === 'black') {
                        cb1(`<:error:546570334120312834> Failed to get any response from [${target[index].server}](https://${target[index].server}/ "Code ${target[index].code} | ${target[index].desc}")`);
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
    admin_only: true,
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
                                .setDescription(`\`\`\`${hostname}\`\`\` \nType \`${cfg.basic.trigger}confirm\` to continue.\nType \`${cfg.basic.trigger}cancel\` or simply ignore this message to cancel.`);

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
                                    if (result === 2) {
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
    long_desc: `Adds a user to the list of "verified" cape owners. This adds a checkmark along with a user tag to the embeds used in the \`${cfg.basic.trigger}cape\` command (It doesn't ping anyone, don't worry. It just lets you to view someones profile/nickname.) Usernames are translated into Minecraft UUIDs by using the Mojang API, so it's not necessary to use this again when someone changes their username.`,
    usage: '<discord user> <minecraft username>',
    admin_only: true,
    hidden: false,
    dm: 0,
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
    admin_only: true,
    hidden: false,
    dm: 0,
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
                                .setDescription(`Type \`${cfg.basic.trigger}confirm\` to continue.\nType \`${cfg.basic.trigger}cancel\` or simply ignore this message to cancel.`);

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
                                    if (result === 2) {
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
    long_desc: `Displays detailed information for OptiBot's "Assistant" functions. These are essentially commands that do not require OptiBot's command trigger (${cfg.basic.trigger}), and can be used anywhere at any time. (Except DMs)`,
    usage: `[page #]`,
    hidden: false,
    dm: 2,
    fn: (m, args) => {
        let pages = [
            new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_info.png'), "icon.png"))
            .addField('What are these?', `Assistants are, essentially, functions that do not require OptiBot's command trigger (${cfg.basic.trigger}) to be used, and can be used anywhere in any message you send. (Apart from DMs.)`),

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
    hidden: false,
    dm: 2,
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
            .setDescription(`You can get a quick link to any of these servers by using the \`${cfg.basic.trigger}server\` command. (See \`${cfg.basic.trigger}help server\` for details)`);

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
    long_desc: `Searches for a Discord server with the given name, and then provides an invite link. \n\nNote that this only searches within a specially picked group of servers. (See \`${cfg.basic.trigger}serverlist\`) This command does **not** search through ALL servers across the entirety of Discord.`,
    usage: '<server name?>',
    hidden: false,
    fn: (m, args) => {
        if (!args[0]) {
            TOOLS.errorHandler({ err: "You must specify a server to find.", m:m });
        } else {
            let query = m.content.substring((cfg.basic.trigger+'server ').length).toLowerCase();
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
    hidden: false,
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

                if (profile.medals.count === 0) {
                    embed.setAuthor(`${(name) ? name+' has' : 'You have' } not earned any medals.`, 'attachment://icon.png')
                    m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                } else {
                    embed.setAuthor(`${(name) ? name+' has' : 'You have' } earned ${profile.medals.count} medal(s).`, 'attachment://icon.png')
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
    hidden: false,
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
    short_desc: 'Information hub for OptiBot functions.',
    long_desc: `Information hub for OptiBot functions. ||_ _ Lol, meta. _ _||`,
    usage: "[command]",
    hidden: false,
    dm: 2,
    fn: (m, args, member, misc) => {
        if (!args[0]) {
            // default help page
            let embed = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFile(new discord.Attachment(memory.bot.icons.get('opti_info.png'), "icon.png"))
                .setAuthor('OptiBot Help', 'attachment://icon.png')
                .setDescription("To get started with OptiBot, use either of the following commands:")
                .addField('Assistant Functions', `\`\`\`${cfg.basic.trigger}assist\`\`\``)
                .addField('Commands List', `\`\`\`${cfg.basic.trigger}list\`\`\` \nIf you'd like to view detailed information about a specific command, use this: \`\`\`${cfg.basic.trigger}help [command]\`\`\``)

            m.channel.send({ embed: embed }).then(msg => TOOLS.messageFinalize(m.author.id, msg));
        } else {
            // looking for info on command
            CMD.get(args[0], (cmd) => {
                if (!cmd || (cmd.getMetadata().hidden && !misc.isSuper)) {
                    TOOLS.errorHandler({ err: "That command does not exist.", m: m });
                } else
                if (cmd.getMetadata().admin_only && !(misc.isAdmin || misc.isSuper)) {
                    TOOLS.errorHandler({ err: "You do not have permission to view this command.", m: m });
                } else {
                    let md = cmd.getMetadata();
                    let files = [new discord.Attachment(memory.bot.icons.get('opti_info.png'), "icon.png")];
                    let embed = new discord.RichEmbed()
                        .setColor(cfg.vs.embed.default)
                        .setDescription(md.long_desc+`\n\`\`\`${md.usage}\`\`\``)

                    let role_restriction = `🔓 This command can be used by all members.`;
                    let usage = `<:okay:546570334233690132> This command can be used in DMs (Direct Messages)`;
                        

                    if (md.dm === 0) {
                        usage = `<:error:546570334120312834> This command can *not* be used in DMs (Direct Messages)`;
                    } else
                    if (md.dm === 2) {
                        usage = `<:warn:546570334145609738> This command can *only* be used in DMs (Direct Messages)`;
                    }

                    if (md.admin_only) {
                        role_restriction = '🔒 This command can *only* be used by Moderators & Administrators.';
                    } else
                    if (md.hidden) {
                        role_restriction = `🔒 This command can *only* be used by OptiBot developers.`;
                    }

                    embed.addField('Usage Restrictions', role_restriction+'\n'+usage);

                    if (md.icon) {
                        files.push(new discord.Attachment(memory.bot.images.get(md.icon), "thumbnail.png"));
                        embed.attachFiles(files)
                            .setAuthor('OptiBot Command: ' + cfg.basic.trigger + md.trigger, 'attachment://icon.png')
                            .setThumbnail('attachment://thumbnail.png');
                    } else {
                        embed.attachFiles(files)
                            .setAuthor('OptiBot Command: ' + cfg.basic.trigger + md.trigger, 'attachment://icon.png');
                    }

                    m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                }
            });
        }
    }
}));

CMD.register(new Command({
    trigger: 'list',
    short_desc: 'Lists all OptiBot commands.',
    long_desc: `Lists all OptiBot commands. This includes a short description, and an icon representing the usability of the command in DMs: \n\n<:okay:546570334233690132> - This command can be used in DMS.\n<:error:546570334120312834> - This command can *not* be used in DMs\n<:warn:546570334145609738> - This command can *only* be used in DMs\n\n"Special" pages can be specified before or after the page number. It works either way. For example, if you're a moderator, you can list Moderator-only commands by typing "mod" or "admin".`,
    usage: "[page # [special] | special [page#]]",
    hidden: false,
    dm: 2,
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
                }
            } else 
            if (args[1] && isNaN(args[1])) {
                if ((args[1].toLowerCase() === 'admin' || args[1].toLowerCase() === 'mod') && misc.isAdmin) {
                    menu = 'admin'
                } else
                if (args[1].toLowerCase() === 'sudo' && misc.isSuper) {
                    menu = 'sudo'
                }
            }

            if(args[0] && !isNaN(args[0])) {
                selectPage = parseInt(args[0]);
            } else
            if(args[1] && !isNaN(args[1])) {
                selectPage = parseInt(args[1]);
            }

            if (menu === 'sudo') {
                filtered = list.filter((cmd) => (cmd.getMetadata().hidden === true));
            } else
            if (menu === 'admin') {
                filtered = list.filter((cmd) => (cmd.getMetadata().admin_only === true && cmd.getMetadata().hidden === false));
            } else {
                filtered = list.filter((cmd) => (cmd.getMetadata().admin_only === false && cmd.getMetadata().hidden === false));
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
            }

            let embed = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFile(new discord.Attachment(memory.bot.icons.get('opti_docs.png'), "icon.png"))
                .setAuthor(`OptiBot Commands List | Page ${pageNum}/${pageLimit}`, 'attachment://icon.png')
                .setDescription(`${special_text} Use \`${cfg.basic.trigger}help <command>\` for more information on a particular command. \n\nIcons represent the usability of commands in bot DMs.`)
                .setFooter(`Viewing ${filtered.length} commands, out of ${list.length} total.`);
            
                let i = (pageNum > 1) ? (10 * (pageNum - 1)) : 0;
                let added = 0;
                (function addList() {
    
                    let cmd = filtered[i].getMetadata();
                    let dm_permissions;
    
                    if (cmd.dm === 0) {
                        dm_permissions = bot.guilds.get(cfg.basic.ob_server).emojis.get('546570334120312834')
                    } else
                    if (cmd.dm === 1) {
                        dm_permissions = bot.guilds.get(cfg.basic.ob_server).emojis.get('546570334233690132')
                    } else
                    if (cmd.dm === 2) {
                        dm_permissions = bot.guilds.get(cfg.basic.ob_server).emojis.get('546570334145609738')
                    }
    
                    embed.addField(cfg.basic.trigger+cmd.trigger, `${dm_permissions} - ${cmd.short_desc}`);
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
    trigger: 'donate',
    short_desc: 'Donation information.',
    long_desc: "Provides detailed information about OptiFine donations. \nIf you'd like to see OptiBot donations instead, see page 2.",
    usage: "[page #]",
    hidden: false,
    fn: (m, args) => {
        let pages = [
            {
                embed: new discord.RichEmbed()
                    .setColor(cfg.vs.embed.default)
                    .attachFile(new discord.Attachment(memory.bot.icons.get('opti_donate.png'), "thumbnail.png"))
                    .setAuthor('Donation Info | Page 1/2', 'attachment://thumbnail.png')
                    .addField('OptiFine Donations', `Support OptiFine's development with one-time donation of $10, and optionally receive an OptiFine cape in recognition of your awesomeness. This cape can have one of two types of designs: The standard "OF" cape with fully custom colors, or a full banner design. These designs can be updated and changed at any time. In addition, you may request the Donator role on this very Discord server. This grants instant access to the exclusive, donator-only text channel. (type \`${cfg.basic.trigger+"help dr"}\` in DMs for instructions) \n\nhttps://optifine.net/donate`)
                    .setFooter('Thank you for your consideration!')
            },
            {
                embed: new discord.RichEmbed()
                    .setColor(cfg.vs.embed.default)
                    .attachFiles([new discord.Attachment(memory.bot.icons.get('opti_donate.png'), "thumbnail.png"), new discord.Attachment(memory.bot.images.get('jack_donate.png'), "jack.png")])
                    .setAuthor('Donation Info | Page 2/2', 'attachment://thumbnail.png')
                    .setThumbnail('attachment://jack.png')
                    .addField('OptiBot Donations', "OptiBot is developed entirely on my free time out of love for a great community. I don't really expect much in return, I just like coding from time to time. However, on the off chance that you'd like to support OptiBot's development, you can [buy me a coffee! ☕](http://ko-fi.com/jackasterisk \"Not literally though. I hate coffee.\")")
                    .setFooter('Thank you for your consideration!')
            }
        ];

        let currentPage = 0;
        let target = parseInt(args[0]);
        if (!isNaN(target) && pages[target - 1] !== undefined) currentPage = target - 1;

        m.channel.send(pages[currentPage]).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
    }
}));

CMD.register(new Command({
    trigger: 'json',
    short_desc: 'JSON Validator',
    long_desc: "Checks if a file is written with valid JSON syntax. Discord CDN links only.",
    usage: "<attachment|URL|^ shortcut>",
    hidden: false,
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
                        finalValidate(parseurl)
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
    
                                m.channel.send({ embed: embed }).then(msg => {
                                    TOOLS.messageFinalize(m.author.id, msg)
                                }).catch(err => {
                                    TOOLS.errorHandler({ err: err, m: m });
                                });
                            }
                            catch (err) {
                                let embed = new discord.RichEmbed()
                                    .setColor(cfg.vs.embed.error)
                                    .attachFile(new discord.Attachment(memory.bot.icons.get('opti_err.png'), "thumbnail.png"))
                                    .setAuthor('Invalid JSON', 'attachment://thumbnail.png')
                                    .setDescription(`\`\`\`${err}\`\`\``);
    
                                m.channel.send({ embed: embed }).then(msg => {
                                    TOOLS.messageFinalize(m.author.id, msg)
                                }).catch(err => {
                                    TOOLS.errorHandler({ err: err, m: m });
                                });
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
    usage: "<text>",
    admin_only: true,
    hidden: false,
    fn: (m, args) => {
        if (args[0]) {
            let org = m.content.substring( (cfg.basic.trigger + 'mock ').length );
            let newStr = '';

            for(let i = 0; i < org.length; i++) {
                let thisChar = org.charAt(i);

                if (i % 2 === 1) {
                    thisChar = thisChar.toUpperCase();
                } else {
                    thisChar = thisChar.toLowerCase();
                }

                newStr += thisChar;

                if (i+1 === org.length) {
                    TOOLS.typerHandler(m.channel, false);
                    m.channel.send(`\`\`\`${newStr}\`\`\``);
                }
            }
        } else {
            TOOLS.errorHandler({ err: "You must specify a message to translate.", m: m });
        }
    }
}));

CMD.register(new Command({
    trigger: 'dr',
    short_desc: 'Verifies your donator status.',
    long_desc: "Verifies your donator status. If successful, this will grant you the Donator role, and reset your Donator token in the process. \n\nYou can find your donator token by logging in through the website. https://optifine.net/login. Look at the bottom of the page for a string of random characters. (see picture for example) \n**Remember that your \"Donation ID\" is NOT your token!**",
    usage: "<donation e-mail> <token>",
    icon: `token.png`,
    hidden: false,
    dm: 2,
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
                    m.channel.send(undefined, new discord.Attachment(returnMsg, 'buffer.'+file_encoding));
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
    long_desc: "Enables text mute for the specified user. Time limit is optional, and will default to 1 hour if not specified. You can also specify the time measure in (m)inutes, (h)ours, and (d)ays. The absolute maximum time limit is 99 days. Additionally, you can adjust time limits for users by simply running this command again with the desired time.",
    usage: "<discord user> [time limit] [time measurement?]",
    hidden: false,
    admin_only: true,
    dm: 0,
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
    hidden: false,
    admin_only: true,
    dm: 0,
    fn: (m, args) => {
        if (!args[0]) {
            TOOLS.errorHandler({ m: m, err: `You must specify a user to unmute.` });
        } else {
            TOOLS.muteHandler(m, args, false);
        }
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
                if (result === 2) {
                    m.channel.send('Timed out.');
                }
            });
        });
    }
}));

CMD.register(new Command({
    trigger: 'confirm',
    short_desc: 'Confirms your previous request, if any is active.',
    hidden: false,
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
    hidden: false,
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
    trigger: 'cape',
    short_desc: "Donator Cape Viewer",
    long_desc: `Displays donator capes for a specified user. \n\nIf someone has a *verified* cape, you can use their @mention in place of their Minecraft username. Additionally, if no username is provided, this will default to yourself. Finally, you can view the full cape texture by typing "full" after the username.`,
    usage: `[minecraft username OR discord user] ["full"]`,
    hidden: false,
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
                                                    desc += '<:okay:546570334233690132> Cape owned by <@' + dbdocs[0].member_id + '>';
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
                            .setDescription(`If you're a donator and you're trying to view your own cape, you need to verify your cape first. [See this <#531622141393764352> entry](https://discordapp.com/channels/423430686880301056/531622141393764352/622494425616089099) for details.`);
                            

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
                            .setAuthor('That user does not exist.', 'attachment://thumbnail.png')
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
    admin_only: true,
    hidden: false,
    dm: 0,
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

                    let role_match = cstr.findBestMatch(m.content.substring(cfg.basic.trigger.length+5+args[0].length+1).toLowerCase(), Object.keys(role_types));
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
    hidden: false,
    fn: (m, args) => {
        if (!args[0]) {
            var embed = new discord.RichEmbed()
            .setColor(cfg.vs.embed.error)
            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_search_error.png'), "thumbnail.png"))
            .setAuthor('An Incredibly Convenient Search Tool', 'attachment://thumbnail.png')
            .setDescription('[All your questions will be answered if you just click this link.](http://lmgtfy.com/?q='+encodeURIComponent('how to use discord bots')+')')

            m.channel.send({embed: embed}).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
        } else {
            var embed = new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_search.png'), "thumbnail.png"))
            .setAuthor('An Incredibly Convenient Search Tool', 'attachment://thumbnail.png')
            .setDescription('[All your questions will be answered if you just click this link.](http://lmgtfy.com/?q='+encodeURIComponent(m.content.substr(8))+')')

            m.channel.send({embed: embed}).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
        }
    }
}));

CMD.register(new Command({
    trigger: 'purge',
    short_desc: 'Delete several messages at once.',
    long_desc: "Delete the last [x amount] messages. Useful for mass spam. \n\nWhen using this command, OptiBot will ask you to CONFIRM your request before proceeding. The bot will retain the position the original command was used at, meaning that messages that happen to be posted while you're confirming the request will be ignored.",
    usage: '<# of messages>',
    admin_only: true,
    dm: 0,
    hidden: false,
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
            TOOLS.errorHandler({err: "How and why?", m:m});
        } else {
            let amount = Math.round(parseInt(args[0]));
            let confirm = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFile(new discord.Attachment(memory.bot.icons.get('opti_warn.png'), "icon.png"))
                .setAuthor(`Are you sure want to remove ${amount} messages?`, 'attachment://icon.png')
                .setDescription(`This action cannot be undone. \n\nType \`${cfg.basic.trigger}confirm\` to continue.\nType \`${cfg.basic.trigger}cancel\` or simply ignore this message to cancel.`)

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
                            })
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
                    if (result === 2) {
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
    long_desc: `Search for various files in the current version of OptiFine documentation. If no search query is provided, OptiBot will just give you a link to the documentation on GitHub. \n\n**Note: This is the all new, somewhat experimental version of the \`${cfg.basic.trigger}docs\` command.** This version provides \"categories\" of documentation, which makes things easier to look for. However, due to the nature of this new system, some files may be missing, especially if they've only been recently added. For the legacy version of this command, use \`${cfg.basic.trigger}docfile\`. It will always be up-to-date, as it downloads directly from GitHub.`,
    usage: '[query?]',
    hidden: false,
    fn: (m, args) => {
        if (!args[0]) {
            let embed = new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(memory.bot.icons.get("opti_docs.png"), "icon.png"))
            .setAuthor("Official OptiFine Documentation", 'attachment://icon.png')
            .addField("Main Directory", "https://github.com/sp614x/optifine/tree/master/OptiFineDoc/doc");

            m.channel.send({embed: embed}).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
        } else {
            let query = m.content.substring((cfg.basic.trigger + 'docs ').length).toLowerCase();
            let match = cstr.findBestMatch(query, Object.keys(memory.bot.docs_cat));

            if (match.bestMatch.rating < 0.1) {
                TOOLS.errorHandler({ err: "Could not find any files matching that query.", m:m });
            } else {
                let data = memory.bot.docs_cat[match.bestMatch.target];

                let embed = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFile(new discord.Attachment(memory.bot.icons.get("opti_docs.png"), "icon.png"))
                .setAuthor("Official OptiFine Documentation", 'attachment://icon.png')
                .setDescription(`You can link to individual files by using the \`${cfg.basic.trigger}docfile\` command.`)
                .addField(data.name, data.links.join('\n\n'))
                .setFooter(`${(match.bestMatch.rating * 100).toFixed(1)}% match during search.`)

                m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
            }
        }
    }
}));

CMD.register(new Command({
    trigger: 'log',
    short_desc: `Retrieves OptiBot's current running log file.`,
    admin_only: true,
    hidden: false,
    fn: (m) => {
        log(`User ${m.author.username}#${m.author.discriminator} requested OptiBot log.`);

        bot.setTimeout(() => {
            fs.readFile(`./logs/${process.argv[4]}.log`, (err, data) => {
                if (err) TOOLS.errorHandler({err:err, m:m});
                else {
                    m.channel.send(new discord.Attachment(data, `${process.argv[4]}.log`)).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                }
            });
        }, 500);
    }
}));

CMD.register(new Command({
    trigger: 'docfile',
    short_desc: 'Search/link a single file in the OptiFine documentation.',
    long_desc: "Search for files in the current version of OptiFine documentation.",
    usage: '<query?> [line #]',
    hidden: false,
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
            let v_msg = (args[1]) ? m.content.substring((cfg.basic.trigger+'say '+args[0]+' ').length) : undefined
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
    admin_only: true,
    hidden: false,
    dm: 0,
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
    admin_only: true,
    hidden: false,
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
    hidden: false,
    fn: (m, args) => {
        if (!args[0]) {
            TOOLS.errorHandler({ err: `You must specify a question to search for.`, m:m });
        } else {
            let highest = {
                rating: 0,
                message: undefined
            };
            let query = m.content.substring( (cfg.basic.trigger + 'faq ').length );
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

                            let infotext = `Click [here](${highest.message.url}) to go to the original message link. Be sure to also check out the <#531622141393764352> channel for more questions and answers.`;
                            
                            if (highest.answer) {
                                if (highest.answer.length < 512) {
                                    embed.setDescription(infotext)
                                    .addField(highest.question, highest.answer);
                                } else {
                                    embed.setDescription(`**The answer to this question is too long to show in an embed.** \n${infotext}`)
                                    .addField(highest.question, highest.answer.substring(0, 512).trim()+'...');
                                }
                            } else {
                                embed.setDescription(infotext)
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
    hidden: false,
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
            let query = m.content.split("\n", 1)[0].substring( (cfg.basic.trigger+'mcwiki ').length ).trim();
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
    trigger: 'motd',
    short_desc: 'View the MOTD.',
    long_desc: `View the MOTD, the message sent by OptiBot to every new user that joins the server. \n\nModerators can additionally include a message to be added, which can be reset again with \`${cfg.basic.trigger}clearmotd\` (These can NOT be done in DMs.)`,
    usage: '[new message text]',
    hidden: false,
    fn: (m, args, not_used, misc) => {
        if (!args[0] || !(misc.isAdmin || misc.isSuper) || m.channel.type === 'dm') {
            m.channel.send({ embed: memory.bot.motd }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
        } else {
            let newMsg = m.content.substring( (cfg.basic.trigger + 'motd ').length );
            let messageformatted = '> '+newMsg.replace('\n', '> \n').substring(0, 1024);

            if (memory.bot.motd.fields[0] && memory.bot.motd.fields[0].value.toLowerCase() === newMsg.trim().toLowerCase()) {
                TOOLS.errorHandler({ err: "New MOTD Message cannot be the same as the current message.", m: m });
                return;
            }

            let confirm = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFile(new discord.Attachment(memory.bot.icons.get('opti_warn.png'), "icon.png"))
                .setAuthor(`Are you sure want to change the MOTD message?`, 'attachment://icon.png')
                .setDescription(`This message will be shown to ALL users who join the server. \n\nType \`${cfg.basic.trigger}confirm\` to continue.\nType \`${cfg.basic.trigger}cancel\` or simply ignore this message to cancel.`)

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
                                    .setDescription(`Type \`${cfg.basic.trigger}motd\` to see how it looks.`)
        
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
                    if (result === 2) {
                        let embed = new discord.RichEmbed()
                        .setColor(cfg.vs.embed.default)
                        .attachFile(new discord.Attachment(memory.bot.icons.get('opti_wait.png'), "icon.png"))
                        .setAuthor(`Request timed out.`, 'attachment://icon.png')
                        .setDescription('MOTD message has not been changed.')
                        
                        m.channel.send({embed: embed}).then(msg2 => { TOOLS.messageFinalize(m.author.id, msg2) });
                    }
                });
            })
        }
    }
}));

CMD.register(new Command({
    trigger: 'clearmotd',
    short_desc: 'Clear custom MOTD message.',
    long_desc: `Clears the custom MOTD message, which is set by using \`${cfg.basic.trigger}motd\`.`,
    admin_only: true,
    hidden: false,
    dm: 0,
    fn: (m) => {
        if (!memory.bot.motd.fields[0]) {
            TOOLS.errorHandler({ err:'There is no message currently set.', m:m });
        } else {
            let confirm = new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_warn.png'), "icon.png"))
            .setAuthor(`Are you sure want to remove the MOTD message?`, 'attachment://icon.png')
            .setDescription(`This will remove the current message set in the MOTD. \n\nType \`${cfg.basic.trigger}confirm\` to continue.\nType \`${cfg.basic.trigger}cancel\` or simply ignore this message to cancel.`)

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
                    if (result === 2) {
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
                cb(2);
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

            let timeout = bot.setTimeout(timedout, 60000);

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

TOOLS.confirmationFinder = (data, cb) => {
    let c = memory.bot.cdb
    if (c.length === 0) {
        log('cdb is empty', 'trace');
        cb();
    } else {
        for (let i = 0; i < c.length; i++) {
            if (c[i].member_id === data.member_id && c[i].channel_id === data.channel_id) {
                log('found in cdb', 'trace');
                cb(i);
                break;
            } else
            if (i + 1 === c.length) {
                log('could not find in cdb', 'trace');
                cb();
            }
        }
    }
}

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
            ACT_type = 'WATCHING';
            ACT_game = `${cfg.basic.trigger}help`;
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

TOOLS.shutdownHandler = (code) => {
    // 0 = user shutdown
    // 1 = error restart
    // 2 = user restart
    // 3 = user reset
    // 10 = scheduled restart
    // 24 = error shutdown

    TOOLS.statusHandler(-1);

    bot.setTimeout(() => {
        bot.destroy();
        process.title = 'OptiBot ' + pkg.version;
        setTimeout(() => {
            process.exit(code);
        }, 500);
    }, 250);
}

TOOLS.messageFinalize = (author, botm) => {
    TOOLS.typerHandler(botm.channel, false);
    TOOLS.deleteMessageHandler({stage:1, m:botm, userid:author});
}

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
                log(data.err.stack, 'error', filename+':'+line);
    
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

TOOLS.deleteMessageHandler = (data) => {
    if (data.stage === 1) {
        if (data.m.channel.type === 'dm') return;

        data.m.react(bot.guilds.get(cfg.basic.ob_server).emojis.get('572025612605325322')).then(() => {
            let cacheData = {
                time: new Date().getTime(),
                guild: data.m.guild.id,
                channel: data.m.channel.id,
                message: data.m.id,
                user: data.userid
            };

            log('message sent, adding to cache', 'debug');
            memory.db.msg.insert(cacheData, (err) => {
                if (err) {
                    log(err.stack, 'error');
                } else {
                    memory.db.msg.find({}).sort({ time: 1 }).exec((err, docs) => {
                        if (err) {
                            log(err.stack, 'error');
                        } else
                        if (docs.length > cfg.db.size) {
                            let oldestMsg = docs[0];
                            log('reached cache limit, removing first element from cache.', 'debug');

                            try {
                                memory.bot.limitRemove.emit('limit', oldestMsg);
                            }
                            catch (err) {
                                log(err.stack, 'error');
                            }
                            memory.db.msg.remove(oldestMsg, {}, (err) => {
                                if (err) log(err.stack, 'error');
                            });
                        }
                    });
                }
            });
            TOOLS.deleteMessageHandler({stage: 2, m:data.m, userid:cacheData.user, cacheData:cacheData})
        }).catch(err => log('Failed to react to message: ' + err.stack, 'error'));
    } else
    if (data.stage === 2) {
        let filter = (reaction) => reaction.emoji.id === '572025612605325322';
        let collector = data.m.createReactionCollector(filter);

        const cb_collect = (r) => {
            if (!memory.bot.shutdown) {
                let rri = 0;
                let rUsers = r.users.firstKey(100);
                (function reactRemove() {
                    log('deleteloop' + rri, 'trace');
                    if (rUsers[rri] !== undefined) {
                        if (rUsers[rri] === data.userid) {
                            data.m.delete();
                            log('Bot message deleted at user request.', 'warn');

                            memory.db.msg.remove(data.cacheData, (err) => {
                                if (err) {
                                    log(err.stack, 'error');
                                } else {
                                    log('message removed from cache', 'debug');
                                }
                            });

                            bot.setTimeout(function () {
                                collector.stop();
                            }, 500);
                        } else
                        if (rUsers[rri] === bot.user.id) {
                            rri++;
                            reactRemove();
                        } else {
                            data.m.reactions.get('click_to_delete:572025612605325322').remove(rUsers[rri]);
                            rri++;
                            reactRemove();
                        }
                    }

                })();
            }
        }

        const cb_limit = (cacheData_remove) => {
            if (data.cacheData.message === cacheData_remove.message) {
                collector.stop('limit');
            }
        }

        const cb_end = (c, r) => {
            try {
                memory.bot.limitRemove.removeListener('limit', cb_limit);
                collector.removeListener('collect', cb_collect).removeListener('end', cb_end);
            }
            catch (err) {
                log(err.stack, 'error');
            }

            if (!data.m.deleted && !memory.bot.shutdown) {
                if (data.m.reactions.get('click_to_delete:572025612605325322') && data.m.reactions.get('click_to_delete:572025612605325322').me) {
                    data.m.reactions.get('click_to_delete:572025612605325322').remove().then(() => {
                        if (r !== 'limit') {
                            memory.db.msg.remove(data.cacheData, (err) => {
                                if (err) {
                                    log(err.stack, 'error');
                                } else {
                                    log('message removed from cache', 'debug');
                                }
                            });
                        }

                        log('Time expired for message deletion.', 'trace');
                    });
                }
            }
        }

        collector.on('collect', cb_collect);

        try {
            memory.bot.limitRemove.on('limit', cb_limit);
        }
        catch (err) {
            log(err.stack, 'error');
        }

        collector.on('end', cb_end);
    }
}

TOOLS.muteHandler = (m, args, action) => {
    if (m) {
        let now = new Date().getTime();
        let update = false;
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
                    if (member.permissions.has("KICK_MEMBERS", true)) {
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
                let measure = (args[2]) ? args[2].toLowerCase() : 'hours';

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
    
                    profile.mute = data;
                } else {
                    delete profile.mute;
                }

                memory.db.profiles.update({ member_id: target.user.id }, profile, {}, (err) => {
                    if (err) {
                        TOOLS.errorHandler({ m: m, err: err });
                    } else
                    if (action) {
                        target.addRole(cfg.roles.muted, `User muted by ${executor} (via ${cfg.basic.trigger}mute)`).then(() => {
                            log(`User ${muted_name} was muted by ${executor} (via ${cfg.basic.trigger}mute)`, 'warn');
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
    } else {
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
}

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
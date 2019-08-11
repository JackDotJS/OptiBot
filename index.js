// Written by Kyle Edwards <wingedasterisk@gmail.com>, May 2019
// I put a lot of work into this, please don't redistribute it or anything.

////////////////////////////////////////////////////////////////////////////////
// Dependencies, Configuration files
////////////////////////////////////////////////////////////////////////////////

const discord = require('discord.js');
const request = require('request');
const events = require('events');
const jimp = require('jimp');
const fs = require('fs');
const cstr = require('string-similarity');
const database = require('nedb');

const cfg = require('./cfg/config.json');
const keys = require('./cfg/keys.json');
const pkg = require('./package.json');
const build = require('./data/build.json');
const cntbrs = require('./cfg/contributors.json');
const dntrs = require('./cfg/donators.json');

////////////////////////////////////////////////////////////////////////////////
// Pre-initialize
////////////////////////////////////////////////////////////////////////////////

function log(msg, level) {
    let content;
    if (typeof msg === 'string') {
        content = String(msg);
    } else
    if (typeof msg === null) {
        content = String("null");
    } else 
    if (typeof msg === undefined) {
        content = String("undefined");
    } else {
        try {
            content = JSON.stringify(msg);
            if(content.length === 0) {
                content = String('Could not stringify JSON.')
            }
        }
        catch (err) {
            content = String(msg);
        }
    }

    if(content.length === 0) {
        content = String(' ');
    }

    process.send({ content, level });
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
                donator_only: md.donator_only || false,
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
        muted: new database({ filename: './data/muted.db', autoload: true }),
        cape: new database({ filename: './data/vcape.db', autoload: true }),
        mdl: new database({ filename: './data/mdl.db', autoload: true }),
        mdlm: new database({ filename: './data/mdl_messages.db', autoload: true })
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
        cdb: [],
        limitRemove: new events.EventEmitter().setMaxListeners(cfg.db.size + 1),
        alog: 0,
        log: []
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
memory.db.muted.persistence.setAutocompactionInterval(7200000);
memory.db.cape.persistence.setAutocompactionInterval(7200000);

const bot = new discord.Client();
bot.login(keys.discord).then(() => {
    process.title = 'Loading required assets...';
    log('Successfully logged in using token: ' + keys.discord, 'debug');
    TOOLS.statusHandler(0);
}).catch(err => {
    if (err.length > 0) {
        log(err, 'error');
        TOOLS.shutdownHandler(24);
    }
});

memory.bot.restart_check = bot.setInterval(() => {
    if (!memory.bot.shutdown) {
        let now = new Date();
        // AWS server in GMT time.
        // 6 AM to OptiBot = 1 AM in US central time
        if (now.getHours() === 7 && now.getMinutes() === 0) {
            memory.bot.shutdown = true;
            TOOLS.statusHandler(-1);

            log('Scheduled restart initialized.', 'warn');

            if (memory.bot.lastInt + 300000 > now.getTime()) {
                log('Restarting in 5 minutes...', 'warn');
                bot.setTimeout(() => {
                    TOOLS.shutdownHandler(10);
                }, 300000);
            } else {
                log('Restarting in 1 minute...', 'warn');
                bot.setTimeout(() => {
                    TOOLS.shutdownHandler(10);
                }, 60000);
            }
        }
    }
}, 1000);

memory.bot.activity_check = bot.setInterval(() => {
    if (!memory.bot.shutdown && !memory.bot.booting) {
        bot.user.setStatus(memory.activity.status);
        bot.user.setActivity(memory.activity.game, { url: memory.activity.url, type: memory.activity.type });
    }
}, 900000);

memory.bot.mute_check = bot.setInterval(() => {
    if (!memory.bot.shutdown && !memory.bot.booting) TOOLS.muteHandler();
}, 300000);

////////////////////////////////////////////////////////////////////////////////
// Event Handlers
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////
// Bot Ready Event
////////////////////////////////////////

bot.on('ready', () => {
    (function bootS1() {
        log('Initialization: Booting (Stage 1, Sub-Op 1)', 'debug');
        let timeStart = new Date();
        fs.readdir('./icons', (err, files) => {
            if (err) {
                TOOLS.errorHandler({ err: 'Failed to load icons directory. (boot stage 1, subop 1) - ' + err.stack });
                TOOLS.shutdownHandler(1);
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
        });

        function s2() {
            log('Initialization: Booting (Stage 1, Sub-Op 2)', 'debug');
            fs.readdir('./images', (err, files) => {
                if (err) {
                    TOOLS.errorHandler({ err: 'Failed to load images directory. (boot stage 1, subop 2) - ' + err.stack });
                    TOOLS.shutdownHandler(1);
                } else {
                    let i = 0;
                    (function loadNext() {
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
                    })();
                }
            });
        }
    })();

    function bootS2() {
        log('Initialization: Booting (Stage 2, Sub-Op 1)', 'debug');
        let timeStart = new Date();
        request({ url: 'https://api.github.com/repos/sp614x/optifine/contents/OptiFineDoc/doc?ref=master&access_token=' + keys.github, headers: { 'User-Agent': 'optibot' } }, (err, res, body) => {
            if (err || !res || !body) {
                TOOLS.errorHandler({ err: err || new Error('Failed to get a response from the GitHub API. (boot stage 2, subop 1)') });
            } else {
                let result = JSON.parse(body);

                if (result.message) {
                    TOOLS.errorHandler({ err: new Error('GitHub API rate limit exceeded: ' + result.message) });
                    return;
                }

                memory.bot.docs = result;

                s2();
            }
        });

        function s2() {
            log('Initialization: Booting (Stage 2, Sub-Op 2)', 'debug');
            request({ url: 'https://api.github.com/repos/sp614x/optifine/contents/OptiFineDoc/doc/images?ref=master&access_token=' + keys.github, headers: { 'User-Agent': 'optibot' } }, (err, res, body) => {
                if (err || !res || !body) {
                    TOOLS.errorHandler({ err: err || new Error('Failed to get a response from the GitHub API. (boot stage 2, subop 2)') });
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
            });
        }
    }

    function bootS3() {
        log('Initialization: Booting (Stage 3, Sub-Op 1)', 'debug');
        let timeStart = new Date();
        memory.db.msg.find({}, (err, docs) => {
            if (err) {
                log(err, 'error');
            } else {
                let i = 0;

                (function fetchNext() {
                    if (i === docs.length) {
                        let timeEnd = new Date();
                        let timeTaken = (timeEnd.getTime() - timeStart.getTime()) / 1000;
                        log(`Successfully loaded bot messages in ${timeTaken} seconds.`);
                        bootS4();
                    } else {
                        bot.guilds.get(docs[i].guild).channels.get(docs[i].channel).fetchMessage(docs[i].message).then(m => {
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
                                        if (u.has(docs[i].user)) {
                                            memory.db.msg.remove(e, (err) => {
                                                if (err) {
                                                    log(err, 'error');
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
                                            })();
                                        }
                                    }).catch(err => {
                                        log('Failed to fetch users from message: ' + err.stack, 'error');
                                        i++
                                        fetchNext();
                                    });
                                }
                            }
                        }).catch(err => {
                            log('Failed to load cached message: ' + err.stack, 'error');
                            i++
                            fetchNext();
                        });
                    }
                })();
            }
        });
    }

    function bootS4() {
        log('Initialization: Booting (Stage 4)', 'debug');
        let timeStart = new Date();
        request({ url: "https://raw.githubusercontent.com/StopModReposts/Illegal-Mod-Sites/master/SITES.md", headers: { 'User-Agent': 'optibot' } }, (err, res, body) => {
            if (err || !res || !body) {
                TOOLS.errorHandler({ err: err || new Error('Failed to get a response from the GitHub API.') });
            } else {
                let lines = body.match(/(?<=\|).*(?=\|)/g);
                let smr_data = [];

                let i = 2; // ignoring the first two because they're just part of github's table formatting.
                (function loop1() {
                    let thisLine = lines[i].split("|");
                    let tld = {
                        url: thisLine[0].trim().replace(" ", "."),
                        rating_ad: thisLine[1].trim(),
                        rating_dist: thisLine[2].trim(),
                        rating_misc: thisLine[3].trim(),
                        note: thisLine[4].trim()
                    };

                    if (tld.url.match(/^-+$/) === null && tld.url.length !== 0) {
                        smr_data.push(tld);
                    }

                    if (i + 1 >= lines.length) {
                        memory.bot.smr = smr_data;

                        let timeEnd = new Date();
                        let timeTaken = (timeEnd.getTime() - timeStart.getTime()) / 1000;
                        log(`Successfully updated SMR database in ${timeTaken} seconds.`);
                        bootS5();
                    } else {
                        i++;
                        loop1();
                    }
                })();
            }
        });
    }

    function bootS5() {
        log('Initialization: Booting (Stage 5)', 'debug');
        let timeStart = new Date();
        bot.guilds.get(cfg.basic.of_server).fetchAuditLogs({ limit: 10, type: 'MESSAGE_DELETE' }).then((audit) => {
            memory.bot.log = [...audit.entries.values()];

            let timeEnd = new Date();
            let timeTaken = (timeEnd.getTime() - timeStart.getTime()) / 1000;
            log(`Successfully updated Audit Log cache in ${timeTaken} seconds.`);
            bootS6()
        });
    }

    function bootS6() {
        log('Initialization: Booting (Stage 6)', 'debug');
        let timeStart = new Date();
        CMD.sort();
        let timeEnd = new Date();
        let timeTaken = (timeEnd.getTime() - timeStart.getTime()) / 1000;
        log(`Successfully sorted commands list in ${timeTaken} seconds.`);
        finalReady();
    }

    function finalReady() {
        memory.bot.booting = false;
        if(memory.bot.debug) memory.bot.locked = true;

        TOOLS.statusHandler(1);

        let width = 60; //inner width of box
        function centerText(text, totalWidth) {
            let leftMargin = Math.floor((totalWidth - (text.length)) / 2);
            let rightMargin = Math.ceil((totalWidth - (text.length)) / 2);

            return '//' + (' '.repeat(leftMargin)) + text + (' '.repeat(rightMargin)) + '//';
        }

        log('\x1b[93m' + '/'.repeat(width + 4));
        log('\x1b[93m' + centerText(`  `, width));
        log('\x1b[93m' + centerText(`OptiBot ${pkg.version} (Build ${build.num})`, width));
        log('\x1b[93m' + centerText(TOOLS.randomizer(cfg.splash), width));
        log('\x1b[93m' + centerText(`(c) Kyle Edwards <wingedasterisk@gmail.com>, 2019`, width));
        log('\x1b[93m' + centerText(`  `, width));
        log('\x1b[93m' + '/'.repeat(width + 4));

        process.title = `OptiBot ${pkg.version} (Build ${build.num}) - ${Math.round(bot.ping)}ms Response Time`;

        memory.bot.title_check = bot.setInterval(() => {
            if (!memory.bot.shutdown) process.title = `OptiBot ${pkg.version} (Build ${build.num}) - ${Math.round(bot.ping)}ms Response Time`;
        }, 1000);
    }
});

////////////////////////////////////////
// Message Reaction Add
////////////////////////////////////////

bot.on('messageReactionAdd', (mr, user) => {
    if (user.id === bot.user.id) return;
    if (mr.message.author.id === bot.user.id) return;
    bot.guilds.get(cfg.basic.of_server).fetchMember(user.id).then((member) => {
        if (mr.emoji.name === '🏅' && member.permissions.has("KICK_MEMBERS", true)) {
            log('emoji detected', 'trace');
            
            if (mr.message.member.permissions.has("KICK_MEMBERS", true)) return;

            memory.db.mdlm.find({ msg_id: mr.message.id }, (err, res) => {
                if (err) TOOLS.errorHandler({ err: err, m: mr.message });
                else if (res.length === 0) {
                    log(`${mr.message.author.username}#${mr.message.author.discriminator} was awarded a medal by ${user.username}#${user.discriminator}`);

                    let embed = new discord.RichEmbed()
                        .setColor(cfg.vs.embed.default)
                        .attachFile(new discord.Attachment(memory.bot.icons.get('opti_medal.png'), "icon.png"))
                        .setAuthor('Medal awarded', 'attachment://icon.png')
                        .setDescription(mr.message.author + ' was awarded a medal by ' + user + '!')

                    mr.message.channel.send({ embed: embed }).then(msg => {
                        memory.db.mdlm.insert({ msg_id: mr.message.id }, (err) => {
                            if (err) TOOLS.errorHandler({ err: err, m: mr.message });
                            else {
                                TOOLS.messageFinalize(user.id, msg)
                            }
                        });

                        memory.db.mdl.update({ user_id: mr.message.author.id }, { $inc: { count: 1 } }, { upsert: true }, (err, updated) => {
                            if (err) TOOLS.errorHandler({ err: err, m: mr.message });
                            log('member medals update: ' + updated, 'debug');
                        });
                    });
                }
            });
        }
    });
});

////////////////////////////////////////
// Message Deleted Event
////////////////////////////////////////

bot.on('messageDelete', m => {
    if (m.author.system || m.author.bot) return;
    if (m.channel.type === 'dm') return;
    if (memory.bot.shutdown) return;
    if (memory.bot.booting) return;
    if (m.content.toLowerCase().startsWith('!dr')) return;

    log('messageDelete event', 'trace')

    let now = new Date();

    let msg1 = `Recorded message deletion at ${now}.`;
    let msg2 = "\nDeleted by author.";
    let msg3 = `\nPosted by ${m.author.username}#${m.author.discriminator} `;
    let msg4 = `in #${m.channel.name} on ${m.createdAt} \nMessage Contents: \n"${m.content}"`;

    log('begin calculation of executor', 'trace')
    bot.guilds.get(cfg.basic.of_server).fetchAuditLogs({ limit: 10, type: 'MESSAGE_DELETE' }).then((audit) => {

        let ad = [...audit.entries.values()];
        let discord_log;
        let cached_log;
        let entryFound = false;
        let newEntry = false;

        for(let i=0; i<ad.length; i++) {
            if(ad[i].target.id === m.author.id) {
                discord_log = ad[i];
                c1();
                break;
            } else
            if(i+1 === ad.length) {
                finalLog();
            }
        }

        function c1() {
            /*for(let i=0; i<memory.bot.log.length; i++) {
                if(!discord_log) {
                    break;
                } else
                if(memory.bot.log[i].id === discord_log.id) {
                    break;
                } else
                if(i+1 === memory.bot.log.length) {
                    log('entry does not exist in cache, must be new.', 'trace');
                }
            }*/

            for(let i=0; i<memory.bot.log.length; i++) {
                if(memory.bot.log[i].target.id === m.author.id && !cached_log) {
                    cached_log = memory.bot.log[i];
                }

                if(memory.bot.log[i].id === discord_log.id) {
                    entryFound = true;
                }
                
                if(i+1 === memory.bot.log.length) {
                    if(!cached_log) {
                        finalLog();
                        return;
                    }

                    if(!entryFound) {
                        log('entry does not exist in cache, must be new.', 'trace');
                        newEntry = true;  
                    }

                    c2();
                }
            }

            function c2() {
                if(discord_log.id === cached_log.id) {
                    log('same ID', 'trace')
                } else {
                    log('NOT same ID', 'trace');
                }

                log('cached count: '+cached_log.extra.count,'trace');
                log('discord count: '+discord_log.extra.count,'trace');

                if((cached_log.extra.count < discord_log.extra.count) || newEntry) {
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
});

////////////////////////////////////////
// Message Edited Event
////////////////////////////////////////

bot.on('messageUpdate', (m, mNew) => {
    if (m.author.system || m.author.bot) return;
    if (m.channel.type === 'dm') return;
    if (memory.bot.shutdown) return;
    if (memory.bot.booting) return;
    if (m.content.trim().toLowerCase() == mNew.content.trim().toLowerCase()) return;
    if (m.content.toLowerCase().startsWith('!dr')) return;

    let msg1 = `Recorded message edit at ${new Date()}`;
    let msg2 = `\nPosted by ${m.author.username}#${m.author.discriminator} `;
    let msg3 = `in #${m.channel.name} on ${m.createdAt} \nOriginal Message Contents: \n"${m.content}"`
    let msg4 = `\n\nNew Message Contents: \n"${mNew.content}"`

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
    if (memory.bot.shutdown) return;
    if (memory.bot.booting) return;
    if (member.guild.id !== cfg.basic.of_server) return;

    let user = member.user.username + '#' + member.user.discriminator;

    log('User has joined the server: ' + user + ' (' + member.user.id + ')');

    if (memory.bot.debug && cfg.superusers.indexOf(member.user.id) === -1) return;

    let embed = new discord.RichEmbed()
        .setColor(cfg.vs.embed.default)
        .attachFile(new discord.Attachment(memory.bot.icons.get('opti_fine.png'), "icon.png"))
        .setAuthor('Welcome to the official OptiFine Discord server!', 'attachment://icon.png')
        .setDescription("Please be sure to read the <#479192475727167488> BEFORE posting, not to mention the <#531622141393764352>. If you're a donator, use the command `!help dr` for instructions to get your donator role.")
        .setFooter('Thank you for reading!')

    member.send({ embed: embed }).catch((err) => {
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

    memory.db.muted.find({ member_id: member.user.id }, (err, res) => {
        if (err) TOOLS.errorHandler({ err: err });
        else if (res.length > 0) {
            log(`User ${user} attempted to circumvent mute.`, 'warn');
            member.addRole(cfg.roles.muted, `User left and rejoined. Reinstated mute issued by ${res[0].executor}.`).then(() => {
                if (res[0].time !== false) {
                    memory.db.muted.update({ member_id: member.user.id }, { $set: { time: new Date(res[0].time + 3600000) } }, (err) => {
                        if (err) TOOLS.errorHandler({ err: err });
                        else {
                            log(`Mute for user ${user} has been extended by one hour.`, 'warn');
                        }
                    });
                }
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
                let msg = 'User ' + member.username + '#' + member.discriminator + ' (' + member.id + ') was banned by ' + ad.executor.username + '#' + ad.executor.discriminator;

                if (ad.reason) msg += '\nReason: ' + ad.reason;

                log(msg, 'warn');
            } else {
                log('User ' + member.username + '#' + member.discriminator + ' (' + member.id + ') was banned from the server.', 'warn');
                log('Could not determine ban executor.', 'warn');
            }
        }).catch(err => log(err.stack, 'error'));
    }, 500);
});

////////////////////////////////////////
// User left/was kicked
////////////////////////////////////////

bot.on('guildMemberRemove', member => {
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
// Message Received Event
////////////////////////////////////////

bot.on('message', (m) => {
    if (m.author.bot || m.author.system) return; // message was posted by system or bot
    if (memory.bot.booting) return; // bot is still loading required assets
    if (memory.bot.shutdown) return; // bot is shutting down or going under a scheduled restart
    if (cfg.channels.blacklist.indexOf(m.channel.id) > -1) return; // channel is on blacklist

    if (memory.cd.active) return;

    let input = m.content.trim().split("\n", 1)[0];
    let cmd = input.toLowerCase().split(" ")[0].substr(1);
    let args = input.split(" ").slice(1).filter(function (e) { return e.length != 0 });
    let isSuper = cfg.superusers.indexOf(m.author.id) > -1;
    let cmdValidator = input.match(new RegExp("\\" + cfg.basic.trigger + "\\w"));

    if (memory.bot.debug && !isSuper && memory.bot.locked) {
        // bot is in debug mode and restricted to superuser access only.
        if(m.channel.type === 'dm') {
            TOOLS.errorHandler({ err: 'OptiBot is currently undergoing maintenance. Please try again later!', m: m });
        } else
        if(cmdValidator && input.indexOf(cmdValidator[0]) === 0) {
            TOOLS.errorHandler({ err: 'OptiBot is currently undergoing maintenance. Please try again later!', m: m, temp:true });
        }
        return;
    }

    if (!bot.guilds.get(cfg.basic.of_server).available) {
        TOOLS.errorHandler({ err: 'OptiBot is unable to access the OptiFine server. Please try again later!', m: m });
        return;
    }

    bot.guilds.get(cfg.basic.of_server).fetchMember(m.author).then(member => {
        let isAdmin = member.permissions.has("KICK_MEMBERS", true);

        if (memory.cd.active && !isAdmin && !isSuper) return; // bot is in cooldown mode and the user does not have mod/superuser permissions

        if(memory.bot.locked && !isAdmin && !isSuper) return; // bot is in mods-only mode and the user is not a mod/superuser.

        memory.bot.lastInt = new Date().getTime();

        if (cmdValidator && input.indexOf(cmdValidator[0]) === 0) {
            // COMMAND
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
                                    if(isSuper && m.channel.type === 'dm') {
                                        filtered = list
                                    } else
                                    if(isAdmin) {
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

                                    if(closest.bestMatch.rating > 0.2) {
                                        embed.setDescription(`Perhaps you meant \`${cfg.basic.trigger}${closest.bestMatch.target}\`? (${(closest.bestMatch.rating * 100).toFixed(1)}% match)`)
                                    }

                                    m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                                });
                            }

                            if (!res) {
                                log('unknown cmd');
                                unknown();
                            } else
                            if (res.getMetadata().hidden && !isSuper) {
                                log('hidden cmd');
                                log(JSON.stringify(res.getMetadata()));
                                unknown();
                            } else
                            if (res.getMetadata().admin_only && !isAdmin) {
                                TOOLS.errorHandler({ err: 'You do not have permission to use this command.', m: m });
                            } else
                            if (res.getMetadata().dm === 0 && m.channel.type === 'dm') {
                                TOOLS.errorHandler({ err: 'This command can only be used in server chat.', m: m });
                            } else
                            if (res.getMetadata().dm === 2 && m.channel.type !== 'dm' && (!isAdmin || !isSuper)) {
                                m.delete();
                                TOOLS.errorHandler({ err: 'This command can only be used in DMs.', m: m, temp: true });
                            } else {
                                res.exec(m, args, member, { isAdmin: isAdmin, isSuper: isSuper });
                            }
                        });
                    }
                });
            }, 100);
        } else {
            // NON-COMMAND
            if (m.channel.type === 'dm') {
                let embed = new discord.RichEmbed()
                    .setColor(cfg.vs.embed.default)
                    .attachFile(new discord.Attachment(memory.bot.icons.get('opti_info.png'), "icon.png"))
                    .setAuthor(`Hi there! For a list of commands, type "${cfg.basic.trigger}help". If you've donated and you would like to receive your donator role, type "${cfg.basic.trigger}help dr" for detailed instructions.`, 'attachment://icon.png');

                m.channel.send({ embed: embed });
            } else
            if (memory.bot.smr.some(badlink => m.content.includes(badlink.url))) {
                TOOLS.typerHandler(m.channel, true);
                let foundLinks = [];
                for (let i = 0; i < memory.bot.smr.length; i++) {
                    if (m.content.indexOf(memory.bot.smr[i].url) > -1) {
                        foundLinks.push(memory.bot.smr[i].url);
                    }

                    if (i + 1 === memory.bot.smr.length) {
                        let embed = new discord.RichEmbed()
                            .setColor(cfg.vs.embed.default)
                            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_warn.png'), "icon.png"))
                            .setAuthor('StopModReposts', 'attachment://icon.png')
                            .setDescription('A link to an illegal Minecraft mod website was detected in a recent message. Remember to avoid suspicious links, and proceed with caution. \nhttps://stopmodreposts.org/')
                            .addField((foundLinks.length === 1) ? "Detected URL" : "Detected URLs", "```" + foundLinks.join(', ') + "```");

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
                log('possible match', 'trace');
                //capture everything between quotes, codeblocks, and strikethroughs.
                let filter = m.content.match(/"[^"]+"|`{3}[^```]+`{3}|~{2}[^~~]+~{2}|`{1}[^`]+`{1}|<[^<>]+>/gi);
                let filtered = new String(m.content);

                function s2() {
                    let refs = filtered.match(/(?<![a-z]#)(?<=#)(\d+)(?![a-z])\b/gi);

                    if (refs !== null) {
                        //ignore first 10 issues, and numbers that are larger than 5 characters in length.
                        if (refs.filter(e => (e.length < 5) && (parseInt(e) > 10)).length > 0) {
                            log('finally', 'trace');
                            TOOLS.typerHandler(m.channel, true);
                            TOOLS.ghRefs(m, refs, isAdmin);
                        }
                    }
                }

                if (filter !== null) {
                    log('replacing quotes', 'trace');
                    for (i = 0; i < filter.length; i++) {
                        log('replacing ' + i, 'trace');
                        filtered = filtered.replace(filter[i], '');

                        if (i + 1 === filter.length) {
                            s2();
                        }
                    }
                } else {
                    s2();
                }
            } else
            if (m.content.toLowerCase().indexOf('r/') > -1) {
                log('possible subreddit match', 'trace');
                let embed = new discord.RichEmbed()
                    .setColor(cfg.vs.embed.default)
                    .attachFile(new discord.Attachment(memory.bot.icons.get('opti_reddit.png'), "icon.png"))
                    .setAuthor('Subreddit Finder', 'attachment://icon.png');

                let rgx = m.content.match(/(?<=\s|^)(?:\/?)r\/[a-z_]{3,20}\b/gi);
                let urls = [];
                let urls_final = '';

                if(rgx) {
                    rgx.forEach(e => {
                        if(e.startsWith('/')) {
                            urls.push('https://www.reddit.com/subreddits/search.json?q='+e.substring(3)+'&limit=1');
                        } else {
                            urls.push('https://www.reddit.com/subreddits/search.json?q='+e.substring(2)+'&limit=1');
                        }
                    });
                }

                log(urls, 'trace');

                let rli = 0;
                (function requestLoop() {
                    log("looking at: "+urls[rli], 'trace');
                    request({url: urls[rli], headers: { 'User-Agent': 'optibot' } }, (err, res, body) => {
                        if(err || !res || !body) {
                            TOOLS.errorHandler({ err: err || new Error(errmsg) });
                        } else 
                        if(res.statusCode === 200) {
                            log(body, 'trace');
                            let json = JSON.parse(body);

                            if(json.kind === "Listing" && json.data.children[0].kind === "t5") {
                                let firstResult = json.data.children[0].data;
                                urls_final += `[${firstResult.display_name_prefixed}](https://www.reddit.com${firstResult.url})\n`;
                            }

                            if(rli+1 >= urls.length) {
                                log("done", 'trace');
                                if(urls_final.length !== 0) {
                                    embed.setDescription(urls_final);

                                    m.channel.send({embed: embed}).then(msg => TOOLS.messageFinalize(m.author.id, msg) );
                                }
                            } else {
                                urls_final += '\n';
                                rli++;
                                requestLoop();
                            }
                        } else {
                            log('unexpected code: '+res.statusCode, 'trace');
                        }
                    });
                })();

            } else {
                // Everything here can run all at once

                if(m.content.toLowerCase().indexOf('discord.gg') > -1 || m.content.toLowerCase().indexOf('discordapp.com/invite') > -1) {
                    log('possible invite link match', 'trace')
                    
                    let invites = m.content.match(/(?<=discord\.gg\/)\b\w+(?!\/)|(?<=discordapp\.com\/invite\/)\b\w+(?!\/)/gi);

                    if(invites !== null) {
                        invites.forEach((inviteCode) => {
                            bot.fetchInvite(inviteCode).then((invite) => {
                                log(`Invite link detected: ${invite.url} (${invite.guild.name}) \nPosted by ${m.author.username}#${m.author.discriminator}`)
                            }).catch(err => TOOLS.errorHandler({err:err}) )
                        })
                    }
    
                }

                if (m.isMentioned(bot.user)) {
                    m.react(bot.guilds.get(cfg.basic.ob_server).emojis.get('588182322944278528'));
                    /*m.channel.send(`${}`).then(msg => {
                        bot.setTimeout(() => {
                            if (!msg.deleted) {
                                msg.delete();
                            }
                        }, 10000);
                    });*/
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
    trigger: 'status',
    short_desc: 'Server statuses.',
    long_desc: 'Displays current status of OptiFine and Minecraft/Mojang services.',
    hidden: false,
    fn: (m) => {
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
        let of_servers_text = '';
        let mc_websites_text = '';
        let mc_servers_text = '';
        let footer = "Hover over the links for detailed information. - If you're having issues, check your internet connection.";

        function translate(cb) {
            log('translate()', 'trace');
            of_servers_text = '';
            mc_websites_text = '';
            mc_servers_text = '';
            function translator(target, index, cb1) {
                if (target[index].status === 'gray') {
                    cb1(`${bot.guilds.get(cfg.basic.ob_server).emojis.get('578346059965792258')} Pinging [${target[index].server}](https://${target[index].server}/ "Code ${target[index].code} - ${target[index].desc}")...`);
                } else
                    if (target[index].status === 'green') {
                        cb1(`<:okay:546570334233690132> [${target[index].server}](https://${target[index].server}/ "Code ${target[index].code} - ${target[index].desc}") is online`);
                    } else {
                        footer = "Hover over the links for detailed information. - Maybe try again in 10 minutes?";
                        if (target[index].status === 'teal') {
                            cb1(`<:warn:546570334145609738> Unknown response from [${target[index].server}](https://${target[index].server}/ "Code ${target[index].code} - ${target[index].desc}")`);
                        } else
                            if (target[index].status === 'yellow') {
                                cb1(`<:warn:546570334145609738> Partial outage at [${target[index].server}](https://${target[index].server}/ "Code ${target[index].code} - ${target[index].desc}")`);
                            } else
                                if (target[index].status === 'orange') {
                                    cb1(`<:error:546570334120312834> An error occurred while pinging [${target[index].server}](https://${target[index].server}/ "Code ${target[index].code} - ${target[index].desc}")`);
                                } else
                                    if (target[index].status === 'red') {
                                        cb1(`<:error:546570334120312834> [${target[index].server}](https://${target[index].server}/ "Code ${target[index].code} - ${target[index].desc}") is down`);
                                    } else
                                        if (target[index].status === 'black') {
                                            cb1(`<:error:546570334120312834> Failed to get any response from [${target[index].server}](https://${target[index].server}/ "Code ${target[index].code} - ${target[index].desc}")`);
                                        }
                    }
            }

            let mc_i1 = 0;
            let mc_i2 = 0;
            let mc_i3 = 0;

            (function loop_of() {
                log('optifine loop' + mc_i1, 'trace');
                translator(responses.optifine, mc_i1, (result) => {
                    of_servers_text += result + '\n';

                    if (parseInt(mc_i1) + 1 === responses.optifine.length) {
                        loop_mc1();
                    } else {
                        mc_i1++
                        loop_of();
                    }
                });
            })();

            function loop_mc1() {
                log('mojangweb loop' + mc_i2, 'trace');
                translator(responses.mojang_web, mc_i2, (result) => {
                    mc_websites_text += result + '\n';

                    if (parseInt(mc_i2) + 1 === responses.mojang_web.length) {
                        loop_mc2();
                    } else {
                        mc_i2++
                        loop_mc1();
                    }
                });
            }

            function loop_mc2() {
                log('mojang loop' + mc_i3, 'trace');
                translator(responses.mojang, mc_i3, (result) => {
                    mc_servers_text += result + '\n';

                    if (parseInt(mc_i3) + 1 === responses.mojang.length) {
                        if (cb) cb(of_servers_text, mc_websites_text, mc_servers_text);
                    } else {
                        mc_i3++
                        loop_mc2();
                    }
                });
            }
        }

        translate(() => {
            log('length1: ' + of_servers_text.length, 'trace');
            log('length2: ' + mc_servers_text.length, 'trace');

            let embed = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFile(new discord.Attachment(memory.bot.icons.get('opti_connect.png'), "icon.png"))
                .setAuthor('Server Status', 'attachment://icon.png')
                .addField('OptiFine Servers', of_servers_text)
                .addField('Mojang Websites', mc_websites_text)
                .addField('Mojang Services', mc_servers_text)
                .setFooter(footer);

            m.channel.send("_ _", { embed: embed }).then(msg => {
                TOOLS.messageFinalize(m.author.id, msg);

                let s1 = false;
                let s2 = false;
                let s3 = false;
                let s4 = false;

                let current_of = JSON.parse(JSON.stringify(of_servers_text));
                let current_mw = JSON.parse(JSON.stringify(mc_websites_text));
                let current_mc = JSON.parse(JSON.stringify(mc_servers_text));

                let thisLoop = 0;

                let updateLoop = bot.setInterval(() => {
                    thisLoop++;
                    if (thisLoop === 5) embed.setDescription('This is taking a while. At this point, you could safely assume the remaining servers are down.');
                    if (msg.deleted) {
                        log('status message deleted', 'trace');
                        bot.clearInterval(updateLoop);
                    } else {
                        log('checking update', 'trace');
                        translate((newOF, newMW, newMC) => {
                            if (current_of !== newOF || current_mc !== newMC || current_mw !== newMW || thisLoop === 5) {
                                log(current_of, 'trace');
                                log(newOF, 'trace');
                                log('status changed', 'trace');
                                embed.fields[0].value = newOF;
                                embed.fields[1].value = newMW;
                                embed.fields[2].value = newMC;
                                embed.setFooter(footer);

                                if (s1 && s2 && s3 && s4) {
                                    embed.description = null;
                                    msg.edit("_ _", { embed: embed });

                                    log('status message updated', 'trace');
                                    log('finished checking status', 'trace');
                                    bot.clearInterval(updateLoop);
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

                }, 2000);

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
            });
        });
    }
}));

CMD.register(new Command({
    trigger: 'about',
    short_desc: 'About OptiBot',
    long_desc: 'Displays basic information about OptiBot, including credits and the current version.',
    hidden: false,
    fn: (m) => {
        let p0 = jimp.read(bot.user.avatarURL);
        let p1 = jimp.read(memory.bot.icons.get('optifine_thumbnail_mask.png'));
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

        Promise.all([p0, p1]).then((imgs) => {
            imgs[0].resize(512, 512, jimp.RESIZE_BILINEAR)
                .mask(imgs[1], 0, 0)
                .getBuffer(jimp.AUTO, (err_b, imgFinal) => {
                    if (err_b) TOOLS.errorHandler({ m: m, err: err_b });
                    else {
                        let embed = new discord.RichEmbed()
                            .setColor(cfg.vs.embed.default)
                            .attachFiles([new discord.Attachment(memory.bot.icons.get('opti_info.png'), "icon.png"), new discord.Attachment(imgFinal, "logo.png")])
                            .setThumbnail('attachment://logo.png')
                            .setAuthor('About', 'attachment://icon.png')
                            .setDescription('The official OptiFine Discord server bot. Developed independently by <@181214529340833792> out of love for a great community.')
                            .addField('OptiBot', `Version ${pkg.version}\n(Build ${build.num})`, true)
                            .addField('Uptime', `Session: ${uptime(process.uptime() * 1000)}\nTotal: ${uptime(new Date().getTime() - memory.bot.startup)}`, true)
                            .addField('Discord.js', `Version ${pkg2.version}`, true)
                            .addField('Node.js', `Version ${process.version.replace('v', '')}`, true)
                            .addField('Contributors', cntbrs.join(', '))
                            .addField('Donators', dntrs.join(', '))

                        m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                    }
                });
        });
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
                "🅱️ruh moment",
                "😂😂😂😂😂😂😂😂😂😂😂️ WHO DID THIS 😂😂😂😂😂😂😂😂😂😂😂"
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
    fn: (m) => {
        if (memory.bot.debug) {
            memory.bot.locked = false;
            TOOLS.statusHandler(1);
            m.channel.send("CodeMode restriction disabled.").then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
        } else 
        if(!memory.bot.locked) {
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
    fn: (m) => {
        if (memory.bot.debug) {
            memory.bot.locked = true;
            TOOLS.statusHandler(1);
            m.channel.send("CodeMode restriction enabled.").then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
        } else
        if(memory.bot.locked) {
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
    admin_only: true,
    hidden: true,
    fn: (m) => {
        bot.guilds.get(cfg.basic.of_server).fetchMember(bot.user.id).then((member) => {
            let perms_all = member.permissions.serialize();
            let perms_enabled = '';
            let perms_disabled = '';
            log(perms_all, 'debug');

            let perms_names = Object.keys(perms_all);
            perms_names.forEach((flag) => {
                if(perms_all[flag]) {
                    perms_enabled += flag+'\n';
                } else {
                    perms_disabled += flag+'\n';
                }
            });

            let embed = new discord.RichEmbed()
                .attachFile(new discord.Attachment(memory.bot.icons.get('opti_wait.png'), "icon.png"))
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
    trigger: 'website',
    short_desc: "Provides a link to both OptiFine official websites.",
    hidden: false,
    fn: (m) => {
        let embed = new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_fine.png'), "thumbnail.png"))
            .setAuthor('OptiFine Official Websites', 'attachment://thumbnail.png')
            .setDescription('Primary: https://optifine.net/home' +
                '\nAlternate: https://optifined.net/');

        m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
    }
}));

CMD.register(new Command({
    trigger: 'dl',
    short_desc: "Provides a link to download OptiFine.",
    hidden: false,
    fn: (m) => {
        // yes its almost exactly the same as !website but
        // uh
        // shut up, builder wanted it

        let embed = new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_fine.png'), "thumbnail.png"))
            .setAuthor('Download OptiFine', 'attachment://thumbnail.png')
            .setDescription('Primary: https://optifine.net/downloads' +
                '\nAlternate: https://optifined.net/');

        m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
    }
}));

CMD.register(new Command({
    trigger: 'labs',
    short_desc: "Provides a link to the ShaderLABS Discord.",
    hidden: false,
    fn: (m) => {
        let embed = new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_lab.png'), "thumbnail.png"))
            .setAuthor('ShaderLABS Discord Server', 'attachment://thumbnail.png')
            .setDescription('https://discord.gg/RP8CEdB');

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
    trigger: 'open',
    short_desc: "Open text channel.",
    long_desc: "Opens the active text channel, if already closed.",
    admin_only: true,
    fn: (m) => {
        // todo
    }
}));

CMD.register(new Command({
    trigger: 'close',
    short_desc: "Close text channel.",
    long_desc: "Closes the active text channel, preventing users from sending messages. Only works if the channel is already open, obviously.",
    admin_only: true,
    fn: (m) => {
        // todo
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
            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_info.png'), "icon.png"))
            .setAuthor('The Thanos Method', 'attachment://icon.png')
            .setDescription('The Thanos Method is a debugging technique used to find mods that are incompatible with OptiFine.')
            .addField('How does it work?', `It's simple. Split your mods into 2 groups, not including OptiFine. Remove one group, and test in-game. Keep the group that has the problem, and repeat until only 1-2 mods are remaining. Now go report the incompatibility on GitHub!`)

        m.channel.send({embed: embed}).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
    }
}));

CMD.register(new Command({
    trigger: 'server',
    fn: (m) => {
        //todo
        // !server [name] command, gives a server invite link based on string similarity
    }
}));

CMD.register(new Command({
    trigger: 'jarfix',
    fn: (m) => {
        let embed = new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_info.png'), "thumbnail.png"))
            .setAuthor('Jarfix', 'attachment://thumbnail.png')
            .setDescription('https://johann.loefflmann.net/en/software/jarfix/index.html');

        m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
    }
}));

// commands with arguments

CMD.register(new Command({
    trigger: 'medals',
    short_desc: "View someones medal count. Defaults to yourself if no name is provided.",
    usage: "[user]",
    hidden: false,
    fn: (m, args) => {
        if(args[0]) {
            TOOLS.getTargetUser(m, args[0], (userid, name) => {
                if(userid) {
                    if(userid === m.author.id) {
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
            memory.db.mdl.find({ user_id: userid }, (err, res) => {
                if (err) TOOLS.errorHandler({ err: err, m: m });
                else if (res.length === 0) {
                    let embed = new discord.RichEmbed()
                        .setColor(cfg.vs.embed.default)
                        .attachFile(new discord.Attachment(memory.bot.icons.get('opti_medal.png'), "icon.png"))
                        .setAuthor(`${(name) ? name+' has' : 'You have' } not earned any medals.`, 'attachment://icon.png')
    
                    m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                } else {
                    let embed = new discord.RichEmbed()
                        .setColor(cfg.vs.embed.default)
                        .attachFile(new discord.Attachment(memory.bot.icons.get('opti_medal.png'), "icon.png"))
                        .setAuthor(`${(name) ? name+' has' : 'You have' } earned ${res[0].count} medal${(res[0].count === 1) ? '' : 's'}.`, 'attachment://icon.png')
    
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
            bot.guilds.get(cfg.basic.of_server).channels.get('479192475727167488').fetchMessage('592778532132880425').then((msg) => {
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
                    if(parseInt(args[0]) < 0) {
                        joke = '.tsixe ton seod elur tahT';
                    } else
                    if(parseInt(args[0]) === 0) {
                        joke = '⠀';
                    } else
                    if(args[0] === '007') {
                        joke = 'No, Mr. Bond, I expect you to die.';
                    } else
                    if(parseInt(args[0]) === 32) {
                        joke = '2,147,483,647';
                    } else
                    if(parseInt(args[0]) === 34) {
                        joke = 'Hilarious.';
                    } else
                    if(parseInt(args[0]) === 42) {
                        joke = 'The answer to life, the universe, and everything.';
                    } else
                    if(parseInt(args[0]) === 64) {
                        joke = 'YAHOOOOOOOOOOooo';
                    } else
                    if(parseInt(args[0]) === 69) {
                        joke = 'nice';
                    } else
                    if(parseInt(args[0]) === 88) {
                        joke = '88 MILES PER HOOOUURR';
                    } else
                    if(parseInt(args[0]) === 115) {
                        joke = "🎵 I'll bring you down all on my own 🎵";
                    } else
                    if(parseInt(args[0]) === 173) {
                        joke = '[REDACTED]';
                    } else
                    if(parseInt(args[0]) === 314) {
                        joke = Math.PI+'...';
                    } else
                    if(parseInt(args[0]) === 418) {
                        joke = "You better not put on Stal.";
                    } else
                    if(parseInt(args[0]) === 420) {
                        joke = 'DUDE WEED LMAO';
                    } else
                    if(parseInt(args[0]) === 523) {
                        joke = 'Happy birthday, Jack!';
                    } else
                    if(parseInt(args[0]) === 614) {
                        joke = '🙂';
                    } else
                    if(parseInt(args[0]) === 666) {
                        joke = 'Rip and tear, until it is done.';
                    } else
                    if(parseInt(args[0]) === 1337) {
                        joke = '7h47 rul3 d035 n07 3x157.';
                    } else
                    if(parseInt(args[0]) === 1701) {
                        joke = 'These are the voyages of the starship Enterprise...';
                    } else
                    if(parseInt(args[0]) === 1944) {
                        joke = 'ALLIES ARE TURNING THE WAR!';
                    } else
                    if(parseInt(args[0]) === 1962) {
                        joke = 'We choose to go to the moon in this decade and do the other things.';
                    } else
                    if(parseInt(args[0]) === 2000) {
                        joke = "Here's to another lousy millennium.";
                    } else
                    if(parseInt(args[0]) === 9001) {
                        joke = 'This joke died 10 years ago.';
                    } else 
                    if(parseInt(args[0]) === 80085) {
                        joke = 'Hilarious.';
                    } else
                    if(parseInt(args[0]) === 299792458) {
                        joke = "You just googled the speed of light, didn't you?";
                    } else 
                    if(parseInt(args[0]) > Number.MAX_SAFE_INTEGER) {
                        joke = 'https://stackoverflow.com/';
                    } else {
                        joke = 'That rule does not exist.';
                    }
                    TOOLS.errorHandler({ err: joke, m:m });
                }
            });
        }
    }
}));

CMD.register(new Command({
    trigger: 'help',
    short_desc: 'Information hub for OptiBot functions.',
    long_desc: 'Information hub for OptiBot commands and other functions.',
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
                .setDescription("**Please note that OptiBot is currently in an open BETA.** Some features may be missing, and others may be slightly broken. Please report any and all issues to <@181214529340833792>. Thanks! \n\nTo get started with OptiBot, use either of the following commands:")
                .addField('Assistant Functions', `\`\`\`[coming soon]\`\`\``)
                .addField('Commands List', `\`\`\`${cfg.basic.trigger}list\`\`\``)

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
                    let role_restriction = [];
                    let embed = new discord.RichEmbed()
                        .setColor(cfg.vs.embed.default)
                        .setDescription(md.long_desc);

                    if (md.hidden) {
                        role_restriction.push('Developers');
                    } else
                        if (md.admin_only) {
                            role_restriction.push('Moderators/Administrators');
                        } else
                            if (md.donator_only) {
                                role_restriction.push('Donators');
                            }

                    if (role_restriction.length > 0) {
                        embed.addField('Restricted Command', ':lock: This command can only be used by: ' + role_restriction.join(', ') + ".");
                    }

                    if (md.dm === 0) {
                        embed.setFooter("This command can NOT be used in DMs.", 'https://cdn.discordapp.com/emojis/546570334120312834.png');
                    } else
                        if (md.dm === 1) {
                            embed.setFooter("This command can be used in DMs.", 'https://cdn.discordapp.com/emojis/546570334233690132.png');
                        } else
                            if (md.dm === 2) {
                                embed.setFooter("This command can ONLY be used in DMs.", 'https://cdn.discordapp.com/emojis/546570334145609738.png');
                            }

                    if (md.icon) {
                        files.push(new discord.Attachment(eval(md.icon), "thumbnail.png"));
                        embed.attachFiles(files)
                            .setAuthor('OptiBot Command: ' + cfg.basic.trigger + md.trigger, 'attachment://icon.png')
                            .setThumbnail('attachment://thumbnail.png');
                    } else {
                        embed.attachFiles(files)
                            .setAuthor('OptiBot Command: ' + cfg.basic.trigger + md.trigger, 'attachment://icon.png');
                    }

                    embed.addField('Usage', "```" + md.usage + "```");

                    m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                }
            });
        }
    }
}));

CMD.register(new Command({
    trigger: 'list',
    short_desc: 'Lists all OptiBot commands.',
    long_desc: "Lists all OptiBot commands, including a short description.",
    usage: "[admin | page# [admin]]",
    hidden: false,
    dm: 2,
    fn: (m, args, member, misc) => {
        CMD.getAll((list) => {
            let filtered;
            let menu;

            if(args[0] && isNaN(args[0])) {
                if((args[0].toLowerCase() === 'admin' || args[0].toLowerCase() === 'mod') && misc.isAdmin) {
                    menu = 'admin'
                } else
                if(args[0].toLowerCase() === 'sudo' && misc.isSuper) {
                    menu = 'sudo'
                }
            } else 
            if(args[1] && isNaN(args[1])) {
                if((args[1].toLowerCase() === 'admin' || args[1].toLowerCase() === 'mod') && misc.isAdmin) {
                    menu = 'admin'
                } else
                if(args[1].toLowerCase() === 'sudo' && misc.isSuper) {
                    menu = 'sudo'
                }
            }

            if(menu === 'sudo') {
                filtered = list.filter((cmd) => (cmd.getMetadata().hidden === true));
            } else
            if(menu === 'admin') {
                filtered = list.filter((cmd) => (cmd.getMetadata().admin_only === true && cmd.getMetadata().hidden === false));
            } else {
                filtered = list.filter((cmd) => (cmd.getMetadata().admin_only === false && cmd.getMetadata().hidden === false));
            }

            let pageNum = 1
            let pageLimit = Math.ceil(filtered.length / 10);
            if(args[0] && !isNaN(args[0]) && parseInt(args[0]) > 0 && parseInt(args[0]) <= pageLimit) {
                pageNum = parseInt(args[0]);
            }

            let special_text = ""

            if(menu === 'sudo') {
                special_text = 'Special menu: Super User\n\n';
            } else 
            if(menu === 'admin') {
                special_text = 'Special menu: Administration/Moderation\n\n';
            }

            let embed = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFile(new discord.Attachment(memory.bot.icons.get('opti_info.png'), "icon.png"))
                .setAuthor(`OptiBot Commands List | Page ${pageNum}/${pageLimit}`, 'attachment://icon.png')
                .setDescription(`${special_text} Use \`${cfg.basic.trigger}help <command>\` for more information on a particular command. \n\nIcons represent the usability of commands in bot DMs.`)
                .setFooter(`Viewing ${filtered.length} commands, out of ${list.length} total.`);
            
            let i = (pageNum > 1) ? (10 * (pageNum - 1)) : 0;
            let added = 0;
            (function addList() {

                let cmd = filtered[i].getMetadata();
                let dm_permissions;

                if(cmd.dm === 0) {
                    dm_permissions = bot.guilds.get(cfg.basic.ob_server).emojis.get('546570334120312834')
                } else
                if(cmd.dm === 1) {
                    dm_permissions = bot.guilds.get(cfg.basic.ob_server).emojis.get('546570334233690132')
                } else
                if(cmd.dm === 2) {
                    dm_permissions = bot.guilds.get(cfg.basic.ob_server).emojis.get('546570334145609738')
                }

                embed.addField(cfg.basic.trigger+cmd.trigger, `${dm_permissions} - ${cmd.short_desc}`);
                added++;
                
                if(added >= 10 || i+1 >= filtered.length) {
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
    long_desc: "Provides detailed information about OptiFine donations. \nIf you'd like to support OptiBot donations instead, see page 2.",
    usage: "[page #]",
    hidden: false,
    fn: (m, args) => {
        let pages = [
            {
                embed: new discord.RichEmbed()
                    .setColor(cfg.vs.embed.default)
                    .attachFile(new discord.Attachment(memory.bot.icons.get('opti_donate.png'), "thumbnail.png"))
                    .setAuthor('Donation Info | Page 1/2', 'attachment://thumbnail.png')
                    .addField('OptiFine Donations', "Support OptiFine's development with one-time donation of $10, and optionally receive an OptiFine player cape in recognition of your awesomeness. In addition, you may request the Donator role on this very Discord server. This grants instant access to the exclusive, donator-only text channel. (type `" + cfg.basic.trigger + "help dr` in DMs for instructions) \n\nhttps://optifine.net/donate")
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
    long_desc: "Checks if the attached file is written with valid JSON syntax.",
    usage: "<file attachment>",
    hidden: false,
    fn: (m) => {
        let file = m.attachments.first(1)[0];
        if (!file) {
            TOOLS.errorHandler({ err: 'You must upload a file attachment to validate.', m: m });
        } else
            if (file.filesize > 1048576) {
                TOOLS.errorHandler({ err: 'File size cannot exceed 1MB.', m: m });
            } else {
                log(file.filename);
                request({ url: file.url, headers: { 'User-Agent': 'optibot' } }, (err, res, body) => {
                    if (err || !res || !body || res.statusCode !== 200) {
                        TOOLS.errorHandler({ err: err || new Error('Unable to retrieve the message attachment.'), m: m });
                    } else {
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
                                        .setDescription('No issues were found.');

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
    trigger: 'dr',
    short_desc: 'Verifies your donator status.',
    long_desc: "Verifies your donator status. If successful, this will grant you the Donator role, and reset your Donator token in the process. \n\nYou can find your donator token by logging in through the website. https://optifine.net/login. Look at the bottom of the page for a string of random characters. **Remember that your \"Donation ID\" is NOT your token!**",
    usage: "<donation e-mail> <token>",
    icon: `memory.bot.images.get("token.png")`,
    hidden: false,
    dm: 2,
    fn: (m, args, member) => {
        if (member.roles.has(cfg.roles.donator)) {
            TOOLS.errorHandler({ err: "You already have the donator role!", m: m });
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
                            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_success.png'), "icon.png"))
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

                if(typeof returnMsg === 'string') file_encoding = 'txt';
                else if(typeof returnMsg === 'function' || typeof returnMsg === 'undefined') file_encoding = 'js';
                else file_encoding = 'json';



                try {
                    msg = `\`\`\`${cb_lang + '\n'}${(typeof returnMsg === 'string') ? returnMsg : JSON.stringify(returnMsg)}\`\`\``;
                } catch (e) { }

                if(Buffer.isBuffer(returnMsg)) {
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
            }, 500);
        }
        catch (err) {
            log("Error at eval(): " + err.stack, 'warn');
            let errMsg = `\`\`\`${err.stack}\`\`\``;

            if(errMsg.length >= 2000) {
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
    long_desc: "Enables text mute for the specified user. User must be an @mention, or the 'last active user' shortcut. (^) Time limit is optional, but will default to 1 hour. If the time limit is specified, it must be followed by h (hours) or m (minutes)",
    usage: "<target user> [time limit <time limit measure>]",
    hidden: false,
    admin_only: true,
    dm: 0,
    fn: (m, args) => {
        if(!args[0]) {
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
    usage: "<target user>",
    hidden: false,
    admin_only: true,
    dm: 0,
    fn: (m, args) => {
        if(!args[0]) {
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
    fn: (m, args) => {
        TOOLS.confirmationFinder({ member_id: m.author.id, channel_id: m.channel.id }, (index) => {
            if (index > -1) {
                log('emitting', 'trace');
                memory.bot.cdb[index].emitter.emit('confirm');
            } else {
                m.channel.send('Nothing to confirm.');
            }
        });
    }
}));

CMD.register(new Command({
    trigger: 'cancel',
    fn: (m, args) => {
        TOOLS.confirmationFinder({ member_id: m.author.id, channel_id: m.channel.id }, (index) => {
            if (index > -1) {
                log('emitting', 'trace');
                memory.bot.cdb[index].emitter.emit('cancel');
            } else {
                m.channel.send('Nothing to cancel.');
            }
        });
    }
}));

CMD.register(new Command({
    trigger: 'cape',
    short_desc: "Donator Cape Viewer",
    long_desc: "Displays donator capes for a specified user. Usernames are not case-sensitive. If someone has a verified cape, you can use their @mention in place of their Minecraft username.",
    usage: "<minecraft username OR @mention>",
    hidden: false,
    fn: (m, args) => {
        if (!args[0]) {
            TOOLS.errorHandler({ err: 'Please specify the Minecraft username or @mention of the cape owner.', m: m });
        } else {
            function getOFcape(result) {
                let username = result.name;
                request({ url: 'https://optifine.net/capes/' + username + '.png', encoding: null }, (err, res, data) => {
                    if (err || !res || !data || [200, 404].indexOf(res.statusCode) === -1) {
                        TOOLS.errorHandler({ err: err || new Error('Failed to get a response from the OptiFine API'), m: m });
                    } else
                        if (res.statusCode === 404) {
                            TOOLS.errorHandler({ err: 'That user does not have an OptiFine cape', m: m });
                        } else {
                            jimp.read(data, (err_j, image) => {
                                if (err_j) TOOLS.errorHandler({ err: err, m: m });
                                else {
                                    let full = false;
                                    if ((args[1] && args[1].toLowerCase() === 'full') || (image.bitmap.width < 46)) {
                                        full = true;
                                        image.resize(256, jimp.AUTO, jimp.RESIZE_NEAREST_NEIGHBOR);
                                        finalize(image);
                                    } else {
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

                                                memory.db.cape.find({ mcid: result.id }, (dberr, dbdocs) => {
                                                    if (dberr) TOOLS.errorHandler({ err: dberr, m: m });
                                                    else {
                                                        if (dbdocs.length !== 0) {
                                                            embed.setDescription('<:okay:546570334233690132> Cape owned by <@' + dbdocs[0].userid + '>');
                                                        }

                                                        if (full) {
                                                            embed.setAuthor('Donator Cape (Full Texture)', 'attachment://thumbnail.png');
                                                        } else {
                                                            embed.setAuthor('Donator Cape', 'attachment://thumbnail.png');
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

            TOOLS.getTargetUser(m, args[0], (userid) => {
                if (userid) {
                    memory.db.cape.find({ userid: userid }, (err, docs) => {
                        if (err) {
                            TOOLS.errorHandler({ err: err, m: m });
                        } else
                            if (docs.length === 0) {
                                TOOLS.errorHandler({ err: 'That user does not have a verified donator cape.', m: m });
                            } else {
                                request({ url: 'https://api.mojang.com/user/profiles/' + docs[0].mcid + '/names', encoding: null }, (err, res, data) => {
                                    if (err || !res || !data || [200, 204].indexOf(res.statusCode) === -1) {
                                        TOOLS.errorHandler({ err: err || new Error('Failed to get a response from the Mojang API'), m: m });
                                    } else
                                        if (res.statusCode === 204) {
                                            TOOLS.errorHandler({ err: new Error('Unable to get Minecraft UUID of that user.'), m: m });
                                        } else {
                                            let dp = JSON.parse(data);
                                            let dataNormalized = {
                                                name: dp[dp.length - 1]["name"],
                                                id: docs[0].mcid
                                            }
                                            getOFcape(dataNormalized);
                                        }
                                });
                            }
                    });
                } else
                    if (args[0].match(/\W+/) !== null) {
                        TOOLS.errorHandler({ err: 'Usernames can only contain upper/lowercase letters, numbers, and underscores (_)', m: m });
                    } else
                        if (args[0].length > 16) {
                            TOOLS.errorHandler({ err: 'Usernames cannot exceed 16 characters in length.', m: m });
                        } else {
                            request({ url: 'https://api.mojang.com/users/profiles/minecraft/' + args[0], encoding: null }, (err, res, data) => {
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
    }
}));

CMD.register(new Command({
    trigger: 'role',
    short_desc: "Toggle roles for users.",
    long_desc: "Gives or removes roles for the specified user. OptiBot uses string similarity for roles, so typos and capitalization don't matter.",
    usage: "<user> <role>",
    hidden: false,
    fn: (m, args) => {
        if(!args[0]) {
            TOOLS.errorHandler({err: "Please specify the user to give a role to.", m:m});
        } else {
            TOOLS.getTargetUser(m, args[0], (userid) => {
                if(!userid) TOOLS.errorHandler({err: "You must specify a valid user @mention, ID, or last user shortcut (^)", m:m});
                else if (!args[1]) TOOLS.errorHandler({err: "You must specify a role to give to that user.", m:m});
                else {
                    let role_types = {
                        'Shader Developer': cfg.roles.shader_dev,
                        'Texture Artist': cfg.roles.texture_artist,
                        'Mod Developer': cfg.roles.mod_dev
                    };

                    let role_match = cstr.findBestMatch(m.content.substring(cfg.basic.trigger.length+5+args[0].length+1), Object.keys(role_types));
                    let selected_role = role_types[role_match.bestMatch.target];

                    log(role_match.bestMatch.rating)

                    if(role_match.bestMatch.rating < 0.2) {
                        TOOLS.errorHandler({err: "What kind of role is that?", m:m});
                        return;
                    }

                    bot.guilds.get(cfg.basic.of_server).fetchMember(userid).then(member => {
                        if(member.id === m.author.id) {
                            TOOLS.errorHandler({err: "Nice try.", m:m});
                        } else
                        if(cfg.superusers.indexOf(member.user.id) > -1 || member.permissions.has("KICK_MEMBERS", true)) {
                            TOOLS.errorHandler({err: "You're not strong enough to manage that user.", m:m});
                        } else {
                            if(!member.roles.has(selected_role)) {
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
    trigger: 'lmgtfy',
    short_desc: 'Let me Google that for you.',
    usage: '<query>',
    hidden: false,
    fn: (m, args) => {
        if(!args[0]) {
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
    short_desc: 'Delete the last [x amount] messages.',
    long_desc: "Delete the last [x amount] messages. Useful for mass spam. \n\nWhen using this command, OptiBot will ask you to CONFIRM your request before proceeding. The bot will retain the position the original command was used at, meaning that messages that happen to be posted while you're confirming the request will be ignored.",
    usage: '<# of messages>',
    admin_only: true,
    dm: 0,
    hidden: false,
    fn: (m, args, member) => {
        if(!args[0]) {
            TOOLS.errorHandler({err: "You must specify how many messages to delete.", m:m});
        } else
        if(isNaN(args[0])) {
            TOOLS.errorHandler({err: "You must specify a valid number.", m:m});
        } else
        if(parseInt(args[0]) > 32 && !(member.permissions.has("ADMINISTRATOR", true))) {
            TOOLS.errorHandler({err: "You can only delete up to 32 messages at once.", m:m});
        } else
        if(parseInt(args[0]) === 1) {
            TOOLS.errorHandler({err: "This is an incredibly inefficient way to delete messages.", m:m});
        } else
        if(parseInt(args[0]) < 1) {
            TOOLS.errorHandler({err: "How and why?", m:m});
        } else {
            m.channel.send(`remove ${parseInt(args[0])} messages?`).then(msg => {
                TOOLS.typerHandler(m.channel, false);
                TOOLS.confirmationHandler(m, (result) => {
                    if (result === 1) {
                        m.channel.fetchMessages({before: m.id, limit: parseInt(args[0])}).then(index_messages=> {
                            m.channel.bulkDelete(index_messages).then(deleted_messages => {
                                m.channel.send(`successfully deleted ${deleted_messages.size} messages`).then(msg2 => {
                                    TOOLS.messageFinalize(m.author.id, msg2);
                                })
                            }).catch(err => {
                                TOOLS.errorHandler({err: err, m:m});    
                            })
                        }).catch(err => {
                            TOOLS.errorHandler({err: err, m:m});
                        })
                    } else
                    if (result === 0) {
                        m.channel.send('action cancelled').then(msg2 => {
                            TOOLS.messageFinalize(m.author.id, msg2);
                        });
                    } else
                    if (result === 2) {
                        TOOLS.errorHandler({err: "Request timed out.", m:m});
                    }
                });
            });
        }
    }
}));

CMD.register(new Command({
    trigger: 'docs',
    short_desc: 'Link to OptiFine documentation.',
    long_desc: "Search for files in the current version of OptiFine documentation. If no search query is provided, OptiBot will just give you a link to the documentation on GitHub",
    usage: '!docs [query]',
    hidden: false,
    fn: (m, args) => {
        let embed = new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(memory.bot.icons.get("opti_docs.png"), "thumbnail.png"))
            .setAuthor("Official OptiFine Documentation", 'attachment://thumbnail.png')

        if(!args[0]) {
            embed.addField("Main Directory", "https://github.com/sp614x/optifine/tree/master/OptiFineDoc/doc");

            m.channel.send({embed: embed}).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
        } else {
            let files = [];

            for(let i = 0; i < memory.bot.docs.length; i++) {
                files.push(memory.bot.docs[i].name);

                if(i+1 === memory.bot.docs.length) {
                    let search = [
                        cstr.findBestMatch(m.content.substring(cfg.basic.trigger.length+5).toLowerCase(), files),
                        cstr.findBestMatch(m.content.substring(cfg.basic.trigger.length+5).toUpperCase(), files),
                        cstr.findBestMatch(m.content.substring(cfg.basic.trigger.length+5), files)
                    ].sort((a, b) => a.bestMatch.rating > b.bestMatch.rating);

                    let match = search[2];

                    if(match.bestMatch.rating < 0.1) {
                        embed.setDescription("Could not find a file matching that query.")

                        m.channel.send({embed: embed}).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                    } else {
                        if(match.bestMatch.target.endsWith('.png')) {
                            embed.setImage(memory.bot.docs[match.bestMatchIndex].download_url);
                        }
    
                        embed.addField(match.bestMatch.target, memory.bot.docs[match.bestMatchIndex].html_url)
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
    hidden: true,
    fn: (m, args) => {
        if(!args[0]) {
            TOOLS.errorHandler({err: "You must specify a channel ID to speak in.", m:m});
        } else
        if(!args[1] && m.attachments.size === 0) {
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
    short_desc: 'Gives a medal to the specified user. This is an alternative to adding a medal emoji to someones message.',
    usage: '<user>',
    hidden: true,
    fn: (m, args) => {
        if(!args[0]) {
            TOOLS.errorHandler({err: "You must specify a user to give an medal to.", m:m});
        } else {
            TOOLS.getTargetUser(m, args[0], (userid, name) => {
                if(!userid) {
                    TOOLS.errorHandler({err: "You must specify a valid user.", m:m});
                } else {
                    if(userid === bot.user.id) {
                        TOOLS.errorHandler({err: "I'm not allowed to have medals. :(", m:m});
                    } else
                    if(userid === m.author.id) {
                        let embed = new discord.RichEmbed()
                            .attachFiles([new discord.Attachment(memory.bot.images.get('medal_self.png'), "image.png")])
                            .setColor(cfg.vs.embed.error)
                            .setImage('attachment://image.png');

                        m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                    } else {
                        log(`${name} was awarded a medal by ${m.author.username}#${m.author.discriminator}`);
            
                        let embed = new discord.RichEmbed()
                            .setColor(cfg.vs.embed.default)
                            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_medal.png'), "icon.png"))
                            .setAuthor('Medal awarded', 'attachment://icon.png')
                            .setDescription(`<@${userid}> was awarded a medal by ${m.author}!`)
    
                        m.channel.send({ embed: embed }).then(msg => {
                            TOOLS.messageFinalize(m.author.id, msg);
    
                            memory.db.mdl.update({ user_id: userid }, { $inc: { count: 1 } }, { upsert: true }, (err, updated) => {
                                if (err) TOOLS.errorHandler({ err: err, m: m });
                                log('member medals update: ' + updated, 'debug');
                            });
                        });
                    }
                }
            });
        }
    }
}));

////////////////////////////////////////////////////////////////////////////////
// Global Functions
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

            let timeout = bot.setTimeout(timedout, 30000);

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
        ACT_game = 'assets load';
    } else
    if (type === 1) {
        // default state
        if (memory.bot.debug) {
            ACT_status = 'dnd';
            ACT_type = 'PLAYING';
            ACT_game = 'Code Mode';
        } else 
        if(memory.bot.locked) {
            ACT_status = 'dnd';
            ACT_type = 'PLAYING';
            ACT_game = 'Mod Mode';
        } else {
            ACT_status = 'online';
            ACT_type = 'WATCHING';
            ACT_game = '!help';
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

    if (data.err) {
        if (data.err.stack) log(data.err.stack, 'error');
        if (typeof data.err === "string") {
            // display error only, minified
            embed.setAuthor(data.err, 'attachment://icon.png');
        } else {
            // display contact message + error
            embed.setFooter(data.err)
                .setAuthor('Error', 'attachment://icon.png')
                .setDescription('Something went wrong while doing that. Oops. \n\nIf this continues, try contacting <@181214529340833792>, and give him this error message:');
        }
    } else {
        log(new Error('An error occured during operation and was caught, but no error object was passed to the handler.').stack, 'fatal');
        embed.setDescription('Something went wrong while doing that. If this continues, try contacting <@181214529340833792>.')
            .setAuthor('Error', 'attachment://icon.png');
    }

    if (data.m) {
        if(data.temp) {
            embed.setFooter('This message will self-destruct in 10 seconds.')
            data.m.channel.send({ embed: embed }).then(msg => {
                TOOLS.typerHandler(data.m.channel, false);
                bot.setTimeout(() => {
                    if(!msg.deleted) {
                        msg.delete();
                    }
                }, 10000);
            });
        } else {
            data.m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(data.m.author.id, msg) });
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
            memory.db.msg.insert(cacheData, (err, docs) => {
                if (err) {
                    log(err, 'error');
                } else {
                    memory.db.msg.find({}).sort({ time: 1 }).exec((err, docs) => {
                        if (err) {
                            log(err, 'error');
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
                                if (err) log(err, 'error');
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
                            log('Message (id# ' + data.cacheData.message + ') deleted at user request.', 'warn');

                            memory.db.msg.remove(data.cacheData, (err) => {
                                if (err) {
                                    log(err, 'error');
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
                                    log(err, 'error');
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
        TOOLS.getTargetUser(m, args[0], (userid) => {
            if (userid) muteS2(userid);
            else {
                TOOLS.errorHandler({ m: m, err: `You must specify a valid user @mention, user ID, or the 'last active user' shortcut. (^)` });
            }
        });

        function muteS2(S1userid) {
            if (S1userid === m.author.id || S1userid === bot.user.id) {
                TOOLS.errorHandler({ m: m, err: `Nice try.` });
                return;
            }
            bot.guilds.get(cfg.basic.of_server).fetchMember(S1userid).then(member => {
                let measureText = 2;
                let numSplit;
                let num;
                let input_measure;

                if(action && args[1]) {
                    numSplit = args[1].split(/\D/, 1)
                    num = Math.round(parseInt(numSplit[0]));
                    input_measure = args[1].substring(numSplit[0].length).replace(/\./g, "");
                }

                if (member.permissions.has("KICK_MEMBERS", true)) TOOLS.errorHandler({ m: m, err: `That user is too powerful to be ${(action) ? "muted." : "muted in the first place."}` });
                else if (!action && !member.roles.has(cfg.roles.muted)) TOOLS.errorHandler({ m: m, err: "That user is not muted." });
                else if (action) {
                    if (args[1]) {
                        let now = new Date();
                        let db_data = {
                            member_id: member.user.id,
                            executor: m.author.username + '#' + m.author.discriminator
                        };

                        if (isNaN(args[1]) && isNaN(num)) {
                            TOOLS.errorHandler({ m: m, err: `Time limit must be a number. (0 for no limit)` });
                        } else
                        if (num < 0 || num > 99) {
                            TOOLS.errorHandler({ m: m, err: `Be reasonable.` });
                        } else
                        if (num === 0) {
                            db_data.time = false;
                            finalize(db_data);
                        } else
                        if (!args[2] && input_measure.length === 0) {
                            db_data.time = new Date(now.getTime() + (3600000 * num)).getTime();
                            finalize(db_data);
                        } else {
                            let measure;
                            let measure_string_sim = cstr.findBestMatch(((input_measure.length > 0) ? input_measure : args[2]), ['minutes', 'hours', 'days']).bestMatch.target;
                            if(input_measure.length = 1) {
                                if(input_measure = 'm') {
                                    measure = 'minutes';
                                } else 
                                if(input_measure = 'h') {
                                    measure = 'hours';
                                } else 
                                if(input_measure = 'd') {
                                    measure = 'days';
                                } else {
                                    measure = measure_string_sim;
                                }
                            } else {
                                measure = measure_string_sim;
                            }

                            if (measure === 'minutes') {
                                if (Math.ceil(parseInt(args[1])) < 10) {
                                    TOOLS.errorHandler({ m: m, err: `Minimum time limit is 10 minutes.` });
                                } else {
                                    db_data.time = new Date(now.getTime() + (60000 * num)).getTime();
                                    measureText = 1;
                                    finalize(db_data);
                                }
                            } else
                            if (measure === 'hours') {
                                db_data.time = new Date(now.getTime() + (3600000 * num)).getTime();
                                finalize(db_data);
                            } else
                            if (measure === 'days') {
                                db_data.time = new Date(now.getTime() + (86400000 * num)).getTime();
                                measureText = 3;
                                finalize(db_data);
                            }
                        }
                    } else {
                        // no time limit specified, default to 1 hour.
                        let now = new Date();
                        let db_data = {
                            member_id: member.user.id,
                            executor: m.author.username + '#' + m.author.discriminator,
                            time: now.setHours(now.getHours() + 1).getTime()
                        };

                        num = 1;
                        finalize(db_data);
                    }
                } else finalize();

                function finalize(db_data) {
                    let mutedUser = member.user.username + '#' + member.user.discriminator;
                    let muter = m.author.username + '#' + m.author.discriminator;
                    let embed = new discord.RichEmbed()
                        .setColor(cfg.vs.embed.okay)
                        .attachFile(new discord.Attachment(memory.bot.icons.get('opti_okay.png'), "icon.png"));

                    if (action) {
                        if (member.roles.has(cfg.roles.muted)) {
                            if (!args[0]) {
                                TOOLS.errorHandler({ m: m, err: `That user has already been muted. If you'd like to change or add a time limit, please specify a number of hours.` });
                                return;
                            }
                            memory.db.muted.find({ member_id: member.user.id }, (err, docs) => {
                                if (err) TOOLS.errorHandler({ m: m, err: err });
                                else if (docs.length === 0) {
                                    memory.db.muted.insert(db_data, (err) => {
                                        if (err) TOOLS.errorHandler({ m: m, err: err });
                                        else addLimitFinalize();
                                    });
                                } else {
                                    memory.db.muted.update({ member_id: member.user.id }, db_data, {}, (err) => {
                                        if (err) TOOLS.errorHandler({ m: m, err: err });
                                        else addLimitFinalize();
                                    });
                                }

                                function addLimitFinalize() {
                                    if (db_data.time === false) {
                                        embed.setAuthor(`Updated. ${mutedUser} will now be muted until hell freezes over.`, 'attachment://icon.png');
                                        log(`${db_data.executor} updated mute time limit for user ${mutedUser}. User will remain muted forever.`, 'warn')
                                    } else
                                    if (measureText === 1) {
                                        embed.setAuthor(`Updated. ${mutedUser} will now be muted for ${num} minute${(num === 1) ? "." : "s."}`, 'attachment://icon.png');
                                        log(`${db_data.executor} updated mute time limit for user ${mutedUser}. User will now be muted for ${num} minute${(num === 1) ? "." : "s."}`, 'warn')
                                    } else
                                    if (measureText === 2) {
                                        embed.setAuthor(`Updated. ${mutedUser} will now be muted for ${num} hour${(num === 1) ? "." : "s."}`, 'attachment://icon.png');
                                        log(`${db_data.executor} updated mute time limit for user ${mutedUser}. User will now be muted for ${num} hour${(num === 1) ? "." : "s."}`, 'warn')
                                    } else {
                                        embed.setAuthor(`Updated. ${mutedUser} will now be muted for ${num} day${(num === 1) ? "." : "s."}`, 'attachment://icon.png');
                                        log(`${db_data.executor} updated mute time limit for user ${mutedUser}. User will now be muted for ${num} day${(num === 1) ? "." : "s."}`, 'warn')
                                    }

                                    m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                                }
                            });
                        } else {
                            member.addRole(cfg.roles.muted, 'User muted by ' + muter).then(() => {
                                if (db_data.time === false) {
                                    embed.setAuthor(`Muted. ${mutedUser} will be muted until hell freezes over.`, 'attachment://icon.png');
                                    log(`User ${mutedUser} was muted by ${db_data.executor} until hell freezes over`, 'warn')
                                } else
                                if (measureText === 1) {
                                    embed.setAuthor(`Muted ${mutedUser} for ${num} minute${(num === 1) ? "." : "s."}`, 'attachment://icon.png');
                                    log(`User ${mutedUser} was muted by ${db_data.executor} for ${num} minute${(num === 1) ? "." : "s."}`, 'warn')
                                } else
                                if (measureText === 2) {
                                    embed.setAuthor(`Muted ${mutedUser} for ${num} hour${(num === 1) ? "." : "s."}`, 'attachment://icon.png');
                                    log(`User ${mutedUser} was muted by ${db_data.executor} for ${num} hour${(num === 1) ? "." : "s."}`, 'warn')
                                } else {
                                    embed.setAuthor(`Muted ${mutedUser} for ${num} day${(num === 1) ? "." : "s."}`, 'attachment://icon.png');
                                    log(`User ${mutedUser} was muted by ${db_data.executor} for ${num} day${(num === 1) ? "." : "s."}`, 'warn')
                                }

                                memory.db.muted.insert(db_data);
                                m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                            }).catch(err => TOOLS.errorHandler({ m: m, err: err }));
                        }
                    } else {
                        member.removeRole(cfg.roles.muted, 'User unmuted by ' + muter).then(() => {
                            memory.db.muted.remove({ member_id: member.user.id });

                            embed.setAuthor(`${mutedUser} has been unmuted.`, 'attachment://icon.png');

                            log(`User ${mutedUser} was unmuted by ${m.author.username + '#' + m.author.discriminator}`, 'warn')

                            m.channel.send({ embed: embed }).then(msg => { TOOLS.messageFinalize(m.author.id, msg) });
                        }).catch(err => TOOLS.errorHandler({ m: m, err: err }));
                    }
                }
            }).catch(err => TOOLS.errorHandler({ m: m, err: err }));
        }
    } else {
        memory.db.muted.find({}, (err, res) => {
            if (err) TOOLS.errorHandler({ err: err });
            else if (res.length === 0) {
                log('No muted users in database.', 'debug');
            } else {
                let unmuteAgenda = [];
                let retryCount = 0;
                let i = 0;

                log('checking '+res.length+' user(s) for mute time limit', 'debug');
                for(let i_s=0;i_s<res.length;i_s++) {
                    log(`checking ${i_s+1}/${res.length}`, 'trace')
                    if (typeof res[i_s].time === 'number' && (new Date().getTime() > res[i_s].time)) {
                        unmuteAgenda.push(res[i_s].member_id);
                    }

                    if(i_s+1 === res.length) {
                        log('loop finished', 'trace')
                        unmuteLooper();
                    }
                }
                
                function unmuteLooper() {
                    if(unmuteAgenda.length === 0) {
                        log('No users to unmute.', 'debug')
                        return;
                    }
                    if(unmuteAgenda[i] === undefined) return;
                    if(retryCount === 2) {
                        log(`Failed to unmute user (ID#${unmuteAgenda[i]})`, 'fatal');
                        i++;
                        unmuteLooper();
                        return;
                    }

                    log('unmuteAgenda[i] === '+unmuteAgenda[i], 'trace');
                    log('retryCount === '+retryCount, 'trace')

                    if(i === 0 && retryCount === 0) log('Mute time limit expired for '+unmuteAgenda.length+' member(s).', 'warn');

                    bot.guilds.get(cfg.basic.of_server).fetchMember(unmuteAgenda[i]).then(member => {
                        if (member.roles.has(cfg.roles.muted)) {
                            member.removeRole(cfg.roles.muted, "Mute time limit expired.").then(() => {
                                removeFromDB();
                            }).catch(err => {
                                TOOLS.errorHandler({ err: err });
                                retryCount++;
                                log('Retrying unmute...', 'warn');
                                unmuteLooper();
                            });
                        } else {
                            removeFromDB();
                        }
                    }).catch(err => {
                        if(err.message.indexOf('Invalid or uncached id provided') > -1) {
                            log(`Muted user ${unmuteAgenda[i]} appears to no longer be in the server. Removing from database...`);
                            removeFromDB();
                        } else {
                            TOOLS.errorHandler({ err: err });
                            retryCount++;
                            log('Retrying unmute...', 'warn');
                            unmuteLooper();
                        }
                    });

                    function removeFromDB() {
                        memory.db.muted.remove({ member_id: unmuteAgenda[i] }, (err) => {
                            if (err) {
                                TOOLS.errorHandler({ err: err });
                                retryCount++;
                                log('Retrying unmute...', 'warn');
                                unmuteLooper();
                            } else {
                                retryCount = 0;
                                i++
                                unmuteLooper();
                            }
                        });
                    }
                }
            }
        });
    }
}

TOOLS.getTargetUser = (m, target, cb) => {
    if (target.match(/^(<@).*(>)$/) !== null && m.mentions.members.size > 0) {
        cb(m.mentions.members.first(1)[0].id, `${m.mentions.members.first(1)[0].user.username}#${m.mentions.members.first(1)[0].user.discriminator}`);
    } else
    if (target === "^") {
        m.channel.fetchMessages({ limit: 25 }).then(msgs => {
            let itr = msgs.values();

            (function search() {
                let thisID = itr.next();
                if (thisID.done) {
                    TOOLS.errorHandler({ m: m, err: `Could not find a user.` });
                } else
                    if (thisID.value.author.id !== m.author.id && thisID.value.author.id !== bot.user.id) {
                        cb(thisID.value.author.id, `${thisID.value.author.username}#${thisID.value.author.discriminator}`);
                    } else search();
            })();
        }).catch(err => TOOLS.errorHandler({ m: m, err: err }));
    } else
    if (!isNaN(target)) {
        bot.guilds.get(cfg.basic.of_server).fetchMember(target).then(mem => {
            cb(mem.user.id, `${mem.user.username}#${mem.user.discriminator}`);
        }).catch(err => {
            TOOLS.errorHandler({ m: m, err: err });
        });
    } else {
        cb();
    }
}

TOOLS.ghRefs = (m, issues, isAdmin) => {
    log('GHREFS', 'trace');
    log(issues, 'trace');
    // limit to 4 for normal users, limit to 8 for donators, limit to 12 for moderators
    let issueLinks = [];
    //let brk = false;
    let limited = false;
    let i = 0;

    (function search() {
        log('parsing ' + issues[i], 'trace');

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
                    let result = `[**#${issues[i]}** - ${title}](https://github.com/sp614x/optifine/issues/${issues[i]})`;
                    if (issueLinks.indexOf(result) === -1) {
                        issueLinks.push(result);
                    }
                }

                let last = i + 1 === issues.length;

                // if we have 4 links, and the user is NOT a donator, and the user is NOT an admin
                if (issueLinks.length === 4 && !m.member.roles.has(cfg.roles.donator) && !isAdmin) {
                    if (!last) limited = true;
                    finalize();
                } else
                // if we have 8 links, and the user is NOT an admin
                if (issueLinks.length === 8 && !isAdmin) {
                    if (!last) limited = true;
                    finalize();
                } else
                // if we have 12 links
                if (issueLinks.length === 12) {
                    if (!last) limited = true;
                    finalize();
                } else
                if (last) {
                    finalize();
                } else {
                    bot.setTimeout(() => {
                        i++;
                        search();
                    }, 500);
                }
            }
        });
    })();

    function finalize() {
        log('finalizing', 'trace');
        let embed = new discord.RichEmbed()
            .attachFile(new discord.Attachment(memory.bot.icons.get('opti_gh.png'), "gh.png"))
            .setColor(cfg.vs.embed.default)
            .setAuthor('OptiFine Issue Tracker', 'attachment://gh.png')

        if (limited && issueLinks.length !== 0) {
            embed.setFooter('Some issues were omitted to prevent spam.');
        }

        let desc = '';
        if (issueLinks.length === 0) {
            desc = 'Could not find any issues on GitHub.'
            embed.setFooter('This message will self-destruct in 10 seconds.');
        }
        for (i in issueLinks) {
            desc += issueLinks[i];

            if (i + 1 !== issueLinks.length) {
                desc += '\n\n';
            }
        }

        embed.setDescription(desc)

        m.channel.send({ embed: embed }).then(msg => { 
            if(issueLinks.length === 0) {
                TOOLS.typerHandler(msg.channel, false);
                bot.setTimeout(() => {
                    if(!msg.deleted) msg.delete();
                }, 10000);
            } else {
                TOOLS.messageFinalize(m.author.id, msg)
            }
        });
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
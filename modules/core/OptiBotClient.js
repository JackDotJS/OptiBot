const fs = require(`fs`);
const util = require(`util`);

const djs = require(`discord.js`);
const path = require(`path`);
const database = require('nedb');
const Pastebin = require(`pastebin-js`);

const Command = require(`./OptiBotCommand.js`);
const OBUtil = require(`./OptiBotUtil.js`);
const Memory = require(`./OptiBotMemory.js`);
const LogEntry = require(`./OptiBotLogEntry.js`);

module.exports = class OptiBot extends djs.Client {
    constructor (options, mode, log) {
        super(options);

        const keys = require(path.resolve('./cfg/keys.json'));
        const cfg = require(path.resolve('./cfg/config.json'));
        const version = require(path.resolve('./package.json')).version;
        const prefix = (mode === 0) ? cfg.prefixes.debug[0] : cfg.prefixes.default[0]; // first in array is always default, but all others will be accepted during real usage.
        const splashtext = require(path.resolve('./cfg/splash.json'));

        const pb = new Pastebin({
            'api_dev_key': keys.pastebin
        });

        const storage = {
            msg: new database({ filename: './data/messages.db', autoload: true }),
            motd: new database({ filename: './data/motd.db', autoload: true }),
            profiles: new database({ filename: './data/profiles.db', autoload: true }),
            stats: new database({ filename: './data/statistics.db', autoload: true }),
            smr: new database({ filename: './data/smr.db', autoload: true }),
            bl: new database({ filename: './data/blacklist.db', autoload: true }),
            faq: new database({ filename: './data/faq.db', autoload: true }),
            pol: new database({ filename: './data/policies.db', autoload: true })
        }
        const commands = {
            index: [],
            register: (cmd) => {
                return new Promise((resolve, reject) => {
                    if(cmd instanceof Command || cmd instanceof Command2) {
                        commands.index.push(cmd);
                        resolve(cmd);
                    } else {
                        reject(new Error('Attempted to register non-command object as a command.'));
                    }
                });
            },
            find: (query) => {
                return new Promise((resolve, reject) => {
                    let i1 = 0;
                    (function checkName() {
                        if (query.toLowerCase() === commands.index[i1].metadata.name) {
                            resolve(commands.index[i1]);
                        } else 
                        if (commands.index[i1].metadata.aliases.length > 0) {
                            let i2 = 0;
                            (function checkAliases() {
                                if(query.toLowerCase() === commands.index[i1].metadata.aliases[i2]) {
                                    resolve(commands.index[i1]);
                                } else 
                                if(i2+1 === commands.index[i1].metadata.aliases.length) {
                                    if (i1+1 === commands.index.length) {
                                        resolve();
                                    } else {
                                        i1++;
                                        checkName();
                                    }
                                } else {
                                    i2++;
                                    checkAliases();
                                }
                            })();
                        } else
                        if (i1+1 === commands.index.length) {
                            resolve();
                        } else {
                            i1++;
                            checkName();
                        }
                    })();
                });
            }
        };
        const images = {
            index: [],
            default: fs.readFileSync(path.resolve('./assets/img/default.png')),
            find: (query) => {
                for(let i in images.index) {
                    if(images.index[i].name === query) {
                        return images.index[i].data;
                    } else
                    if(parseInt(i)+1 >= images.index.length) {
                        return images.default;
                    }
                }
            }
        };

        // todo: maybe replace this with just bot.emojis.cache, also move to OBUtil
        const icons = {
            index: [],
            default: null,
            find: (query) => {
                for(let i in icons.index) {
                    if(icons.index[i].name === query) {
                        return icons.index[i].data;
                    } else
                    if(parseInt(i)+1 >= icons.index.length) {
                        return icons.default;
                    }
                }
            }
        };
        const util = {}

        let exit = new Date()
        exit.setUTCDate(exit.getUTCDate()+1)
        exit.setUTCHours(8, 0, 0, 0);

        this.db = storage;
        this.pb = pb; // todo: probably gonna remove this at some point
        this.exitTime = exit;
        this.cfg = cfg;
        this.prefix = prefix;
        this.prefixes = (mode === 0) ? cfg.prefixes.debug : cfg.prefixes.default;
        this.keys = keys;
        this.version = version;
        this.commands = commands;
        this.images = images;
        this.icons = icons;
        this.mode = 0;
        this.splash = splashtext;
        this.log = log;
        this.util = util;
        this.getEmoji = (query) => {
            // comment 1: hopefully only a temporary solution
            // comment 2: i forgot if i already fixed this, will check with a lil global search later
            let result;

            if(Number.isInteger(parseInt(query))) {
                result = this.emojis.cache.get(query)
            } else {
                result = this.emojis.cache.find(emoji => emoji.name.toLowerCase() === query.toLowerCase() && (emoji.guild.id === this.cfg.guilds.optibot || this.cfg.guilds.emoji.includes(emoji.guild.id)))
            }

            if(result) return result;
            return this.emojis.cache.find(emoji => emoji.name.toLowerCase() === 'ICO_default'.toLowerCase() && (emoji.guild.id === this.cfg.guilds.optibot || this.cfg.guilds.emoji.includes(emoji.guild.id)))
        }

        Object.defineProperty(this, 'mainGuild', {
            get: () => {
                return this.guilds.cache.get(this.cfg.guilds.optifine);
            }
        });

        Memory.bot.locked = (mode === 0 || mode === 1);
        Memory.core.client = this;

        this.setTimeout(() => {
            Memory.bot.init = true;
            this.setBotStatus(-1)

            let logEntry = new LogEntry({time: new Date()})
            .setColor(bot.cfg.embed.default)
            .setIcon(OBUtil.getEmoji('ICO_door').url)
            .setTitle(`OptiBot is now restarting...`, `OptiBot Restart Report`)
            .submit().then(() => {
                let maxPauseTime = 30000;
                let minPauseTime = 5000;
                let pauseTime = minPauseTime;

                let li = new Date().getTime() - Memory.li;

                if(li > maxPauseTime) pauseTime = minPauseTime;
                if(li < minPauseTime) pauseTime = maxPauseTime;
                if(li < maxPauseTime && li > minPauseTime) pauseTime = li/(1000);

                log(`Restarting in ${(pauseTime/(1000)).toFixed(1)} seconds...`, 'warn');

                this.setTimeout(() => {
                    this.exit(18)
                }, pauseTime);
            });
        }, exit.getTime() - new Date().getTime())
    }

    exit(code = 0) {

        /**
         * 0 = standard shutdown
         * 1 = error/crash
         * 16 = requested restart
         * 17 = requested update
         * 18 = scheduled restart
         */

        this.destroy()
        OBUtil.setWindowTitle('Shutting down...')

        setTimeout(() => {
            process.exit(code);
        }, 500);
    }

    loadAssets(type = 0) {

        /**
         * type
         * 
         * 0 = everything
         * 1 = commands, utilities, and images
         * 2 = only images
         */

        const bot = this;
        const log = this.log;

        let timeStart = new Date().getTime();
        return new Promise((success, failure) => {
            log('Loading assets...', 'info');

            let stages = [];
            let assetsAsync = [];
            let totals = 0;
            let errors = 0;
            let done = 0;

            if(type === 0 || type === 1 || type === 2) {
                stages.push({
                    name: 'Icon Loader',
                    load: new Promise((resolve, reject) => {
                        bot.icons.index = [];
    
                        let ig = 0;
                        (function getEmoji() {
                            let emoji = [...bot.guilds.cache.get(bot.cfg.guilds.emoji[ig]).emojis.cache.values()];
    
                            if (emoji.length === 0) {
                                if(ig+1 === bot.cfg.guilds.emoji.length) {
                                    resolve();
                                } else {
                                    ig++;
                                    getEmoji();
                                }
                            } else {
                                for(let i in emoji) {
                                    if(emoji[i].name.startsWith('ICO_')) {
                                        if(emoji[i].name === 'ICO_default') {
                                            bot.icons.default = emoji[i].url;
                                        } else {
                                            bot.icons.index.push({
                                                name: emoji[i].name,
                                                data: emoji[i].url
                                            });
                                        }
                                    }
        
                                    if(parseInt(i)+1 === emoji.length) {
                                        if(parseInt(ig)+1 === bot.cfg.guilds.emoji.length) {
                                            resolve();
                                        } else {
                                            ig++;
                                            getEmoji();
                                        }
                                    }
                                }
                            }
                        })();
                    })
                });

                assetsAsync.push({
                    name: 'Image Loader',
                    load: new Promise((resolve, reject) => {
                        bot.images.index = [];
                        let images = fs.readdirSync(path.resolve(`./assets/img`));
    
                        for(let img of images) {
                            if(img.match(/\./) !== null) {
                                bot.images.index.push({
                                    name: img,
                                    data: fs.readFileSync(path.resolve(`./assets/img/${img}`))
                                });
                            }
                        }
                        resolve();
                    })
                });
            }

            if(type === 0 || type === 1) {
                let clrcache = false;

                if(bot.commands.index.length > 0) {
                    bot.commands.index = [];
                    clrcache = true;
                }

                stages.push({
                    name: 'Command Loader',
                    load: new Promise((resolve, reject) => {
                        let commands = fs.readdirSync(path.resolve(`./modules/cmd`));
                        let registered = [];
    
                        let i1 = 0;
                        (function loadCmd() {
                            let cmd = commands[i1];
                            if(i1+1 > commands.length) {
                                resolve();
                            } else 
                            if(cmd.endsWith('.js')) {
                                log(`processing: ${path.resolve(`./modules/cmd/${cmd}`)}`)

                                if(clrcache) {
                                    log(`cache delete: ${require.resolve(path.resolve(`./modules/cmd/${cmd}`))}`)
                                    delete require.cache[require.resolve(path.resolve(`./modules/cmd/${cmd}`))];
                                }
                
                                try {
                                    log('before load cmd')
                                    let newcmd = require(path.resolve(`./modules/cmd/${cmd}`));
                                    log('after load cmd')

                                    if((bot.mode === 1 || bot.mode === 2) && !newcmd.metadata.flags['LITE']) {
                                        log(`Unable to load command "${newcmd.metadata.name}" due to Lite mode.`, 'warn');
                                        i1++;
                                        loadCmd();
                                    }
    
                                    if(newcmd.metadata.aliases.length > 0) {
    
                                        // fucking ughhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh
                                        // hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh
                                        // hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh
    
                                        let i2 = 0;
                                        let i3 = 0;
                                        let i4 = 0;
                                        (function reglist() {
                                            let register = registered[i2];
                                            (function newAliases() {
                                                let alias = newcmd.metadata.aliases[i3];
    
                                                if(alias === register.cmd) {
                                                    log(new Error(`Failed to load command, conflicting names/aliases: "${alias}" (${newcmd.metadata.name}.js) === "${register.cmd}" (${register.cmd}.js)`).stack, 'error');
                                                    i1++;
                                                    loadCmd();
                                                } else 
                                                if(register.aliases.length === 0) {
                                                    if(i3+1 >= newcmd.metadata.aliases.length) {
                                                        i3 = 0;
                                                        if(i2+1 >= registered.length) {
                                                            finalRegister();
                                                        } else {
                                                            i2++;
                                                            reglist();
                                                        }
                                                    } else {
                                                        i3++;
                                                        newAliases();
                                                    }
                                                } else {
                                                    (function avsa() {
                                                        if (register.aliases[i4] === undefined) {
                                                            log(register.aliases);
                                                            log(i4);
                                                        }
                                                        if(alias === register.aliases[i4]) {
                                                            log(new Error(`Failed to load command, conflicting names/aliases: "${alias}" (${newcmd.metadata.name}.js) === "${register.aliases[i4]}" (${register.cmd}.js)`).stack, 'error');
                                                            i1++;
                                                            loadCmd();
                                                        }
    
                                                        if(i4+1 >= register.aliases.length) {
                                                            i4 = 0;
                                                            if(i3+1 >= newcmd.metadata.aliases.length) {
                                                                i3 = 0;
                                                                if(i2+1 >= registered.length) {
                                                                    finalRegister();
                                                                } else {
                                                                    i2++;
                                                                    reglist();
                                                                }
                                                            } else {
                                                                i3++;
                                                                newAliases();
                                                            }
                                                        } else {
                                                            i4++;
                                                            avsa();
                                                        }
                                                    })();
                                                }
                                            })();
                                        })();
                                    } else {
                                        finalRegister();
                                    }
    
                                    function finalRegister() {
                                        bot.commands.register(newcmd).then((reg) => {
                                            log(`Command registered: ${reg.metadata.name}`, `debug`);
                                            registered.push({
                                                cmd: newcmd.metadata.name,
                                                aliases: newcmd.metadata.aliases
                                            });
    
                                            i1++;
                                            loadCmd();
                                        }).catch(err => {
                                            OBUtil.err(err);
                                            i1++;
                                            loadCmd();
                                        });
                                    }
                                }
                                catch (err) {
                                    OBUtil.err(err);
                                    i1++;
                                    loadCmd();
                                }
                            } else {
                                i1++;
                                loadCmd();
                            }
                        })();
                    })
                });
            }

            if(type === 0) {
                stages.push({
                    name: 'Message Pre-Cacher',
                    load: new Promise((resolve, reject) => {
                        let channels = [...bot.channels.cache.values()];

                        log(`max channels: ${channels.length}`)

                        let i = 0;
                        (function loadMsgs() {
                            let channel = channels[i];

                            function next() {
                                if(i+1 >= channels.length) {
                                    resolve();
                                } else {
                                    i++;
                                    loadMsgs();
                                }
                            }

                            if(channel.type === 'text' && channel.guild.id === bot.mainGuild.id) {
                                log(`[${i}] fetching from channel: ${channel.id}`);

                                channel.messages.fetch({ limit: bot.cfg.init.cacheLimit }, true).then(() => {
                                    next();
                                }).catch(err => {
                                    OBUtil.err(err);
                                    next();
                                })
                            } else {
                                next();
                            }
                        })();
                    })
                });

                stages.push({
                    name: 'Scheduled Task Loader',
                    load: new Promise((resolve, reject) => {
                        let tasks = fs.readdirSync(path.resolve(`./modules/tasks`));
    
                        let i = 0;
                        (function loadTask() {
                            if(tasks[i].endsWith('.js')) {
                                let task = require(path.resolve(`./modules/tasks/${tasks[i]}`));
                                if((bot.mode === 1 || bot.mode === 2) && !task.lite) {
                                    log(`Unable to load task "${tasks[i]}" due to Lite mode.`, 'warn');
                                } else {
                                    bot.setInterval(() => {
                                        task.fn(bot, log);
                                    }, (task.interval));
                                }
    
                                if(i+1 === tasks.length) {
                                    resolve();
                                } else {
                                    i++;
                                    loadTask();
                                }
                            } else {
                                i++;
                                loadTask();
                            }
                        })();
                    })
                });

                stages.push({
                    name: 'Audit Log Pre-cacher',
                    load: new Promise((resolve, reject) => {
                        bot.mainGuild.fetchAuditLogs({ limit: 10, type: 'MESSAGE_DELETE' }).then((audit) => {
                            Memory.audit.log = [...audit.entries.values()];
                            Memory.audit.time = new Date();
                            resolve();
                        });
                    })
                });
    
                stages.push({
                    name: 'Moderator Presence Pre-cacher',
                    load: new Promise((resolve, reject) => {
                        Memory.mods = [];

                        log(bot.cfg.roles.moderator)

                        let getModRole = bot.mainGuild.roles.cache.get(bot.cfg.roles.moderator);

                        getModRole.members.each(mod => {
                            if(mod.id !== '202558206495555585') {
                                Memory.mods.push({
                                    id: mod.id,
                                    status: mod.presence.status,
                                    last_message: (mod.lastMessage) ? mod.lastMessage.createdTimestamp : 0
                                });
                            }
                        })

                        bot.mainGuild.roles.cache.get(bot.cfg.roles.jrmod).members.each(mod => {
                            Memory.mods.push({
                                id: mod.id,
                                status: mod.presence.status,
                                last_message: (mod.lastMessage) ? mod.lastMessage.createdTimestamp : 0
                            });
                        })
    
                        resolve();
                    })
                });

                stages.push({
                    name: 'Muted Member Pre-cacher',
                    load: new Promise((resolve, reject) => {
                        bot.db.profiles.find({ "data.edata.mute": { $exists: true }, format: 3}, (err, docs) => {
                            if(err) {
                                reject(err);
                            } else
                            if(docs.length === 0) {
                                resolve()
                            } else {
                                for(let i = 0; i < docs.length; i++) {
                                    let profile = docs[i];
                                    if(profile.edata.mute.end !== null) {
                                        let exp = profile.edata.mute.end;
                                        let remaining = exp - new Date().getTime();

                                        if(exp <= bot.exitTime.getTime()) {
                                            log('unmute today')
                                            if(remaining < (1000 * 60)) {
                                                log('unmute now')
                                                OBUtil.unmuter(profile.id);
                                            } else {
                                                log('unmute later')
                                                Memory.mutes.push({
                                                    id: profile.id,
                                                    time: bot.setTimeout(() => {
                                                        OBUtil.unmuter(profile.id);
                                                    }, remaining)
                                                });
                                            }
                                        }
                                    }

                                    if(i+1 >= docs.length) {
                                        resolve();
                                    }
                                }
                            }
                        });
                    })
                });
            }

            totals = stages.length;

            let si = 0;
            (function loadStage() {
                let stageStart = new Date().getTime();
                log(`Starting stage "${stages[si].name}"`, 'info')
                stages[si].load.then(() => {
                    let stageTime = (new Date().getTime() - stageStart) / 333;
                    log(`"${stages[si].name}" cleared in ${stageTime} second(s).`, 'debug');

                    done++;
                    log(`Loading assets... ${Math.round((100 * done) / totals)}%`, 'info');

                    if(si+1 >= stages.length) {
                        assetsFinal()
                    } else {
                        si++;
                        log('stage finished')
                        loadStage();
                    }
                }).catch(err => {
                    OBUtil.err(err);

                    done++;
                    errors++;
                    if(si+1 === stages.length) {
                        assetsFinal()
                    } else {
                        si++;
                        loadStage();
                    }
                });
            })();

            function assetsFinal() {
                log(`Asset loader finished.\n${done}/${totals} stage(s) processed. \n${errors} failure(s).`, 'debug')
                success(new Date().getTime() - timeStart);
            }

            for(let stage of assetsAsync) {
                let stageStart = new Date().getTime();
                stage.load.then(() => {
                    let stageTime = (new Date().getTime() - stageStart) / 1000;
                    log(`"${stage.name}" cleared in ${stageTime} second(s).`, 'debug');
                });
            }
        });
    }

    setBotStatus(type) {
        const bot = this;
        
        let pr = {
            status: 'online',
            activity: {
                name: null,
                type: null
            }
        }
    
        if (type === -1) {
            // shutting down
            pr.status = 'invisible';
        } else
        if (type === 0) {
            // loading assets
            pr.status = 'idle';
            pr.activity.type = 'WATCHING';
            pr.activity.name = 'assets load 🔄';
        } else
        if (type === 1) {
            // default state
            if(bot.mode === 0) {
                // code mode
                pr.status = 'dnd';
                pr.activity.type = 'PLAYING';
                pr.activity.name = 'Code Mode 💻';
            } else 
            if(bot.mode === 1 || Memory.bot.locked) {
                // ultralight mode and mod mode
                pr.status = 'dnd';
                pr.activity.type = 'PLAYING';
                pr.activity.name = 'Mod Mode 🔒';
            } else 
            if (bot.mode === 2) {
                // lite mode
                pr.status = 'idle';
                pr.activity.type = 'PLAYING';
                pr.activity.name = 'Lite Mode ⚠️';
            } else {
                // normal
                pr.status = 'online';
            }
        } else
        if (type === 2) {
            // cooldown active
            pr.status = 'idle';
        }
    
        if(pr.activity.name === null || pr.activity.type === null) {
            delete pr.activity;
        }
    
        Memory.presence = pr;
        bot.user.setPresence(pr);
    }

    // util
    setWindowTitle(text) {
        this.log('Deprecation Warning: Using client method setWindowTitle()', 'warn');
        if(text !== undefined) Memory.wintitle = text;

        function statusName(code) {
            if(code === 0) return 'READY';
            if(code === 1) return 'CONNECTING';
            if(code === 2) return 'RECONNECTING';
            if(code === 3) return 'IDLE';
            if(code === 4) return 'NEARLY';
            if(code === 5) return 'DISCONNECTED';
        }

        let wintitle = [
            `OptiBot ${this.version}`,
            `OP Mode ${this.mode}`,
            `${Math.round(this.ws.ping)}ms`,
            `WS Code ${this.ws.status} (${statusName(this.ws.status)})`
        ]

        if(typeof Memory.wintitle === 'string') wintitle.push(Memory.wintitle);

        process.title = wintitle.join(' | ');
    }

    // util
    getProfile(id, create) {
        this.log('Deprecation Warning: Using client method getProfile()', 'warn');
        return new Promise((resolve, reject) => {
            this.log('get profile: '+id);
            this.db.profiles.find({ id: id, format: 3 }, (err, docs) => {
                if(err) {
                    reject(err);
                } else
                if(docs[0]) {
                    delete docs[0]._id;
                    resolve(docs[0]);
                } else
                if(create) {
                    let profile = {
                        id: id,
                        format: 3,
                        data: {
                            essential: {
                                lastSeen: new Date().getTime()
                            }
                        }
                    }

                    resolve(profile);
                } else {
                    resolve();
                }
            });
        });
    }

    // util
    updateProfile(id, data) {
        this.log('Deprecation Warning: Using client method updateProfile()', 'warn');
        return new Promise((resolve, reject) => {
            this.db.profiles.update({ id: id, format: 3 }, data, { upsert: true }, (err) => {
                if(err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }

    // util
    parseInput(text) {
        this.log('Deprecation Warning: Using client method parseInput()', 'warn');
        if(typeof text !== 'string') text = new String(text);
        let input = text.trim().split("\n", 1)[0]; // first line of the message
        let data = {
            valid: input.match(new RegExp(`^(\\${this.prefixes.join('|\\')})(?![^a-zA-Z0-9])[a-zA-Z0-9]+(?=\\s|$)`)), // checks if the input starts with the command prefix, immediately followed by valid characters.
            cmd: input.toLowerCase().split(" ")[0].substr(1),
            args: input.split(" ").slice(1).filter(function (e) { return e.length != 0 })
        }

        if(input.match(/^(\$)(?![^0-9])[0-9]+(?=\s|$)/)) {
            // fixes "$[numbers]" resulting in false command inputs
            data.valid = null;
        }

        return data;
    }

    // util
    getAuthlvl(member) {
        this.log('Deprecation Warning: Using client method getAuthlvl()', 'warn');
        return OBUtil.getAuthlvl(this, member);
    }
}
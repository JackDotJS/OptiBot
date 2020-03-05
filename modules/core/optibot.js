const fs = require(`fs`);
const util = require(`util`);
const djs = require(`discord.js`);
const path = require(`path`);
const database = require('nedb');
const Command = require(path.resolve(`./modules/core/command.js`));

module.exports = class OptiBot extends djs.Client {
    constructor (options, debug, log) {
        super(options);

        const keys = require(path.resolve('./cfg/keys.json'));
        const cfg = require(path.resolve('./cfg/config.json'));
        const version = require(path.resolve('./package.json')).version;
        const prefix = (debug) ? cfg.prefixes.debug : cfg.prefixes.default;
        const splashtext = require(path.resolve('./cfg/splash.json'));

        const memory = {
            sm: {},
            bot: {
                locked: debug,
                init: true,
            },
            activity: {
                status: 'online',
                game: '',
                type: '',
                url: ''
            },
            vote: {
                issue: null,
                author: null,
                message: null
            },
            users: [],
            audit: null,
            confirm: [],
            mods: [],
            mutes: []
        };
        const storage = {
            msg: new database({ filename: './data/messages.db', autoload: true }),
            motd: new database({ filename: './data/motd.db', autoload: true }),
            profiles: new database({ filename: './data/profiles.db', autoload: true }),
            stats: new database({ filename: './data/statistics.db', autoload: true }),
            smr: new database({ filename: './data/smr.db', autoload: true })
        }
        const commands = {
            index: [],
            register: (cmd) => {
                return new Promise((resolve, reject) => {
                    if(cmd instanceof Command) {
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

        Object.defineProperty(this, 'memory', {
            get: function() {
                return memory;
            },
            set: function(value) {
                memory = value;
            }
        });

        Object.defineProperty(this, 'db', {
            get: function() {
                return storage;
            }
        });

        Object.defineProperty(this, 'exitTime', {
            get: function() {
                let now = new Date()
                now.setUTCDate(now.getUTCDate()+1)
                now.setUTCHours(8, 0, 0, 0)
                return now;
            }
        });

        Object.defineProperty(this, 'cfg', {
            get: function() {
                return cfg;
            }
        });

        Object.defineProperty(this, 'prefix', {
            get: function() {
                return prefix;
            }
        });

        Object.defineProperty(this, 'keys', {
            get: function() {
                return keys;
            }
        });

        Object.defineProperty(this, 'version', {
            get: function() {
                return version;
            }
        });

        Object.defineProperty(this, 'commands', {
            get: function() {
                return commands;
            },
        });

        Object.defineProperty(this, 'images', {
            get: function() {
                return images;
            },
        });

        Object.defineProperty(this, 'icons', {
            get: function() {
                return icons;
            },
        });

        Object.defineProperty(this, 'debug', {
            get: function() {
                return debug;
            },
        });

        Object.defineProperty(this, 'splash', {
            get: function() {
                return splashtext;
            },
        });

        Object.defineProperty(this, 'log', {
            get: function() {
                return log;
            },
        });
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

        setTimeout(() => {
            process.exit(code);
        }, 500);
    }

    setStatus(type) {
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
            if (this.memory.bot.locked) {
                if (this.debug) {
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

        this.user.setStatus(ACT_status);
        this.user.setActivity(ACT_game, { url: ACT_url, type: ACT_type });
        this.memory.activity.status = ACT_status;
        this.memory.activity.game = ACT_game;
        this.memory.activity.type = ACT_type;
        this.memory.activity.url = ACT_url;
    }

    loadAssets(type = 0) {

        /**
         * type
         * 
         * 0 = everything
         * 1 = commands, utilities, and images
         * 2 = only images
         */

        let bot = this;
        const log = this.log;
        let timeStart = new Date().getTime();
        return new Promise((success, failure) => {
            log('Loading assets...', 'info');

            let stages = [];
            let assetsAsync = [];
            let totals = 0;
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
                    
                    stages.push({
                        name: 'Utility Cache Removal',
                        load: new Promise((resolve, reject) => {
                            let utils = fs.readdirSync(path.resolve(`./modules/util`));
    
                            for(let file of utils) {
                                if(file.endsWith('.js')) {
                                    log(`cache delete: ${require.resolve(path.resolve(`./modules/util/${file}`))}`)
                                    delete require.cache[require.resolve(path.resolve(`./modules/util/${file}`))];
                                }
                            }
                            resolve();
                        })
                    });
                }

                stages.push({
                    name: 'Command Loader',
                    load: new Promise((resolve, reject) => {
                        let commands = fs.readdirSync(path.resolve(`./modules/cmd`));
                        let registered = [];
    
                        let i1 = 0;
                        (function loadCmd() {
                            let cmd = commands[i1];
                            if(cmd.endsWith('.js')) {
                                if(clrcache) {
                                    log(`cache delete: ${require.resolve(path.resolve(`./modules/cmd/${cmd}`))}`)
                                    delete require.cache[require.resolve(path.resolve(`./modules/cmd/${cmd}`))];
                                }
                
                                try {
                                    let newcmd = require(path.resolve(`./modules/cmd/${cmd}`))(bot, log);
    
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
    
                                            if(i1+1 === commands.length) {
                                                resolve();
                                            } else {
                                                i1++;
                                                loadCmd();
                                            }
                                        }).catch(err => {
                                            log(err.stack, 'error');
                                            i1++;
                                            loadCmd();
                                        });
                                    }
                                }
                                catch (err) {
                                    log(err.stack, 'error');
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
                    name: 'Scheduled Task Loader',
                    load: new Promise((resolve, reject) => {
                        let tasks = fs.readdirSync(path.resolve(`./modules/tasks`));
    
                        let i = 0;
                        (function loadTask() {
                            if(tasks[i].endsWith('.js')) {
                                let task = require(path.resolve(`./modules/tasks/${tasks[i]}`));
                                bot.setInterval(() => {
                                    task.fn(bot, log);
                                }, (task.interval));
    
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
                        bot.guilds.cache.get(bot.cfg.guilds.optifine).fetchAuditLogs({ limit: 10, type: 'MESSAGE_DELETE' }).then((audit) => {
                            bot.memory.audit = [...audit.entries.values()];
                            resolve();
                        });
                    })
                });
    
                stages.push({
                    name: 'Moderator Presence Pre-cacher',
                    load: new Promise((resolve, reject) => {
                        bot.memory.mods = [];

                        bot.guilds.cache.get(bot.cfg.guilds.optifine).roles.cache.get(bot.cfg.roles.moderator).members.each(mod => {
                            if(mod.id !== '202558206495555585') {
                                bot.memory.mods.push({
                                    id: mod.id,
                                    status: mod.presence.status,
                                    last_message: (mod.lastMessage) ? mod.lastMessage.createdTimestamp : 0
                                });
                            }
                        });

                        bot.guilds.cache.get(bot.cfg.guilds.optifine).roles.cache.get(bot.cfg.roles.jrmod).members.each(mod => {
                            bot.memory.mods.push({
                                id: mod.id,
                                status: mod.presence.status,
                                last_message: (mod.lastMessage) ? mod.lastMessage.createdTimestamp : 0
                            });
                        });
    
                        resolve();
                    })
                });

                stages.push({
                    name: 'Muted Member Pre-cacher',
                    load: new Promise((resolve, reject) => {
                        this.db.profiles.find({ "data.mute": { $exists: true }, format: 2}, (err, docs) => {
                            if(err) {
                                reject(err);
                            } else
                            if(docs.length === 0) {
                                resolve()
                            } else {
                                for(let i in docs) {
                                    if(docs[i].data.mute.cur_end !== null) {
                                        let exp = new Date(docs[i].data.mute.cur_end);
                                        let now = new Date();

                                        if(exp.getUTCDay() <= now.getUTCDay()){
                                            if(exp.getUTCMonth() <= now.getUTCMonth()){
                                                if(exp.getUTCFullYear() <= now.getUTCFullYear()){
                                                    bot.memory.mutes.push({
                                                        userid: docs[i].userid,
                                                        time: docs[i].data.mute.cur_end
                                                    });
                                                }
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
                stages[si].load.then(() => {
                    let stageTime = (new Date().getTime() - stageStart) / 333;
                    log(`"${stages[si].name}" cleared in ${stageTime} second(s).`, 'debug');

                    done++;
                    log(`Loading assets... ${Math.round((100 * done) / totals)}%`, 'info');

                    

                    if(si+1 === stages.length) {
                        log('All assets loaded successfully.', 'debug')
                        success(new Date().getTime() - timeStart);
                    } else {
                        si++;
                        bot.setTimeout(() => {
                            loadStage();
                        }, 1000);
                    }
                });
            })();

            for(let stage of assetsAsync) {
                let stageStart = new Date().getTime();
                stage.load.then(() => {
                    let stageTime = (new Date().getTime() - stageStart) / 1000;
                    log(`"${stage.name}" cleared in ${stageTime} second(s).`, 'debug');
                });
            }
        });
    }

    getProfile(id, create) {
        return new Promise((resolve, reject) => {
            this.log('get profile: '+id);
            this.db.profiles.find({ userid: id, format: 2 }, (err, docs) => {
                if(err) {
                    reject(err);
                } else
                if(docs[0]) {
                    delete docs[0]._id;
                    resolve(docs[0]);
                } else
                if(create) {
                    let profile = {
                        userid: id,
                        format: 2,
                        data: {
                            lastSeen: new Date().getTime()
                        }
                    }

                    this.db.profiles.insert(profile, (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(profile);
                        }
                    });
                } else {
                    resolve();
                }
            });
        });
    }

    updateProfile(id, data) {
        return new Promise((resolve, reject) => {
            this.db.profiles.update({ userid: id, format: 2 }, data, (err) => {
                if(err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }

    parseInput(text) {
        if(typeof text !== 'string') text = new String(text);
        let input = text.trim().split("\n", 1)[0]; // first line of the message
        return {
            valid: input.match(new RegExp(`^\\${this.prefix}(?![^a-zA-Z0-9])[a-zA-Z0-9]+(?=\\s|$)`)), // checks if the input starts with the command prefix, immediately followed by valid characters.
            cmd: input.toLowerCase().split(" ")[0].substr(1),
            args: input.split(" ").slice(1).filter(function (e) { return e.length != 0 })
        }
    }
}
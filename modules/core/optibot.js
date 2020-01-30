const fs = require(`fs`);
const util = require(`util`);
const djs = require(`discord.js`);
const path = require(`path`);
const database = require('nedb');
const Command = require(path.resolve(`./modules/core/command.js`));

module.exports = class OptiBot extends djs.Client {
    constructor (options, debug, logc) {
        super(options);

        const keys = require(path.resolve('./cfg/keys.json'));
        const cfg = require(path.resolve('./cfg/config.json'));
        const version = require(path.resolve('./package.json')).version;
        const trigger = (debug) ? cfg.triggers.debug : cfg.triggers.default;
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
            log: null,
            audit: null
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

        Object.defineProperty(this, 'cfg', {
            get: function() {
                return cfg;
            }
        });

        Object.defineProperty(this, 'trigger', {
            get: function() {
                return trigger;
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

        Object.defineProperty(this, 'logc', {
            get: function() {
                return logc;
            },
        });
    }

    exit(code = 0) {
        if (this.memory.log !== null) {
            this.memory.log.destroy().then(() => {
                this.destroy().then(() => {
                    process.exit(code);
                });
            });
        } else {
            this.destroy().then(() => {
                process.exit(code);
            });
        }
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

    loadAssets() {
        let bot = this;
        const log = this.logc;
        let timeStart = new Date().getTime();
        return new Promise((success, failure) => {
            let assets = [];
            let assetsAsync = [];
            let clrcache = false;

            if(bot.commands.index.length > 0) {
                bot.commands.index = [];
                clrcache = true;
            }

            if(clrcache) {
                assets.push({
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

            assets.push({
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
                                            log(`${alias} equals ${register.cmd}?`)
                                            if(alias === register.cmd) {
                                                log(new Error(`Conflicting command names/aliases: "${alias}" (${newcmd.metadata.name}.js) === "${register.cmd}" (${register.cmd}.js)`).stack, 'error');
                                                i1++;
                                                loadCmd();
                                            } else 
                                            if(register.aliases.length === 0) {
                                                if(i3+1 >= newcmd.metadata.aliases.length) {
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
                                                    log(`${alias} equals ${register.aliases[i4]}?`)
                                                    if(alias === register.aliases[i4]) {
                                                        log(new Error(`Conflicting command names/aliases: "${alias}" (${newcmd.metadata.name}.js) === "${registered[i].aliases[i2]}" (${register.cmd}.js)`).stack, 'error');
                                                        i1++;
                                                        loadCmd();
                                                    }

                                                    if(i4+1 >= register.aliases.length) {
                                                        if(i3+1 >= newcmd.metadata.aliases.length) {
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

            assets.push({
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

            assets.push({
                name: 'Icon Loader',
                load: new Promise((resolve, reject) => {
                    bot.icons.index = [];

                    let ig = 0;
                    (function getEmoji() {
                        let emoji = [...bot.guilds.get(bot.cfg.emoji.guilds[ig]).emojis.values()];

                        if (emoji.length === 0) {
                            if(ig+1 === bot.cfg.emoji.guilds.length) {
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
                                    if(parseInt(ig)+1 === bot.cfg.emoji.guilds.length) {
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

            assets.push({
                name: 'Audit Log Pre-cacher',
                load: new Promise((resolve, reject) => {
                    bot.guilds.get(bot.cfg.guilds.optifine).fetchAuditLogs({ limit: 10, type: 'MESSAGE_DELETE' }).then((audit) => {
                        bot.memory.audit = [...audit.entries.values()];
                        resolve();
                    });
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

            let si = 0;
            (function loadStage() {
                let stageStart = new Date().getTime();
                assets[si].load.then(() => {
                    let stageTime = (new Date().getTime() - stageStart) / 1000;
                    log(`"${assets[si].name}" cleared in ${stageTime} second(s).`, 'debug');

                    

                    if(si+1 === assets.length) {
                        log('All assets loaded successfully.', 'debug')
                        success(new Date().getTime() - timeStart);
                    } else {
                        si++;
                        loadStage();
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
            this.logc('get profile: '+id);
            this.db.profiles.find({ userid: id, format: 2 }, (err, docs) => {
                if(err) {
                    reject(err);
                } else
                if(docs[0]) {
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
            valid: input.match(new RegExp(`^\\${this.trigger}(?![^a-zA-Z0-9])[a-zA-Z0-9]+(?=\\s|$)`)), // checks if the input starts with the trigger, immediately followed by valid characters.
            cmd: input.toLowerCase().split(" ")[0].substr(1),
            args: input.split(" ").slice(1).filter(function (e) { return e.length != 0 })
        }
    }
}
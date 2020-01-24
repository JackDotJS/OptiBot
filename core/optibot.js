const fs = require(`fs`);
const djs = require(`discord.js`);
const path = require(`path`);
const database = require('nedb');
const Command = require(`./command.js`);

module.exports = class OptiBot extends djs.Client {
    constructor (options, misc, log) {
        super(options);

        const memory = {
            sm: {},
            bot: {
                locked: misc.debug,
            },
            activity: {
                status: 'online',
                game: '',
                type: '',
                url: ''
            },
            version: require('../package.json').version,
            vote: {
                issue: null,
                author: null,
                message: null
            },
            users: []
        };

        let sm_i = 0;
        const sm_check = this.setInterval(() => {
            /**
             * FORMAT:
             * 
             * 0000000000000000: {
                    past: [],
                    now: 0,
                    mps: 0.0,
                    manual: false,
                    i: 0,
                    until: null,
                }
             */

            let channels = Object.keys(memory.sm);
            if(channels.length > 0) {
                channels.forEach((id, i) => {
                    let tc = memory.sm[id];
                    tc.past.push(tc.now);
                    tc.now = 0;

                    if(tc.past.length > 5) {
                        tc.past.shift();
                    }

                    tc.mps = tc.past.reduce((a, b) => a + b) / tc.past.length;

                    if(tc.mps !== 0) log(`${id}: ${tc.mps} mps`);

                    if(tc.until !== null) {
                        if(new Date().getTime() >= tc.until) {
                            // disable slowmode
                            tc.until = null;
                            tc.i = 0;

                            log(`Slowmode disabled in ${id}`, 'info')
                        }
                    }

                    if(sm_i === 2) {
                        if(tc.mps > 1 && tc.until === null) {
                            // enable slowmode
                            tc.until = new Date().getTime() + (1000 * 60 * 10); // 10 minutes
                            tc.i = 5;

                            log(`Slowmode set to 3 seconds in ${id}`, 'info')
                        } else
                        if(tc.mps > 0.75 && tc.until === null) {
                            // enable slowmode
                            tc.until = new Date().getTime() + (1000 * 60 * 10); // 10 minutes
                            tc.i = 3;

                            log(`Slowmode set to 3 seconds in ${id}`, 'info')
                        }
                    }


                    if(parseInt(i)+1 >= channels.length) {
                        if(sm_i === 2) {
                            sm_i = 0;   
                        } else {
                            sm_i++;
                        }
                    }
                });
            }
        }, 1000);

        const storage = {
            msg: new database({ filename: './data/messages.db', autoload: true }),
            motd: new database({ filename: './data/motd.db', autoload: true }),
            profiles: new database({ filename: './data/profiles.db', autoload: true }),
            stats: new database({ filename: './data/statistics.db', autoload: true }),
            smr: new database({ filename: './data/smr.db', autoload: true })
        }

        const cfg = require('../cfg/config.json');
        const trigger = (misc.debug) ? cfg.triggers.debug : cfg.triggers.default;
        const keys = require('../cfg/keys.json');
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
                    for(let i in commands.index) {
                        if (query.toLowerCase() === commands.index[i].metadata.name) {
                            resolve(commands.index[i]);
                            break;
                        } else
                        if (parseInt(i) + 1 === commands.index.length) {
                            resolve();
                        }
                    }
                });
            }
        };
        const images = {
            index: [],
            default: fs.readFileSync('./assets/img/default.png'),
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

        Object.defineProperty(this, 'misc', {
            get: function() {
                return misc;
            },
        });

        Object.defineProperty(this, 'log', {
            get: function() {
                return log;
            },
        });
    }

    exit(code = 0) {
        this.destroy();
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
                if (this.misc.debug) {
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
        let timeStart = new Date().getTime();
        return new Promise((resolve, reject) => {
            bot.images.index = [];
            bot.icons.index = [];

            const log = bot.log;

            let commands = fs.readdirSync(`./modules/cmd`);
            let utilities = fs.readdirSync(`./modules/util`);
            let images = fs.readdirSync(`./assets/img`);
            let clcache = false;

            if(bot.commands.index.length > 0) {
                bot.commands.index = [];
                clcache = true;
            }

            let i1 = 0;
            let i2 = 0;
            let i3 = 0;
            let i4 = 0;
            (function utilRefresh() {
                let endItr = () => {
                    if(i4+1 >= utilities.length) {
                        cmdLoader();
                    } else {
                        i4++;
                        utilRefresh();
                    }
                }

                let util = utilities[i4];

                if(!util.endsWith('.js')) {
                    endItr();
                } else {
                    if(clcache) {
                        log(`cache delete: ${require.resolve(`../modules/util/${util}`)}`)
                        delete require.cache[require.resolve(`../modules/util/${util}`)];
                        endItr();
                    } else {
                        cmdLoader();
                    }
                }
            })();

            function cmdLoader() {
                let endItr = () => {
                    if(i1+1 >= commands.length) {
                        imageLoader();
                    } else {
                        i1++;
                        cmdLoader();
                    }
                }

                let cmd = commands[i1];

                if(!cmd.endsWith('.js')) {
                    endItr();
                    return;
                }
                
                if(clcache) {
                    log(`cache delete: ${require.resolve(`../modules/cmd/${cmd}`)}`)
                    delete require.cache[require.resolve(`../modules/cmd/${cmd}`)];
                }

                try {
                    bot.commands.register(require(`../modules/cmd/${cmd}`)(bot, log)).then((reg) => {
                        log(`Command registered: ${reg.metadata.name}`, `debug`);
                        endItr();
                    }).catch(err => {
                        log(err.stack, 'error');
                        endItr();
                    });
                }
                catch (err) {
                    log(err.stack, 'error');
                    endItr();
                }
            };

            
            function imageLoader() {
                let file = images[i2];
                if(file.match(/(\.)(?!.*\1)/) !== null) {
                    bot.images.index.push({
                        name: file,
                        data: fs.readFileSync(`./assets/img/${file}`)
                    });
                }

                if(i2+1 >= images.length) {
                    iconLoader();
                } else {
                    i2++;
                    imageLoader();
                }
            }

            
            function iconLoader() {
                let emojiCollection = [...bot.guilds.get(bot.cfg.guilds.optibot).emojis.values()];
                let emoji = emojiCollection[i3];
                if(emoji.name.startsWith('ICO_')) {
                    if(emoji.name === 'ICO_default') {
                        bot.icons.default = emoji.url;
                    } else {
                        bot.icons.index.push({
                            name: emoji.name,
                            data: emoji.url
                        });
                    }
                }

                if(i3+1 >= emojiCollection.length) {
                    let timeEnd = new Date().getTime();
                    resolve(timeEnd - timeStart);
                } else {
                    i3++;
                    iconLoader();
                }
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
}
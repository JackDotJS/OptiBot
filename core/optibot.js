const fs = require(`fs`);
const djs = require(`discord.js`);
const Command = require(`./command.js`);

module.exports = class OptiBot extends djs.Client {
    constructor (options, misc, log) {
        super(options);

        const memory = {
            bot: {
                locked: misc.debug,
            },
            activity: {
                status: 'online',
                game: '',
                type: '',
                url: ''
            },
            version: require('../package.json').version
        };

        const cfg = require('../cfg/config.json');
        let trigger = (misc.debug) ? cfg.triggers.debug : cfg.triggers.default;
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

        Object.defineProperty(this, 'memory', {
            get: function() {
                return memory;
            },
            set: function(value) {
                memory = value;
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

            let commands = fs.readdirSync(`./cmd`);
            let images = fs.readdirSync(`./assets/img`);
            let clcache = false;

            if(bot.commands.index.length > 0) {
                bot.commands.index = [];
                clcache = true;
            }

            let i1 = 0;
            (function cmdLoader() {
                let cmd = commands[i1];
                if(clcache) {
                    delete require.cache[require.resolve(`../cmd/${cmd}`)];
                }

                try {
                    bot.commands.register(require(`../cmd/${cmd}`)(bot, log)).then((reg) => {
                        log(`Command registered: ${reg.metadata.name}`, `debug`);
    
                        if(i1+1 >= commands.length) {
                            imageLoader();
                        } else {
                            i1++;
                            cmdLoader();
                        }
                    }).catch(err => {
                        log(err.stack, 'error');
                        i1++;
                        cmdLoader();
                    });
                }
                catch (err) {
                    log(err.stack, 'error');
                    i1++;
                    cmdLoader();
                }
            })();

            let i2 = 0;
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

            let i3 = 0;
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
}
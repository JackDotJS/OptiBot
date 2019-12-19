const djs = require(`discord.js`);
const Command = require(`./command.js`);

module.exports = class OptiBot extends djs.Client {
    constructor (options) {
        super(options);

        const memory = null;
        const cfg = require('../cfg/config.json');
        let trigger = cfg.trigger;
        const keys = require('../cfg/keys.json');
        const commands = {
            index: [],
            register: (cmd) => {
                return new Promise((resolve, reject) => {
                    if(cmd instanceof Command) {
                        commands.index.push(cmd);
                        resolve(cmd);
                    } else {
                        reject(new Error('Command attempted to register is not an instance of Command.'));
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
                            reject();
                        }
                    }
                });
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
    }
}
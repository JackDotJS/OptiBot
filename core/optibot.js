const djs = require(`discord.js`);

module.exports = class OptiBot extends djs.Client {
    constructor (options) {
        super(options);

        let memory = null;

        Object.defineProperty(this, 'cfg', {
            get: function() {
                return require('../cfg/config.json');
            }
        });

        Object.defineProperty(this, 'keys', {
            get: function() {
                return require('../cfg/keys.json');
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
    }
}
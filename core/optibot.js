const djs = require(`discord.js`);

module.exports = class OptiBot extends djs.Client {
    constructor (options) {
        super(options);

        this.cfg = require('./cfg/config.json');
        this.memory = {}
    }

    get cfg() {
        return this.cfg;
    }

    get data() {
        return this.memory;
    }
}
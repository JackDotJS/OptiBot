const path = require(`path`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));
const errMsg = require(path.resolve(`./modules/util/simpleError.js`));
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    short_desc: `Ping!`,
    authlevel: 1,
    tags: ['DM_ONLY', 'INSTANT'],

    run: (m, args, data) => {

        // shows easter eggs you've unlocked
        // TODO

    }
})}
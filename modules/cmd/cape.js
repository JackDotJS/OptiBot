const path = require(`path`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./core/command.js`));
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));
const targetUser = require(path.resolve(`./modules/util/targetUser.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    short_desc: `Donator cape viewer`,
    authlevel: 0,
    tags: ['DM_OPTIONAL', 'BOT_CHANNEL_ONLY'],

    run: (m, args, data) => {
        //targetUser()
    }
})}
const path = require(`path`);
const djs = require(`discord.js`);
const Command = require(`../core/command.js`)

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    authlevel: 4,
    tags: ['BOT_CHANNEL_ONLY', 'INSTANT', 'STRICT'],

    run: (m, args, data) => {
        m.channel.send('Allowed');
    }
})}
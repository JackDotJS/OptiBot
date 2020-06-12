const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);

const Command = require(path.resolve(`./modules/core/command.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    authlvl: 5,
    flags: ['DM_OPTIONAL', 'NO_TYPER', 'HIDDEN'],

    run: (m, args, data) => {
        bot.pb.createPaste(m.cleanContent, 'API test', null, 1, '10M').then((data) => {
            m.channel.send(data)
        });
    }
})}
const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    short_desc: `Short description. Shows in \`${bot.prefix}list\``,
    long_desc: `Long description. Shows in \`${bot.prefix}help\` and tooltips in \`${bot.prefix}list\``,
    args: `<discord message>`,
    authlvl: 3,
    flags: ['DM_OPTIONAL', 'NO_TYPER', 'HIDDEN'],

    run: (m, args, data) => {
        //todo
    }
})}
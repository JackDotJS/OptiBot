const path = require(`path`);
const djs = require(`discord.js`);
const { Command, OBUtil, Memory } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    short_desc: `Shut down OptiBot.`,
    authlvl: 4,
    flags: ['NO_DM', 'NO_TYPER'],
    run: null
}

metadata.run = (m, args, data) => {
    let embed = new djs.MessageEmbed()
    .setAuthor('Shutting down. Goodbye!', bot.icons.find('ICO_door'))
    .setColor(bot.cfg.embed.default);

    m.channel.send({embed: embed}).then(() => {
        bot.exit();
    });
}

module.exports = new Command(metadata);
const path = require(`path`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    short_desc: `Restart OptiBot.`,
    authlvl: 3,
    tags: ['NO_DM', 'INSTANT', 'LITE'],
    
    run: (m, args, data) => {
        let embed = new djs.MessageEmbed()
        .setAuthor('Restarting...', bot.icons.find('ICO_door'))
        .setColor(bot.cfg.embed.default);

        m.channel.send({embed: embed}).then(() => {
            bot.exit(16);
        });
    }
})}
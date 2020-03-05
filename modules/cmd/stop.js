const path = require(`path`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));
const erm = require(path.resolve(`./modules/util/simpleError.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    short_desc: `Shut down OptiBot.`,
    authlevel: 2,
    tags: ['NO_DM', 'INSTANT'],
    
    run: (m, args, data) => {
        let embed = new djs.MessageEmbed()
        .setAuthor('Shutting down...', bot.icons.find('ICO_door'))
        .setColor(bot.cfg.embed.default);

        m.channel.send({embed: embed}).then(() => {
            bot.exit();
        });
    }
})}
const path = require(`path`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./core/command.js`));
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    short_desc: `Ping!`,
    authlevel: 1,
    tags: ['DM_OPTIONAL', 'INSTANT'],

    run: (m, args, data) => {
        let embed = new djs.RichEmbed()
        .setAuthor(`${Math.round(bot.ping)}ms`, bot.icons.find('ICO_wifi'))
        .setColor(bot.cfg.embed.default);

        m.channel.send({embed: embed}).then(msg => { msgFinalizer(m.author.id, msg, bot, log); });
    }
})}
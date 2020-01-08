const path = require(`path`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./core/command.js`))

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    short_desc: `Provides a link to download AdoptOpenJDK.`,
    authlevel: 0,
    tags: ['DM_OPTIONAL', 'INSTANT'],

    run: (m, args, data) => {
        let embed = new djs.RichEmbed()
        .setColor(bot.cfg.embed.default)
        .setAuthor('AdoptOpenJDK', bot.icons.find('ICO_jdk'))
        .setTitle('https://adoptopenjdk.net/')

        m.channel.send({ embed: embed });
    }
})}
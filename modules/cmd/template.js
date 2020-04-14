const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    aliases: ['aliases'],
    short_desc: `Short description. Shows in \`${bot.prefix}list\``,
    long_desc: `Long description. Shows in \`${bot.prefix}help\` and tooltips in \`${bot.prefix}list\``,
    usage: `[any:args]`,
    image: 'IMG_args.png',
    authlvl: 1000,
    tags: ['DM_OPTIONAL', 'INSTANT', 'HIDDEN'],

    run: (m, args, data) => {
        let embed = new djs.MessageEmbed()
        .setAuthor(`Example MessageEmbed`, bot.icons.index[~~(Math.random() * bot.icons.index.length)].data)
        .setColor(bot.cfg.embed.egg)

        m.channel.send({embed: embed}).then(bm => bot.util.responder(m.author.id, bm, bot));
    }
})}
const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));
const errMsg = require(path.resolve(`./modules/util/simpleError.js`));
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    aliases: ['aliases'],
    short_desc: `Short description. Shows in \`${bot.prefix}list\``,
    long_desc: `Long description. Shows in \`${bot.prefix}help\` and tooltips in \`${bot.prefix}list\``,
    usage: `[args]`,
    image: 'IMG_args.png',
    authlevel: 4,
    tags: ['DM_OPTIONAL', 'INSTANT', 'HIDDEN'],

    run: (m, args, data) => {
        let embed = new djs.RichEmbed()
        .setAuthor(`Example RichEmbed`, bot.icons.index[~~(Math.random() * bot.icons.index.length)].data)
        .setColor(bot.cfg.embed.egg)

        m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot, log));
    }
})}
const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const { Command, OBUtil, Memory } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    // aliases: ['aliases'],
    short_desc: `Short description. Shows in \`${bot.prefix}list\``,
    long_desc: `Long description. Shows in \`${bot.prefix}help\` and tooltips in \`${bot.prefix}list\``,
    args: `[args]`,
    image: 'IMG_args.png',
    authlvl: 5,
    flags: ['DM_OPTIONAL', 'NO_TYPER', 'HIDDEN'],
    run: null
}

metadata.run = (m, args, data) => {
    let embed = new djs.MessageEmbed()
    .setAuthor(`Example MessageEmbed`, bot.icons.index[~~(Math.random() * bot.icons.index.length)].data)
    .setColor(bot.cfg.embed.default)

    m.channel.send({embed: embed}).then(bm => OBUtil.afterSend(bm, m.author.id));
}

module.exports = new Command(metadata);
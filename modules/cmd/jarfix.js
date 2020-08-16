const path = require(`path`);
const djs = require(`discord.js`);
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    //aliases: ['fixjar'],
    short_desc: `Provides a link to download Jarfix.`,
    authlvl: 0,
    flags: ['DM_OPTIONAL', 'NO_TYPER'],
    run: null
}

metadata.run = (m, args, data) => {
    let embed = new djs.MessageEmbed()
    .setColor(bot.cfg.embed.default)
    .setAuthor('Download Jarfix', Assets.getEmoji('ICO_jarfix').url)
    .setTitle('https://johann.loefflmann.net/en/software/jarfix/index.html')

    m.channel.send({ embed: embed }).then(bm => OBUtil.afterSend(bm, m.author.id))
}

module.exports = new Command(metadata);
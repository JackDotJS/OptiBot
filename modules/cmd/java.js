const path = require(`path`);
const djs = require(`discord.js`);
const { Command, OBUtil, Memory } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    aliases: ['jdk', 'jre', `ojdk`, `openjdk`],
    short_desc: `Provides some links to download Java.`,
    authlvl: 0,
    flags: ['DM_OPTIONAL', 'NO_TYPER'],
    run: null
}

metadata.run = (m, args, data) => {
    let embed = new djs.MessageEmbed()
    .setColor(bot.cfg.embed.default)
    .setAuthor('AdoptOpenJDK', OBUtil.getEmoji('ICO_jdk').url)
    .setTitle('https://adoptopenjdk.net/')

    m.channel.send({ embed: embed }).then(bm => OBUtil.afterSend(bm, m.author.id))
}

module.exports = new Command(metadata);
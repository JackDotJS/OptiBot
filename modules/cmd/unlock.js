const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    aliases: ['open'],
    short_desc: `Unlock a given channel.`,
    long_desc: `Unlocks a given channel. Defaults to the channel you're in if not specified.`,
    args: `[channel]`,
    authlvl: 2,
    flags: ['NO_DM', 'STRICT', 'LITE'],
    run: null
}

metadata.run = (m, args, data) => {
    let channel = m.channel;

    if(args[0]) {
        if(djs.MessageMentions.CHANNELS_PATTERN.exec(args[0]) != null) {
            channel = args[0].mentions.channels.first();
        } else
        if(parseInt(args[0]) >= 1420070400000) {
            channel = bot.channels.cache.get(args[0]) || m.channel;
        }
    } 

    if (bot.cfg.channels.nomodify.some(id => [channel.id, channel.parentID].includes(id)) || channel.guild.id != bot.mainGuild.id) {
        return OBUtil.err(`The #${channel.name} channel cannot be modified.`, {m:m});
    }

    if (!channel.permissionOverwrites.get(bot.mainGuild.id).deny.has('SEND_MESSAGES')) {
        return OBUtil.err(`The #${channel.name} channel has already been unlocked.`, {m:m});
    }

    channel.updateOverwrite(bot.mainGuild.id, {SEND_MESSAGES:null}, `Channel unlocked by ${m.author.tag} (${m.author.id}) via ${bot.prefix}${data.input.cmd}`).then(() => {
        let logEntry = new LogEntry({channel: "moderation"})
        .setColor(bot.cfg.embed.default)
        .setIcon(Assets.getEmoji('ICO_unlock').url)
        .setTitle(`Channel Unlocked`, `Channel Unlock Report`)
        .addSection(`Channel`, channel)
        .addSection(`Moderator Responsible`, m.author)
        .addSection(`Command Location`, m)

        let embed = new djs.MessageEmbed()
        .setAuthor(`Channel unlocked.`, Assets.getEmoji('ICO_okay').url)
        .setColor(bot.cfg.embed.okay)
        .setDescription(`The ${channel} channel has been unlocked.`)

        m.channel.stopTyping(true);
        m.channel.send({embed: embed})//.then(bm => OBUtil.afterSend(bm, m.author.id));
        logEntry.submit();
    })
}

module.exports = new Command(metadata);
const path = require('path');
const util = require('util');
const djs = require('discord.js');
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    aliases: ['close'],
    short_desc: 'Lock a given channel.',
    long_desc: 'Locks a given channel. Defaults to the channel you\'re in if not specified.',
    args: '[channel]',
    authlvl: 2,
    flags: ['NO_DM', 'STRICT', 'LITE'],
    run: null
};

metadata.run = (m, args, data) => {
    let channel = m.channel;

    if(args[0]) {
        if(djs.MessageMentions.CHANNELS_PATTERN.exec(args[0]) !== null) {
            channel = args[0].mentions.channels.first();
        } else
        if(parseInt(args[0]) >= 1420070400000) {
            channel = bot.channels.cache.get(args[0]) || m.channel;
        }
    } 

    if (bot.cfg.channels.nomodify.some(id => [channel.id, channel.parentID].includes(id)) || channel.guild.id !== bot.mainGuild.id) {
        return OBUtil.err(`The #${channel.name} channel cannot be modified.`, {m:m});
    }

    if (channel.permissionOverwrites.get(bot.mainGuild.id).deny.has('SEND_MESSAGES')) {
        return OBUtil.err(`The #${channel.name} channel has already been locked.`, {m:m});
    }

    channel.updateOverwrite(bot.mainGuild.id, {SEND_MESSAGES:false}, `Channel locked by ${m.author.tag} (${m.author.id}) via ${bot.prefix}${data.input.cmd}`).then(() => {
        const logEntry = new LogEntry({channel: 'moderation'})
            .setColor(bot.cfg.embed.default)
            .setIcon(Assets.getEmoji('ICO_lock').url)
            .setTitle('Channel Locked', 'Channel Lock Report')
            .addSection('Channel', channel)
            .addSection('Moderator Responsible', m.author)
            .addSection('Command Location', m);

        const embed = new djs.MessageEmbed()
            .setAuthor('Channel locked.', Assets.getEmoji('ICO_okay').url)
            .setColor(bot.cfg.embed.okay)
            .setDescription(`The ${channel} channel has been locked.`);

        m.channel.stopTyping(true);
        m.channel.send({embed: embed});//.then(bm => OBUtil.afterSend(bm, m.author.id));
        logEntry.submit();
    });
};

module.exports = new Command(metadata);
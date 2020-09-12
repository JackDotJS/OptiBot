const path = require('path');
const util = require('util');
const djs = require('discord.js');
const timeago = require('timeago.js');
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    aliases: ['ungag', 'unsilence'],
    short_desc: 'Unmute a user.',
    long_desc: 'Allows a user to speak once again, if they\'ve already been muted.',
    args: '<discord member> [reason]',
    authlvl: 2,
    flags: ['NO_DM', 'LITE'],
    run: null
};

metadata.run = (m, args, data) => {
    if(!args[0]) {
        OBUtil.missingArgs(m, metadata);
    } else {
        OBUtil.parseTarget(m, 0, args[0], data.member).then((result) => {
            if (!result) {
                OBUtil.err('You must specify a valid user to unmute.', {m:m});
            } else
            if (result.type === 'notfound' || result.type === 'id') {
                OBUtil.err('Unable to find a user.', {m:m});
            } else
            if (result.id === m.author.id) {
                OBUtil.err('If you\'re muted, how are you even using this command?', {m:m});
            } else
            if (result.id === bot.user.id) {
                OBUtil.err('I\'m a bot. Why would I even be muted?', {m:m});
            } else 
            if (OBUtil.getAuthlvl(result.target) > 0) {
                OBUtil.err('That user is too powerful to be muted in the first place.', {m:m});
            } else 
            if (result.type === 'member' && !result.target.roles.cache.has(bot.cfg.roles.muted)) {
                OBUtil.err('That user has not been muted.', {m:m});
            } else {
                s2(result);
            }
        });

        function s2(result) {
            const now = new Date().getTime();
            OBUtil.getProfile(result.id, true).then(profile => {
                const reason = m.content.substring( `${bot.prefix}${data.input.cmd} ${args[0]} `.length );

                if(!profile.edata.record) profile.edata.record = [];

                const entry = new RecordEntry()
                    .setMod(m.author.id)
                    .setURL(m.url)
                    .setAction('mute')
                    .setActionType('remove')
                    .setReason(m.author, (reason.length > 0) ? reason : 'No reason provided.');

                if(profile.edata.mute) {
                    const remaining = profile.edata.mute.end - now;
                    const minutes = Math.round(remaining/1000/60);
                    const hours = Math.round(remaining/(1000*60*60));
                    const days = Math.round(remaining/(1000*60*60*24));
                    let time_remaining = null;

                    if (minutes < 60) {
                        time_remaining = `${minutes} minute${(minutes !== 1) ? 's' : ''}`;
                    } else
                    if (hours < 24) {
                        time_remaining = `${hours} hour${(hours !== 1) ? 's' : ''}`;
                    } else {
                        time_remaining = `${days} day${(days !== 1) ? 's' : ''}`;
                    }

                    entry.setParent(m.author, profile.edata.mute.caseID);

                    if(profile.edata.mute.end !== null) {
                        entry.setDetails(m.author, `Leftover mute time remaining: ${time_remaining}.`);
                    }

                    delete profile.edata.mute;
                }

                profile.edata.record.push(entry.raw);

                for(const i in Memory.mutes) {
                    if(Memory.mutes[i].id === profile.id) {
                        bot.clearTimeout(Memory.mutes[i].time);
                        Memory.mutes.splice(i, 1);
                    }
                }

                OBUtil.updateProfile(profile).then(() => {
                    const logInfo = () => {
                        const embed = new djs.MessageEmbed()
                            .setColor(bot.cfg.embed.okay)
                            .setAuthor('User unmuted.', Assets.getEmoji('ICO_okay').url)
                            .setDescription(`${result.mention} has been unmuted.`);

                        if(reason.length > 0) {
                            embed.addField('Reason', reason);
                        } else {
                            embed.addField('Reason', `No reason provided. \n(Please use the \`${bot.prefix}editrecord\` command.)`);
                        }

                        m.channel.stopTyping(true);
                        m.channel.send({embed: embed});//.then(bm => OBUtil.afterSend(bm, m.author.id));

                        const logEntry = new LogEntry({channel: 'moderation'})
                            .setColor(bot.cfg.embed.default)
                            .setIcon(Assets.getEmoji('ICO_unmute').url)
                            .setTitle('Member Unmuted', 'Member Mute Removal Report')
                            .setHeader((reason.length > 0) ? 'Reason: '+reason : 'No reason provided.')
                            .addSection('Member Unmuted', result.target)
                            .addSection('Moderator Responsible', m.author)
                            .addSection('Command Location', m);

                        if(result.type !== 'id') {
                            logEntry.setThumbnail(((result.type === 'user') ? result.target : result.target.user).displayAvatarURL({format:'png'}));
                        }

                        logEntry.submit();
                    };

                    if(result.type === 'member') {
                        result.target.roles.remove(bot.cfg.roles.muted, `Member unmuted by ${m.author.tag}`).then(() => {
                            logInfo();
                        }).catch(err => OBUtil.err(err, {m:m}));
                    } else {
                        logInfo();
                    }
                }).catch(err => OBUtil.err(err, {m:m}));
            });
        }
    }
};

module.exports = new Command(metadata);
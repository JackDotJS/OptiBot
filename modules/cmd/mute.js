const path = require('path');
const util = require('util');
const djs = require('discord.js');
const timeago = require('timeago.js');
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    aliases: ['silence', 'gag'],
    short_desc: 'Mute a user.',
    long_desc: 'Stops a user from being able to talk or send messages in text channels. Time limit is optional, and will default to 1 hour if not specified. You can also specify the time measure in (m)inutes, (h)ours, and (d)ays. The maximum time limit is 7 days, but can be set to infinity by using 0. Additionally, you can adjust time limits for users by simply running this command again with the desired time.\n\n**Note that this is not an end-all punishment for every user. It is still very much possible to get around server mutes with the right resources.**',
    args: '<discord member> [time | reason] [reason]',
    authlvl: 2,
    flags: ['NO_DM', 'LITE'],
    run: null
};


metadata.run = (m, args, data) => {
    if(!args[0]) {
        OBUtil.missingArgs(m, metadata);
    } else {
        const now = new Date().getTime();
        const muteData = {
            caseID: now,
            end: now + (1000 * 60 * 60), // 1 hour default
        };
        const log_data = {
            org_end: null,
        };
        const rvt = {
            timeAdded: false,
            reasonText: m.content.substring( `${bot.prefix}${data.input.cmd} ${args[0]} `.length ),
            reasonAdded: false,
        };

        OBUtil.parseTarget(m, 0, args[0], data.member).then((result) => {
            if (!result) {
                OBUtil.err('You must specify a valid user.', {m:m});
            } else
            if (['notfound', 'id'].includes(result.type)) {
                OBUtil.err('Unable to find a user.', {m:m});
            } else 
            if (result.id === m.author.id) {
                OBUtil.err('Nice try.', {m:m});
            } else
            if (result.id === bot.user.id) {
                OBUtil.err('You have no power here.', {m:m});
            } else 
            if (OBUtil.getAuthlvl(result.target) > 0) {
                OBUtil.err('That user is too powerful to be muted.', {m:m});
            } else {
                s2(result);
            }
        });

        function s2(result) {
            log('s2');
            const time = OBUtil.parseTime(args[1]);
            

            if(!args[1]) {
                s3(result, time);
            } else 
            if (!time.valid) {
                s3(result, time); // assume rest of input is part of the reason
            } else {
                rvt.reasonText = m.content.substring( `${bot.prefix}${data.input.cmd} ${args[0]} ${args[1]} `.length );
                rvt.timeAdded = true;

                if (time.ms <= 0) {
                    muteData.end = null;
                    s3(result, time);
                } else
                if (time.ms < 10000) {
                    OBUtil.err('Be reasonable.', {m:m});
                } else
                if (time.ms > 604800000) {
                    OBUtil.err('Time limit cannot exceed 7 days.', {m:m});
                } else {
                    muteData.end = now + time.ms;
                    s3(result, time);
                }
            }
        }

        function s3(result, timeData) {
            log('s3');
            let isUpdate = false;
            if (rvt.reasonText.length > 0) rvt.reasonAdded = true;

            log('mute: made it here');

            OBUtil.getProfile(result.id, true).then(profile => {
                if(!profile.edata.mute) {
                    profile.edata.mute = muteData;
                } else {
                    log_data.org_end = profile.edata.mute.end;

                    if(!rvt.timeAdded) {
                        const embed = OBUtil.err('That user has already been muted.', bot)
                            .setDescription('If you\'d like to change the time limit, please specify.');
    
                        m.channel.send({embed: embed}).then(bm => OBUtil.afterSend(bm, m.author.id));
                        return;
                    } else
                    if(muteData.end === profile.edata.mute.end) {
                        OBUtil.err('New time limit is no different to the existing time limit.', bot, {m:m});
                        return;
                    } else {
                        profile.edata.mute.end = muteData.end;
                        isUpdate = true;
                    }
                }

                if(!profile.edata.record) profile.edata.record = [];

                log('mute: made it here');

                const entry = new RecordEntry()
                    .setMod(m.author.id)
                    .setURL(m.url)
                    .setAction('mute')
                    .setReason(m.author, (rvt.reasonAdded) ? rvt.reasonText : 'No reason provided.');

                log('mute: made it here');

                if(isUpdate) {
                    entry.setActionType('update')
                        .setParent(m.author, profile.edata.mute.caseID);

                    if(muteData.end !== null) {
                        entry.setDetails(m.author, `Mute updated to ${timeData.string}.`);
                    } else {
                        entry.setDetails(m.author, 'Mute updated as permanent.');
                    }
                } else {
                    entry.setActionType('add');

                    if(muteData.end !== null) {
                        entry.setDetails(m.author, `Mute set for ${timeData.string}.`);
                    } else {
                        entry.setDetails(m.author, 'Mute set as permanent.');
                    }
                }

                log('mute: made it here');

                profile.edata.record.push(entry.raw);

                log(util.inspect(Memory.mutes));

                log(util.inspect(profile));

                if(muteData.end !== null) {
                    if(Memory.mutes.length === 0) {
                        if(muteData.end < bot.exitTime.getTime()) {
                            Memory.mutes.push({
                                id: profile.id,
                                time: bot.setTimeout(() => {
                                    OBUtil.unmuter(profile.id);
                                }, muteData.end - now)
                            });

                            log(util.inspect(Memory.mutes));
                        }
                    } else {
                        log('before loop');
                        for(let i = 0; i < Memory.mutes.length; i++) {
                            log(`loop ${i}`);
                            if(Memory.mutes[i].id === profile.id) {
                                bot.clearTimeout(Memory.mutes[i].time);

                                if(muteData.end < bot.exitTime.getTime()) {
                                    log('new mute exp');
                                    Memory.mutes[i].time = bot.setTimeout(() => {
                                        OBUtil.unmuter(profile.id);
                                    }, muteData.end - now);

                                    log(util.inspect(Memory.mutes));
                                } else {
                                    log('new mute exp is too far from now, removing from cache');
                                    Memory.mutes.splice(i, 1);

                                    log(util.inspect(Memory.mutes));
                                }
                                break;
                            } else
                            if(i+1 >= Memory.mutes.length) {
                                if(muteData.end < bot.exitTime.getTime()) {
                                    Memory.mutes.push({
                                        id: profile.id,
                                        time: bot.setTimeout(() => {
                                            OBUtil.unmuter(profile.id);
                                        }, muteData.end - now)
                                    });

                                    log(util.inspect(Memory.mutes));
                                }
                            }
                        }
                    }
                }

                OBUtil.updateProfile(profile).then(() => {
                    const logInfo = () => {
                        const embed = new djs.MessageEmbed()
                            .setColor(bot.cfg.embed.okay);

                        if (isUpdate) {
                            embed.setAuthor('Mute updated.', Assets.getEmoji('ICO_okay').url);
                            if (muteData.end === null) {
                                embed.setDescription(`${result.mention} will now be muted until hell freezes over.`, Assets.getEmoji('ICO_okay').url);
                            } else {
                                embed.setDescription(`${result.mention} will now be muted for ${timeData.string}.`, Assets.getEmoji('ICO_okay').url);  
                            }
                        } else {
                            embed.setAuthor('User muted.', Assets.getEmoji('ICO_okay').url);

                            if (muteData.end === null) {
                                embed.setDescription(`${result.mention} has been muted until hell freezes over.`, Assets.getEmoji('ICO_okay').url);
                            } else {
                                embed.setDescription(`${result.mention} has been muted for ${timeData.string}.`, Assets.getEmoji('ICO_okay').url); 
                            }
                        }

                        if(rvt.reasonAdded) {
                            embed.addField('Reason', rvt.reasonText);
                        } else {
                            embed.addField('Reason', `No reason provided. \n(Please use the \`${bot.prefix}editrecord\` command.)`);
                        }

                        m.channel.stopTyping(true);

                        m.channel.send({embed: embed});//.then(bm => OBUtil.afterSend(bm, m.author.id));

                        const embed2 = new djs.MessageEmbed()
                            .setColor(bot.cfg.embed.default);

                        const logEntry = new LogEntry({channel: 'moderation'})
                            .setColor(bot.cfg.embed.default)
                            .setIcon(Assets.getEmoji('ICO_mute').url)
                            .addSection('Member Muted', result.target)
                            .addSection('Moderator Responsible', m.author)
                            .addSection('Command Location', m);

                        if(result.type !== 'id') {
                            logEntry.setThumbnail(((result.type === 'user') ? result.target : result.target.user).displayAvatarURL({format:'png'}));
                        }

                        if(rvt.reasonAdded) {
                            logEntry.setHeader(`Reason: ${rvt.reasonText}`);
                        } else {
                            logEntry.setHeader('No reason provided.');
                        }

                        if(isUpdate) {
                            logEntry.setTitle('Member Mute Updated', 'Member Mute Update Report');

                            if(log_data.org_end === null) {
                                logEntry.addSection('Old Expiration Date', 'Never.');
                            } else {
                                logEntry.addSection('Old Expiration Date', new Date(log_data.org_end));
                            }

                            if(muteData.end === null) {
                                logEntry.addSection('New Expiration Date', 'Never.');
                            } else {
                                logEntry.addSection('New Expiration Date', new Date(muteData.end));
                            }
                        } else {
                            logEntry.setTitle('Member Muted', 'Member Mute Report');

                            if(muteData.end === null) {
                                logEntry.addSection('Expiration Date', 'Never.');
                            } else {
                                logEntry.addSection('Expiration Date', new Date(muteData.end));
                            }
                        }

                        logEntry.submit();
                    };

                    if(result.type === 'member') {
                        result.target.roles.add(bot.cfg.roles.muted, `Member muted for ${timeData.string} by ${m.author.tag}`).then(() => {
                            result.target.voice.kick(`Member muted for ${timeData.string} by ${m.author.tag}`).then(() => {
                                logInfo();
                            }).catch(err => {
                                OBUtil.err(err, {m:m});
                                logInfo();
                            });
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
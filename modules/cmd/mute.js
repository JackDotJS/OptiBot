const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const timeago = require("timeago.js");
const Command = require(path.resolve(`./modules/core/command.js`));

const setup = (bot) => { 
    return new Command(bot, {
        name: path.parse(__filename).name,
        aliases: ['silence', 'gag'],
        short_desc: `Mute a user.`,
        long_desc: `Stops a user from being able to talk or send messages in text channels. Time limit is optional, and will default to 1 hour if not specified. You can also specify the time measure in (m)inutes, (h)ours, and (d)ays. The maximum time limit is 7 days, but can be set to infinity by using 0. Additionally, you can adjust time limits for users by simply running this command again with the desired time.\n\n**Note that this is not an end-all punishment for every user. It is still very much possible to get around server mutes with the right resources.**`,
        args: `<discord member> [time | reason] [reason]`,
        authlvl: 2,
        flags: ['NO_DM', 'LITE'],
        run: func
    });
}


const func = (m, args, data) => {
    const bot = data.bot;
    const log = data.log;

    if(!args[0]) {
        data.cmd.noArgs(m);
    } else {
        let now = new Date().getTime();
        let muteData = {
            caseID: now,
            end: now + (1000 * 60 * 60), // 1 hour default
        }
        let log_data = {
            org_end: null,
        }
        let rvt = {
            timeAdded: false,
            reasonText: m.content.substring( `${bot.prefix}${path.parse(__filename).name} ${args[0]} `.length ),
            reasonAdded: false,
        }

        bot.util.target(m, args[0], bot, {type: 0, member:data.member}).then((result) => {
            if (!result) {
                bot.util.err('You must specify a valid user.', bot, {m:m})
            } else
            if (['notfound', 'id'].includes(result.type)) {
                bot.util.err('Unable to find a user.', bot, {m:m})
            } else 
            if (result.id === m.author.id) {
                bot.util.err('Nice try.', bot, {m:m})
            } else
            if (result.id === bot.user.id) {
                bot.util.err(`You have no power here.`, bot, {m:m})
            } else 
            if (bot.getAuthlvl(result.target) > 0) {
                bot.util.err(`That user is too powerful to be muted.`, bot, {m:m})
            } else {
                s2(result);
            }
        });

        function s2(result) {
            log('s2')
            if(!args[1]) {
                if(rvt.reasonText.length > 0) rvt.reasonAdded = true;
                s3(result);
            } else {
                let number = parseInt(args[1]);
                let measure = 'h';

                if (isNaN(args[1])) {
                    let num_split = args[1].split(/\D/, 1);
                    log(num_split);
                    if (isNaN(num_split[0]) || num_split[0].length === 0) {
                        if(rvt.reasonText.length > 0) rvt.reasonAdded = true;
                        s3(result); // invalid time limit, assuming rest of input is part of the reason
                        return;
                    } else {
                        number = Math.round(parseInt(num_split[0]));
                        let new_measure = args[1].substring(num_split[0].length).replace(/\./g, "").toLowerCase();

                        if (new_measure.length === 1) {
                            measure = new_measure;
                        }
                    }
                }

                rvt.reasonText = m.content.substring( `${bot.prefix}${path.parse(__filename).name} ${args[0]} ${args[1]} `.length )
                if(rvt.reasonText.length > 0) rvt.reasonAdded = true;
                rvt.timeAdded = true;


                if (number <= 0) {
                    muteData.end = null;
                    s3(result);
                } else {
                    if (measure === 's') {
                        if (number < 5) {
                            bot.util.err(`Be reasonable.`, bot, {m:m});
                        } else
                        if (number > 604800) {
                            bot.util.err(`Time limit cannot exceed 7 days.`, bot, {m:m})
                        } else {
                            muteData.end = now + (1000*number);
                            s3(result);
                        }
                    } else
                    if (measure === 'm') {
                        if (number < 1) {
                            bot.util.err(`Time limit must be greater than 1 minute.`, bot, {m:m});
                        } else
                        if (number > 10080) {
                            bot.util.err(`Time limit cannot exceed 7 days.`, bot, {m:m})
                        } else {
                            muteData.end = now + (1000*60*number);
                            s3(result);
                        }
                    } else
                    if (measure === 'h') {
                        if (number < 1) {
                            bot.util.err(`Be reasonable.`, bot, {m:m});
                        } else
                        if (number > 168) {
                            bot.util.err(`Time limit cannot exceed 7 days.`, bot, {m:m})
                        } else {
                            muteData.end = now + (1000*60*60*number);
                            s3(result);
                        }
                        
                    } else
                    if (measure === 'd') {
                        if (number < 1) {
                            bot.util.err(`Be reasonable.`, bot, {m:m});
                        } else
                        if (number > 7) {
                            bot.util.err(`Time limit cannot exceed 7 days.`, bot, {m:m})
                        } else {
                            muteData.end = now + (1000*60*60*24*number);
                            s3(result);
                        }
                    } else {
                        bot.util.err(`Invalid time format. ("${measure}")`, bot, {m:m})
                    }
                }
            }
        }

        function s3(result) {
            log('s3')
            let isUpdate = false;

            bot.getProfile(result.id, true).then(profile => {
                if(!profile.data.essential.mute) {
                    profile.data.essential.mute = muteData;
                } else {
                    log_data.org_end = profile.data.essential.mute.end;

                    if(!rvt.timeAdded) {
                        let embed = bot.util.err('That user has already been muted.', bot)
                        .setDescription(`If you'd like to change the time limit, please specify.`)
    
                        m.channel.send({embed: embed}).then(bm => bot.util.responder(m.author.id, bm, bot));
                        return;
                    } else
                    if(muteData.end === profile.data.essential.mute.end) {
                        bot.util.err('New time limit is no different to the existing time limit.', bot, {m:m});
                        return;
                    } else {
                        profile.data.essential.mute.end = muteData.end;
                        isUpdate = true;
                    }
                }

                if(!profile.data.essential.record) profile.data.essential.record = [];

                let remaining = muteData.end - now;
                let minutes = Math.round(remaining/1000/60)
                let hours = Math.round(remaining/(1000*60*60))
                let days = Math.round(remaining/(1000*60*60*24))

                if (minutes < 60) {
                    time_remaining = `${minutes} minute${(minutes !== 1) ? "s" : ""}`;
                } else
                if (hours < 24) {
                    time_remaining = `${hours} hour${(hours !== 1) ? "s" : ""}`;
                } else {
                    time_remaining = `${days} day${(days !== 1) ? "s" : ""}`;
                }

                let entry = new bot.util.RecordEntry()
                .setDate(muteData.caseID)
                .setMod(m.author.id)
                .setURL(m.url)
                .setAction('mute')
                .setReason((rvt.reasonAdded) ? rvt.reasonText : `No reason provided.`)

                if(isUpdate) {
                    entry.setActionType('edit')
                    .setParent(profile.data.essential.mute.caseID)

                    if(muteData.end !== null) {
                        entry.setDetails(`Mute updated to ${time_remaining}.`)
                    } else {
                        entry.setDetails(`Mute updated as permanent.`)
                    }
                } else {
                    entry.setActionType('add')

                    if(muteData.end !== null) {
                        entry.setDetails(`Mute set for ${time_remaining}.`)
                    } else {
                        entry.setDetails(`Mute set as permanent.`)
                    }
                }

                profile.data.essential.record.push(entry.data);

                if(muteData.end !== null) {
                    if(bot.memory.mutes.length === 0) {
                        if(muteData.end < bot.exitTime.getTime()) {
                            bot.memory.mutes.push({
                                userid: profile.id,
                                time: muteData.end
                            });

                            log(bot.memory.mutes);
                        }
                    } else {
                        log('before loop');
                        for(let i in bot.memory.mutes) {
                            log(`loop ${i}`);
                            if(bot.memory.mutes[i].userid === profile.id) {
                                if(muteData.end < bot.exitTime.getTime()) {
                                    log('new mute exp')
                                    bot.memory.mutes[i].time = muteData.end

                                    log(bot.memory.mutes);
                                } else {
                                    log('new mute exp is too far from now, removing from cache')
                                    bot.memory.mutes.splice(i, 1);

                                    log(bot.memory.mutes);
                                }
                                break;
                            } else
                            if(i+1 >= bot.memory.mutes.length) {
                                if(muteData.end < bot.exitTime.getTime()) {
                                    bot.memory.mutes.push({
                                        userid: profile.id,
                                        time: muteData.end
                                    })

                                    log(bot.memory.mutes);
                                }
                            }
                        }
                    }
                }

                bot.updateProfile(result.id, profile).then(() => {
                    let logInfo = () => {
                        let embed = new djs.MessageEmbed()
                        .setColor(bot.cfg.embed.okay)

                        if (isUpdate) {
                            embed.setAuthor(`Mute updated.`, bot.icons.find('ICO_okay'));
                            if (muteData.end === null) {
                                embed.setDescription(`${result.mention} will now be muted until hell freezes over.`, bot.icons.find('ICO_okay'));
                            } else {
                                embed.setDescription(`${result.mention} will now be muted for ${time_remaining}.`, bot.icons.find('ICO_okay'));  
                            }
                        } else {
                            embed.setAuthor(`User muted.`, bot.icons.find('ICO_okay'));

                            if (muteData.end === null) {
                                embed.setDescription(`${result.mention} has been muted until hell freezes over.`, bot.icons.find('ICO_okay'));
                            } else {
                                embed.setDescription(`${result.mention} has been muted for ${time_remaining}.`, bot.icons.find('ICO_okay')); 
                            }
                        }

                        if(rvt.reasonAdded) {
                            embed.addField(`Reason`, rvt.reasonText)
                        } else {
                            embed.addField(`Reason`, `No reason provided. \n(Please use the \`${bot.prefix}addnote\` command.)`)
                        }

                        m.channel.send({embed: embed}).then(bm => bot.util.responder(m.author.id, bm, bot));

                        let embed2 = new djs.MessageEmbed()
                        .setColor(bot.cfg.embed.default)

                        let logEntry = new bot.util.LogEntry(bot)
                        .setColor(bot.cfg.embed.default)
                        .setIcon(bot.icons.find('ICO_mute'))
                        .addSection(`Member Muted`, result.target)
                        .addSection(`Moderator Responsible`, m.author);

                        if(result.type !== 'id') {
                            logEntry.setThumbnail(result.target.displayAvatarURL({format:'png'}))
                        }

                        if(rvt.reasonAdded) {
                            logEntry.setHeader(`Reason: ${rvt.reasonText}`)
                        } else {
                            logEntry.setHeader(`No reason provided.`)
                        }

                        if(isUpdate) {
                            logEntry.setTitle(`Member Mute Updated`, `Member Mute Update Report`)
                            .addSection(`Old Expiration Date`, `${new Date(log_data.org_end).toUTCString()} \n(${timeago.format(log_data.org_end)})`)
                            .addSection(`New Expiration Date`, `${new Date(muteData.end).toUTCString()} \n(${timeago.format(muteData.end)})`);
                        } else {
                            logEntry.setTitle(`Member Muted`, `Member Mute Report`);
                        }

                        logEntry.submit("moderation");
                    }

                    if(result.type === 'member') {
                        result.roles.add(bot.cfg.roles.muted, `Member muted for ${time_remaining} by ${m.author.tag}`).then(() => {
                            logInfo();
                        }).catch(err => bot.util.err(err, bot, {m:m}));
                    } else {
                        logInfo();
                    }
                }).catch(err => bot.util.err(err, bot, {m:m}))
            });
        }
    }
}

module.exports = setup;
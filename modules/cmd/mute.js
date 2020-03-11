const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const timeago = require("timeago.js");
const Command = require(path.resolve(`./modules/core/command.js`));
const erm = require(path.resolve(`./modules/util/simpleError.js`));
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));
const targetUser = require(path.resolve(`./modules/util/targetUser.js`));
const unlockEgg = require(path.resolve(`./modules/util/unlockEgg.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    aliases: ['silence', 'gag', 'silencium'],
    short_desc: `Mute a user.`,
    long_desc: `Stops a user from being able to talk or send messages in text channels. Time limit is optional, and will default to 1 hour if not specified. You can also specify the time measure in (m)inutes, (h)ours, and (d)ays. The maximum time limit is 7 days, but can be set to infinity by using 0. Additionally, you can adjust time limits for users by simply running this command again with the desired time.`,
    usage: `<discord user> [time limit[time measurement?]] [reason]`,
    authlevel: 1,
    tags: ['NO_DM', 'LITE'],

    run: (m, args, data) => {
        if(!args[0]) {
            data.cmd.noArgs(m);
        } else {
            let now = new Date().getTime();
            let muteData = {
                start: now,
                init_end: now + (1000 * 60 * 60), // 1 hour default
                cur_end: null,
                executor: m.author.id,
                reason: null,
                update: null
            }
            let log_data = {
                org_end: null,
            }
            let rvt = {
                timeAdded: false,
                reasonText: m.content.substring( `${bot.prefix}${path.parse(__filename).name} ${args[0]} `.length ),
                reasonAdded: false,
            }

            targetUser(m, args[0], bot, data).then((result) => {
                if (!result) {
                    erm('You must specify a valid user.', bot, {m:m})
                } else
                if (result.type === 'notfound' || result.type === 'id') {
                    erm('Unable to find a user.', bot, {m:m})
                } else
                if (result.target.user.id === m.author.id) {
                    erm('Nice try.', bot, {m:m})
                } else
                if (result.target.user.id === bot.user.id) {
                    erm(`You have no power here.`, bot, {m:m})
                } else 
                if (result.target.permissions.has("KICK_MEMBERS", true) || result.target.roles.cache.has(bot.cfg.roles.jrmod)) {
                    erm(`That user is too powerful to be muted.`, bot, {m:m})
                } else {
                    s2(result.target);
                }
            });

            function s2(target) {
                if(!args[1]) {
                    if(rvt.reasonText.length > 0) rvt.reasonAdded = true;
                    s3(target);
                } else {
                    let number = parseInt(args[1]);
                    let measure = 'h';

                    if (isNaN(args[1])) {
                        let num_split = args[1].split(/\D/, 1);
                        log(num_split);
                        if (isNaN(num_split[0]) || num_split[0].length === 0) {
                            if(rvt.reasonText.length > 0) rvt.reasonAdded = true;
                            s3(target); // invalid time limit, assuming rest of input is part of the reason
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
                        muteData.init_end = null;
                        s3(target);
                    } else {
                        if (measure === 'm') {
                            if (number < 1) {
                                erm(`Time limit must be greater than 1 minute.`, bot, {m:m});
                            } else
                            if (number > 10080) {
                                erm(`Time limit cannot exceed 7 days.`, bot, {m:m})
                            } else {
                                muteData.init_end = now + (1000*60*number);
                                s3(target);
                            }
                        } else
                        if (measure === 'h') {
                            if (number < 1) {
                                erm(`Be reasonable.`, bot, {m:m});
                            } else
                            if (number > 168) {
                                erm(`Time limit cannot exceed 7 days.`, bot, {m:m})
                            } else {
                                muteData.init_end = now + (1000*60*60*number);
                                s3(target);
                            }
                            
                        } else
                        if (measure === 'd') {
                            if (number < 1) {
                                erm(`Be reasonable.`, bot, {m:m});
                            } else
                            if (number > 7) {
                                erm(`Time limit cannot exceed 7 days.`, bot, {m:m})
                            } else {
                                muteData.init_end = now + (1000*60*60*24*number);
                                s3(target);
                            }
                            
                        }
                    }
                }
            }

            function s3(target) {
                let updateData = null;

                muteData.cur_end = muteData.init_end;
                muteData.reason = rvt.reasonText;

                bot.getProfile(target.user.id, true).then(profile => {
                    if(!profile.data.mute) {
                        profile.data.mute = muteData;
                    } else {
                        log_data.org_end = profile.data.mute.cur_end;

                        if(muteData.cur_end === profile.data.mute.cur_end) {
                            erm('New time limit is no different to the existing time limit.', bot, {m:m})
                            return;
                        }

                        muteData.start = profile.data.mute.start;
                        muteData.executor = profile.data.mute.executor;
                        muteData.init_end = profile.data.mute.init_end;
                        muteData.update = profile.data.mute.update;

                        if(muteData.update === null) muteData.update = [];

                        updateData = {
                            executor: m.author.id,
                            new_end: muteData.cur_end,
                            reason: muteData.reason
                        }
                        muteData.update.push(updateData);

                        muteData.reason = profile.data.mute.reason;

                        profile.data.mute = muteData;

                        if(!rvt.timeAdded) {
                            let embed = erm('That user has already been muted.', bot)
                            .setDescription(`If you'd like to change the time limit, please specify.`)
        
                            m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot));
                            return;
                        }
                    }

                    if(!profile.data.record) profile.data.record = [];

                    let remaining = muteData.cur_end - now;
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

                    if(updateData) {
                        profile.data.record.push({
                            date: now,
                            moderator: muteData.executor,
                            url: m.url,
                            action: 'Mute Time Limit Change',
                            reason: (updateData.reason === null) ? `No reason provided.` : updateData.reason,
                            details: `Mute updated to last for ${time_remaining}.`
                        });
                    } else {
                        profile.data.record.push({
                            date: muteData.start,
                            moderator: muteData.executor,
                            url: m.url,
                            action: 'Mute',
                            reason: (muteData.reason === null) ? `No reason provided.` : muteData.reason,
                            details: `Mute set for ${time_remaining}.`
                        });
                    }

                    if(bot.memory.mutes.length === 0) {
                        if(new Date(muteData.cur_end).getTime() < bot.exitTime.getTime()) {
                            bot.memory.mutes.push({
                                userid: profile.userid,
                                time: muteData.cur_end
                            })

                            log(bot.memory.mutes);
                        }
                    } else {
                        log('before loop');
                        for(let i in bot.memory.mutes) {
                            log(`loop ${i}`);
                            if(bot.memory.mutes[i].userid === profile.userid) {
                                if(new Date(muteData.cur_end).getTime() < bot.exitTime.getTime()) {
                                    log('new mute exp')
                                    bot.memory.mutes[i].time = muteData.cur_end

                                    log(bot.memory.mutes);
                                } else {
                                    log('new mute exp is too far from now, removing from cache')
                                    bot.memory.mutes.splice(i, 1);

                                    log(bot.memory.mutes);
                                }
                                break;
                            } else
                            if(i+1 >= bot.memory.mutes.length) {
                                if(new Date(muteData.cur_end).getTime() < bot.exitTime.getTime()) {
                                    bot.memory.mutes.push({
                                        userid: profile.userid,
                                        time: muteData.cur_end
                                    })

                                    log(bot.memory.mutes);
                                }
                            }
                        }
                    }

                    bot.updateProfile(target.user.id, profile).then(() => {
                        target.roles.add(bot.cfg.roles.muted, `Member muted for ${time_remaining} by ${m.author.tag}`).then(() => {
                            let embed = new djs.MessageEmbed()
                            .setColor(bot.cfg.embed.okay)

                            if (updateData !== null) {
                                embed.setAuthor(`Mute updated.`, bot.icons.find('ICO_okay'));
                                if (muteData.cur_end === null) {
                                    embed.setDescription(`${target.user} will now be muted until hell freezes over.`, bot.icons.find('ICO_okay'));
                                } else {
                                    embed.setDescription(`${target.user} will now be muted for ${time_remaining}.`, bot.icons.find('ICO_okay'));  
                                }
                            } else {
                                //if(cfg.statistics.enabled) memory.stats.users.mutes++;
                                embed.setAuthor(`User muted.`, bot.icons.find('ICO_okay'));

                                if (muteData.cur_end === null) {
                                    embed.setDescription(`${target.user} has been muted until hell freezes over.`, bot.icons.find('ICO_okay'));
                                } else {
                                    embed.setDescription(`${target.user} has been muted for ${time_remaining}.`, bot.icons.find('ICO_okay')); 
                                }
                            }

                            if(rvt.reasonAdded) {
                                embed.addField(`Reason`, (updateData !== null) ? updateData.reason : muteData.reason)
                            } else {
                                embed.addField(`Reason`, `No reason provided. \n(Please use the \`${bot.prefix}addrecord\` command.)`)
                            }

                            m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot));

                            let embed2 = new djs.MessageEmbed()
                            .setColor(bot.cfg.embed.default)

                            if(updateData !== null) {
                                embed2.setAuthor('Member Mute Updated', bot.icons.find('ICO_mute'))
                                .setTitle((rvt.reasonAdded) ? "Reason: "+updateData.reason : "No reason provided.")
                                .setThumbnail(target.user.displayAvatarURL)
                                .setDescription(`${target.user} | ${target.user.tag} \n\`\`\`yaml\n${target.user.id}\`\`\``)
                                .addField('Moderator Responsible', `${m.author} | ${m.author.tag} \n\`\`\`yaml\n${m.author.id}\`\`\``)
                                .addField(`Old Expiration Date`, `${new Date(log_data.org_end).toUTCString()} \n(${timeago.format(log_data.org_end)})`)
                                .addField(`New Expiration Date`, `${new Date(muteData.cur_end).toUTCString()} \n(${timeago.format(muteData.cur_end)})`)
                                .setFooter(`Event logged on ${new Date().toUTCString()}`)
                                .setTimestamp(new Date())
                            } else {
                                embed2.setAuthor('Member Muted', bot.icons.find('ICO_mute'))
                                .setTitle((rvt.reasonAdded) ? "Reason: "+muteData.reason : "No reason provided.")
                                .setThumbnail(target.user.displayAvatarURL)
                                .setDescription(`${target.user} | ${target.user.tag} \n\`\`\`yaml\n${target.user.id}\`\`\``)
                                .addField('Moderator Responsible', `${m.author} | ${m.author.tag} \n\`\`\`yaml\n${m.author.id}\`\`\``)
                                .addField('Expiration Date', `${new Date(muteData.cur_end).toUTCString()} \n(${timeago.format(muteData.cur_end)})`)
                                .setFooter(`Event logged on ${new Date().toUTCString()}`)
                                .setTimestamp(new Date())
                            }

                            bot.guilds.cache.get(bot.cfg.logging.guild).channels.cache.get(bot.cfg.logging.channel).send({embed: embed2});
                        }).catch(err => erm(err, bot, {m:m}))
                    }).catch(err => erm(err, bot, {m:m}))
                });
            }
        }
    }
})}
const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const timeago = require("timeago.js");
const Command = require(path.resolve(`./modules/core/command.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    aliases: ['whois'],
    short_desc: `Displays detailed information about a specified user.`,
    usage: `<target:discord user> [opt:raw]`,
    authlvl: -1,
    tags: ['DM_OPTIONAL', 'BOT_CHANNEL_ONLY'],

    run: (m, args, data) => {
        if(!args[0]) {
            data.cmd.noArgs(m);
        } else {
            bot.util.target(m, args[0], bot, {type:0, member:data.member}).then((result) => {
                log(util.inspect(result));
                if(!result) {
                    bot.util.err('You must specify a valid user @mention, ID, or target shortcut (^)', bot, {m:m});
                } else 
                if(result.type === 'notfound') {
                    let embed = bot.util.err('Unable to find a user.', bot)
                    .setDescription(`If that person is no longer in the server, and they have no OptiBot Profile, I can't get any information about them. Sorry!`)
        
                    m.channel.send({embed: embed}).then(bm => bot.util.responder(m.author.id, bm, bot));
                } else 
                if (result.type === 'id') {
                    bot.getProfile(result.target, false).then(profile => {
                        if(!profile) {
                            let embed = bot.util.err('Unable to find a user.', bot)
                            .setDescription(`If that person is no longer in the server, and they have no OptiBot Profile, I can't get any information about them. Sorry!`)
                
                            m.channel.send({embed: embed}).then(bm => bot.util.responder(m.author.id, bm, bot))
                        } else 
                        if(args[1] && args[1] === 'raw') {
                            m.channel.send(`\`\`\`javascript\n${util.inspect(profile)}\`\`\``).then(bm => bot.util.responder(m.author.id, bm, bot))
                        } else {
                            let ls = new Date(profile.data.essential.lastSeen);

                            let embed = new djs.MessageEmbed()
                            .setAuthor(`That is...`, bot.icons.find('ICO_user'))
                            .setColor(bot.cfg.embed.default)
                            .setTitle(`${profile.userid}`)
                            .setDescription(`Unfortunately, this user is no longer in the server. The following is leftover OptiBot Profile data, which will be deleted ${timeago.format(profile.data.essential.lastSeen + (1000 * 60 * 60 * 24 * bot.cfg.profiles.expiration))}. (approximate)`)
                            .addField('Last Seen Date', `${ls.getUTCDate()}/${ls.getUTCMonth()+1}/${ls.getUTCFullYear()}\n(DD/MM/YYYY)`)

                            m.channel.send({embed: embed}).then(bm => bot.util.responder(m.author.id, bm, bot))
                        }
                    }).catch(err => bot.util.err(err, bot, {m:m}));
                } else 
                if(result.target.user.id === bot.user.id) {
                    unlockEgg(1, m, bot);
                } else {
                    bot.getProfile(result.target.user.id, false).then(profile => {
                        if(args[1] && args[1] === 'raw') {
                            m.channel.send(`\`\`\`javascript\n${util.inspect(profile)}\`\`\``).then(bm => bot.util.responder(m.author.id, bm, bot))
                        } else {
                            let mem = result.target;
                            let embed = new djs.MessageEmbed()
                            .setAuthor((mem.user.id === m.author.id) ? "You are..." : "That is...", bot.icons.find('ICO_user'))
                            .setColor(bot.cfg.embed.default)
                            .setTitle(`${mem.user.tag} ${(mem.user.bot) ? "🤖" : ""}`)
                            .setThumbnail(mem.user.displayAvatarURL({ dynamic: true, size: 64 }))
            
                            let presence = []
            
                            if(mem.user.presence.status === 'online') { 
                                presence.push(`**Status:** \\🟢 Online`)
                            } else
                            if(mem.user.presence.status === 'idle') { 
                                presence.push(`**Status:** \\🟡 Away`)
                            } else
                            if(mem.user.presence.status === 'dnd') {
                                presence.push(`**Status:** \\🔴 Do Not Disturb`)
                            } else {
                                presence.push(`**Status:** \\⚫ Offline/Invisible`)
                            }
            
                            if(mem.user.presence.clientStatus !== null) {
                                let msg = [];
                                let emoji = '';
                                let client = mem.user.presence.clientStatus;
            
                                if(client.desktop) {
                                    emoji = '🖥️';
                                    msg.push('desktop');
                                }
            
                                if(client.mobile) {
                                    emoji = '📱';
                                    msg.push('mobile');
                                }
            
                                if(client.web) {
                                    emoji = '🌐';
                                    msg.push('a web browser');
                                }
            
                                if(msg.length === 1) {
                                    presence.push(`**Device(s):** Discord on ${msg[0]}`)
                                } else
                                if(msg.length === 2) {
                                    presence.push(`**Device(s):** Discord on ${msg[0]} and ${msg[1]}`)
                                } else
                                if(msg.length === 3) {
                                    presence.push(`**Device(s):** Discord on ${msg[0]}, ${msg[1]}, and ${msg[2]}.`)
                                }
                            }
            
                            if(mem.user.presence.activities.length > 0 && mem.user.presence.activities[0].type !== null) {
                                let status = mem.user.presence.activities[0];

                                if(status.type === 'CUSTOM_STATUS') {
                                    let emoji = ``;
                                    let text = ``;

                                    if(status.emoji) {
                                        if(!status.emoji.id) {
                                            emoji = `\\${status.emoji.name} `;
                                        } else {
                                            emoji = `:${status.emoji.name}: `;
                                        }
                                    }

                                    if(status.state) {
                                        text = status.state;
                                    }

                                    if(emoji.length > 0 || text.length > 0) {
                                        presence.push(`**Custom Status:** ${emoji}${text}`)
                                    }
                                } else {
                                    let doing = '**Activity:** Playing';

                                    if(status.type === 'STREAMING') {
                                        doing = '**Activity:** Streaming'
                                    } else
                                    if(status.type === 'LISTENING') {
                                        doing = '**Activity:** Listening to'
                                    } else
                                    if(status.type === 'WATCHING') {
                                        doing = '**Activity:** Watching'
                                    }

                                    if(status.url) {
                                        presence.push(`[${doing} ${status.name}](${status.url})`)
                                    } else {
                                        presence.push(`${doing} ${status.name}`)
                                    }
                                }
                            }
            
                            embed.setDescription(`${(profile && profile.data.quote) ? `> ${profile.data.quote}\n\n` : ''}${presence.join('\n')}`);
            
                            let roles = [];
                            let rolec = [...mem.roles.cache.values()];
                            rolec.sort((a, b) => a.calculatedPosition - b.calculatedPosition)
                            rolec.reverse().forEach((role) => {
                                log(role.calculatedPosition);
                                if(role.id !== mem.guild.id) {
                                    if(m.channel.type === 'dm' || m.guild.id !== bot.cfg.guilds.optifine) {
                                        roles.push(`\`@${role.name}\``);
                                    } else {
                                        roles.push(role.toString());
                                    }
                                }
                            });
            
                            let identity = [
                                `Mention: ${mem.toString()}`,
                                `User ID: \`\`\`yaml\n${mem.user.id}\`\`\``
                            ].join('\n');
            
                            embed.addField('Identification', identity)

                            if(roles.length > 0) {
                                embed.addField('Server Roles', roles.join(' '))
                            }

                            embed.addField('Account Creation Date', `${mem.user.createdAt.toUTCString()}\n(${timeago.format(mem.user.createdAt)})`, true)
            
                            if(mem.joinedAt !== null) {
                                embed.addField('Server Join Date', `${mem.joinedAt.toUTCString()}\n(${timeago.format(mem.joinedAt)})`, true)
                            }
            
                            if(profile) {
                                let added = 0;

                                if(profile.data.essential.mute) {
                                    if(typeof profile.data.essential.mute.end === 'null') {
                                        embed.addField(`Mute Expiration`, `Never. (Permanent Mute)`, true)
                                        added++;
                                    } else {
                                        embed.addField(`Mute Expiration`, `${new Date(profile.data.essential.mute.end).toUTCString()}\n(${timeago.format(profile.data.essential.mute.end)})`, true)
                                        added++;
                                    }
                                }

                                if(added > 0) {
                                    embed.setFooter(`This user has an OptiBot profile, which contains some additional custom data not normally provided by Discord.`)
                                }
                            }
            
                            m.channel.send({embed: embed}).then(bm => bot.util.responder(m.author.id, bm, bot))
                        }
                    }).catch(err => bot.util.err(err, bot, {m:m}));
                }
            }).catch(err => bot.util.err(err, bot, {m:m}));
        }
    }
})}
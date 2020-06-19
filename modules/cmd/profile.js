const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const timeago = require("timeago.js");
const Command = require(path.resolve(`./modules/core/command.js`));

const setup = (bot) => { 
    return new Command(bot, {
        name: path.parse(__filename).name,
        aliases: ['whois'],
        short_desc: `Displays detailed information about a specified user.`,
        args: `<discord member> [raw]`,
        authlvl: -1,
        flags: ['DM_OPTIONAL', 'BOT_CHANNEL_ONLY'],
        run: func
    });
}

const func = (m, args, data) => {
    const bot = data.bot;
    const log = data.log;

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
                .setDescription(`If this user ever existed, it seems any information about them has been lost to time.`)
    
                m.channel.send({embed: embed}).then(bm => bot.util.responder(m.author.id, bm, bot));
            } else 
            if (result.type === 'id') {
                bot.getProfile(result.target, false).then(profile => {
                    if(!profile) {
                        let embed = bot.util.err('Unable to find a user.', bot)
                        .setDescription(`If this user ever existed, it seems any information about them has been lost to time.`)
            
                        m.channel.send({embed: embed}).then(bm => bot.util.responder(m.author.id, bm, bot))
                    } else {
                        m.channel.send(`\`\`\`javascript\n${util.inspect(profile)}\`\`\``).then(bm => bot.util.responder(m.author.id, bm, bot))
                    }
                }).catch(err => bot.util.err(err, bot, {m:m}));
            } else {
                bot.getProfile(result.id, false).then(profile => {
                    if(args[1] && args[1] === 'raw') {
                        m.channel.send(`\`\`\`javascript\n${util.inspect(profile)}\`\`\``).then(bm => bot.util.responder(m.author.id, bm, bot))
                    } else {
                        let mem = null;
                        let user = null;

                        if(result.type === 'member') {
                            mem = result.target;
                            user = result.target.user;
                        } else
                        if(result.type === 'user') {
                            mem = null;
                            user = result.target;
                        }


                        let embed = new djs.MessageEmbed()
                        .setAuthor((user.id === m.author.id) ? "You are..." : "That is...", bot.icons.find('ICO_user'))
                        .setColor(bot.cfg.embed.default)
                        .setTitle(`${user.tag} ${(profile && profile.data.emoji) ? profile.data.emoji : ""}`)
                        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 64 }))
        
                        let presence = []
        
                        if(user.presence.status === 'online') { 
                            presence.push(`**Status:** \\🟢 Online`)
                        } else
                        if(user.presence.status === 'idle') { 
                            presence.push(`**Status:** \\🟡 Away`)
                        } else
                        if(user.presence.status === 'dnd') {
                            presence.push(`**Status:** \\🔴 Do Not Disturb`)
                        } else {
                            presence.push(`**Status:** \\⚫ Offline/Invisible`)
                        }
        
                        if(user.presence.clientStatus !== null) {
                            let msg = [];
                            let emoji = '';
                            let client = user.presence.clientStatus;
        
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
        
                        if(user.presence.activities.length > 0 && user.presence.activities[0].type !== null) {
                            let status = user.presence.activities[0];

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
        
                        let identity = [
                            `Mention: ${user.toString()}`,
                            `User ID: \`\`\`yaml\n${user.id}\`\`\``
                        ].join('\n');
        
                        embed.addField('Identification', identity)

                        if(mem !== null) {
                            let roles = [];
                            let rolec = [...mem.roles.cache.values()];
                            rolec.sort((a, b) => a.rawPosition - b.rawPosition)
                            rolec.reverse().forEach((role) => {
                                log(role.rawPosition);
                                if(role.id !== mem.guild.id) {
                                    if(m.channel.type === 'dm' || m.guild.id !== bot.cfg.guilds.optifine) {
                                        roles.push(`\`@${role.name}\``);
                                    } else {
                                        roles.push(role.toString());
                                    }
                                }
                            });

                            if(roles.length > 0) {
                                embed.addField('Server Roles', roles.join(' '))
                            }

                            if(mem.joinedAt !== null) {
                                embed.addField('Server Join Date', `${mem.joinedAt.toUTCString()}\n(${timeago.format(mem.joinedAt)})`, true)
                            }
                        }

                        embed.addField('Account Creation Date', `${user.createdAt.toUTCString()}\n(${timeago.format(user.createdAt)})`, true)
        
                        if(profile) {
                            if(profile.data.essential.mute) {
                                if(profile.data.essential.mute.end === null) {
                                    embed.addField(`Mute Expiration`, `Never. (Permanent Mute)`, true)
                                } else {
                                    embed.addField(`Mute Expiration`, `${new Date(profile.data.essential.mute.end).toUTCString()}\n(${timeago.format(profile.data.essential.mute.end)})`, true)
                                }
                            }
                        }

                        if(result.type === 'user') {
                            embed.setFooter(`This user may not be a member of this server.`)
                        }
        
                        m.channel.send({embed: embed}).then(bm => bot.util.responder(m.author.id, bm, bot))
                    }
                }).catch(err => bot.util.err(err, bot, {m:m}));
            }
        }).catch(err => bot.util.err(err, bot, {m:m}));
    }
}

module.exports = setup;
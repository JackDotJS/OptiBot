const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const timeago = require("timeago.js");
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    aliases: ['whois'],
    short_desc: `Displays detailed information about a specified user.`,
    args: `<discord member> [raw]`,
    authlvl: -1,
    flags: ['DM_OPTIONAL', 'BOT_CHANNEL_ONLY'],
    run: null
}

metadata.run = (m, args, data) => {
    if(!args[0]) {
        OBUtil.missingArgs(m, metadata);
    } else {
        OBUtil.parseTarget(m, 0, args[0], data.member).then((result) => {
            log(util.inspect(result));
            if(!result) {
                OBUtil.err('You must specify a valid user @mention, ID, or target shortcut (^)', {m:m});
            } else 
            if(result.type === 'notfound') {
                let embed = OBUtil.err('Unable to find a user.')
                .setDescription(`If this user ever existed, it seems any information about them has been lost to time.`)
    
                m.channel.send({embed: embed}).then(bm => OBUtil.afterSend(bm, m.author.id));
            } else 
            if (result.type === 'id') {
                OBUtil.getProfile(result.target, false).then(profile => {
                    if(!profile) {
                        let embed = OBUtil.err('Unable to find a user.')
                        .setDescription(`If this user ever existed, it seems any information about them has been lost to time.`)
            
                        m.channel.send({embed: embed}).then(bm => OBUtil.afterSend(bm, m.author.id))
                    } else {
                        m.channel.send(`\`\`\`javascript\n${util.inspect(profile)}\`\`\``).then(bm => OBUtil.afterSend(bm, m.author.id))
                    }
                }).catch(err => OBUtil.err(err, {m:m}));
            } else {
                OBUtil.getProfile(result.id, false).then(profile => {
                    if(args[1] && args[1] === 'raw') {
                        m.channel.send(`\`\`\`javascript\n${util.inspect(profile)}\`\`\``).then(bm => OBUtil.afterSend(bm, m.author.id))
                    } else {
                        let mem = null;
                        let user = null;

                        if(result.type === 'member') {
                            mem = result.target;
                            user = result.target.user;
                        } else
                        if(result.type === 'user') {
                            user = result.target;
                        }

                        let embed = new djs.MessageEmbed()
                        .setAuthor((user.id === m.author.id) ? "You are..." : "That is...", Assets.getEmoji('ICO_user').url)
                        .setColor(bot.cfg.embed.default)
                        .setTitle(`${user.tag} ${(profile && profile.ndata.emoji) ? profile.ndata.emoji : ""}`) // todo: add profile emoji command. (#166)
                        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 64, format: 'png' }))
        
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
        
                        embed.setDescription(`${(profile && profile.ndata.quote) ? `> ${profile.ndata.quote}\n\n` : ''}${presence.join('\n')}`);
        
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
                            if(profile.edata.mute) {
                                if(profile.edata.mute.end === null) {
                                    embed.addField(`Mute Expiration`, `Never. (Permanent Mute)`, true)
                                } else {
                                    embed.addField(`Mute Expiration`, `${new Date(profile.edata.mute.end).toUTCString()}\n(${timeago.format(profile.edata.mute.end)})`, true)
                                }
                            }
                        }

                        if(result.type === 'user') {
                            embed.setFooter(`This user may not be a member of this server.`)
                        }
        
                        m.channel.send({embed: embed}).then(bm => OBUtil.afterSend(bm, m.author.id))
                    }
                }).catch(err => OBUtil.err(err, {m:m}));
            }
        }).catch(err => OBUtil.err(err, {m:m}));
    }
}

module.exports = new Command(metadata);
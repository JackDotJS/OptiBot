const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const timeago = require("timeago.js");
const Command = require(path.resolve(`./modules/core/command.js`));
const erm = require(path.resolve(`./modules/util/simpleError.js`));
const targetUser = require(path.resolve(`./modules/util/targetUser.js`));
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));
const unlockEgg = require(path.resolve(`./modules/util/unlockEgg.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    aliases: ['whois'],
    short_desc: `Displays detailed information about a specified user.`,
    usage: `<discord user> ["raw"]`,
    authlevel: 0,
    tags: ['DM_OPTIONAL', 'BOT_CHANNEL_ONLY', 'INSTANT'],

    run: (m, args, data) => {
        if(!args[0]) {
            data.cmd.noArgs(m);
        } else {
            targetUser(m, args[0], bot, data).then((result) => {
                log(util.inspect(result));
                if(!result) {
                    erm('You must specify a valid user @mention, ID, or target shortcut (^)', bot, {m:m});
                } else 
                if(result.type === 'notfound') {
                    let embed = erm('Unable to find a user.', bot)
                    .setDescription(`If that person is no longer in the server, and they have no OptiBot Profile, I can't get any information about them. Sorry!`)
        
                    m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot));
                } else 
                if (result.type === 'id') {
                    bot.getProfile(result.target, false).then(profile => {
                        if(!profile) {
                            let embed = erm('Unable to find a user.', bot)
                            .setDescription(`If that person is no longer in the server, and they have no OptiBot Profile, I can't get any information about them. Sorry!`)
                
                            m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot))
                        } else 
                        if(args[1] && args[1] === 'raw') {
                            m.channel.send(`\`\`\`javascript\n${util.inspect(profile)}\`\`\``).then(bm => msgFinalizer(m.author.id, bm, bot))
                        } else {
                            let ls = new Date(profile.data.lastSeen);

                            let embed = new djs.MessageEmbed()
                            .setAuthor(`That is...`, bot.icons.find('ICO_user'))
                            .setColor(bot.cfg.embed.default)
                            .setTitle(`${profile.userid}`)
                            .setDescription(`Unfortunately, this user is no longer in the server. The following is leftover OptiBot Profile data, which will be deleted ${timeago.format(profile.data.lastSeen + (1000 * 60 * 60 * 24 * bot.cfg.profiles.expiration))}. (approximate)`)
                            .addField('Last Seen Date', `${ls.getUTCDate()}/${ls.getUTCMonth()+1}/${ls.getUTCFullYear()}\n(DD/MM/YYYY)`)

                            m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot))
                        }
                    }).catch(err => erm(err, bot, {m:m}));
                } else 
                if(result.target.user.id === bot.user.id) {
                    unlockEgg(1, m, bot);
                } else {
                    bot.getProfile(result.target.user.id, false).then(profile => {
                        if(args[1] && args[1] === 'raw') {
                            m.channel.send(`\`\`\`javascript\n${util.inspect(profile)}\`\`\``).then(bm => msgFinalizer(m.author.id, bm, bot))
                        } else {
                            let mem = result.target;
                            let embed = new djs.MessageEmbed()
                            .setAuthor((mem.user.id === m.author.id) ? "You are..." : "That is...", bot.icons.find('ICO_user'))
                            .setColor(bot.cfg.embed.default)
                            .setTitle(`${mem.user.tag} ${(mem.user.bot) ? "🤖" : ""}`)
                            .setThumbnail(mem.user.displayAvatarURL)
            
                            let presence = []
            
                            if(mem.user.presence.status === 'online') { 
                                presence.push(`🟢 Online`)
                            } else
                            if(mem.user.presence.status === 'idle') { 
                                presence.push(`🟠 Away`)
                            } else
                            if(mem.user.presence.status === 'dnd') {
                                presence.push(`🔴 Do Not Disturb`)
                            } else {
                                presence.push(`⚫ Offline (Invisible?)`)
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
                                    presence.push(`${emoji} Discord on ${msg[0]}.`)
                                } else
                                if(msg.length === 2) {
                                    presence.push(`🌐 Discord on ${msg[0]} and ${msg[1]}.`)
                                } else
                                if(msg.length === 3) {
                                    presence.push(`🌐 Discord on ${msg[0]}, ${msg[1]}, and ${msg[2]}.`)
                                }
                            }
            
                            if(mem.user.presence.game !== null) {
                                let game = mem.user.presence.game;
                                let doing = '🎮 Playing';
            
                                if(game.type === 1) {
                                    doing = '🔴 Streaming'
                                } else
                                if(game.type === 1) {
                                    doing = '🎧 Listening to'
                                } else
                                if(game.type === 1) {
                                    doing = '📺 Watching'
                                } else
            
                                presence.push(`${doing} "${game.name}" ${(game.url) ? "at "+game.url : ""}`)
                            }
            
                            embed.setDescription(`${(profile && profile.data.quote) ? `***\`"${profile.data.quote}"\`***\n\n` : ''}${presence.join('\n\n')}`);
            
                            let roles = [];
                            let rolec = [...mem.roles.values()];
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
                                `Discord ID: \`\`\`yaml\n${mem.user.id}\`\`\``
                            ].join('\n');
            
                            embed.addField('Identification', identity, true)
                            .addField('Account Creation Date', `${mem.user.createdAt.toUTCString()}\n(${timeago.format(mem.user.createdAt)})`, true)
            
                            if(mem.joinedAt !== null) {
                                embed.addField('Server Join Date', `${mem.joinedAt.toUTCString()}\n(${timeago.format(mem.joinedAt)})`)
                            }
            
                            if(roles.length > 0) {
                                embed.addField('Server Roles', roles.join(' '))
                            }
            
                            if(profile) {
                                let ls = new Date(profile.data.lastSeen);
                                embed.addField('OptiBot Profile', 'This user has an OptiBot Profile, which contains the following data:')
                                .addField('Last Seen Date', `${ls.getUTCDate()}/${ls.getUTCMonth()+1}/${ls.getUTCFullYear()}\n(DD/MM/YYYY)`)
                            } else 
                            if(!mem.user.bot) {
                                embed.addField('OptiBot Profile', 'This user does not have an OptiBot Profile.')
                            }
            
                            m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot))
                        }
                    }).catch(err => erm(err, bot, {m:m}));
                }
            }).catch(err => erm(err, bot, {m:m}));
        }
    }
})}
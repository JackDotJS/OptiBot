const path = require(`path`);
const djs = require(`discord.js`);
const timeago = require("timeago.js");
const Command = require(path.resolve(`./modules/core/command.js`));
const errMsg = require(path.resolve(`./modules/util/simpleError.js`));
const targetUser = require(path.resolve(`./modules/util/targetUser.js`))
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    aliases: ['whois'],
    short_desc: `Displays detailed information about a specified user.`,
    usage: `<discord user>`,
    authlevel: 0,
    tags: ['DM_OPTIONAL', 'BOT_CHANNEL_ONLY', 'INSTANT'],

    run: (m, args, data) => {
        if(!args[0]) {
            let embed = new djs.RichEmbed()
            .setAuthor(`Usage:`, bot.icons.find('ICO_info'))
            .setDescription(`\`\`\`${data.cmd.metadata.usage}\`\`\``)
            .setColor(bot.cfg.embed.default);

            m.channel.send({embed: embed})
            .then(bm => msgFinalizer(m.author.id, bm, bot, log))
            .catch(err => {
                m.channel.send({embed: errMsg(err, bot, log)})
                .catch(e => { log(err.stack, 'error') });
            });
        } else {
            targetUser(m, args[0], bot, log, data).then((result) => {
                if(!result) {
                    let embed = new djs.RichEmbed()
                    .setAuthor('You must specify a valid user @mention, ID, or target shortcut (^)', bot.icons.find('ICO_error'))
                    .setColor(bot.cfg.embed.error)
        
                    m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot, log));
                } else 
                if(result.type === 'notfound') {
                    let embed = new djs.RichEmbed()
                    .setAuthor('Unable to find a user.', bot.icons.find('ICO_error'))
                    .setDescription(`If that person is no longer in the server, and they have no OptiBot Profile, I can't get any information about them. Sorry!`)
                    .setColor(bot.cfg.embed.error)
        
                    m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot, log));
                } else 
                if (result.type === 'id') {
                    bot.getProfile(result.target, false).then(profile => {
                        if(!profile) {
                            let embed = new djs.RichEmbed()
                            .setAuthor('Unable to find a user.', bot.icons.find('ICO_error'))
                            .setDescription(`If that person is no longer in the server, and they have no OptiBot Profile, I can't get any information about them. Sorry!`)
                            .setColor(bot.cfg.embed.error)
                
                            m.channel.send({embed: embed})
                            .then(bm => msgFinalizer(m.author.id, bm, bot, log))
                            .catch(err => {
                                m.channel.send({embed: errMsg(err, bot, log)})
                                .catch(e => { log(err.stack, 'error') });
                            });
                        } else {
                            let ls = new Date(profile.data.lastSeen);

                            let embed = new djs.RichEmbed()
                            .setAuthor(`That is...`, bot.icons.find('ICO_user'))
                            .setColor(bot.cfg.embed.default)
                            .setTitle(`${profile.userid}`)
                            .setDescription(`Unfortunately, this user is no longer in the server. The following is leftover OptiBot Profile data, which will be deleted ${timeago.format(profile.data.lastSeen + (1000 * 60 * 60 * 24 * bot.cfg.profiles.expiration))}. (approximate)`)
                            .addField('Last Seen Date', `${ls.getUTCDate()}/${ls.getUTCMonth()+1}/${ls.getUTCFullYear()}\n(DD/MM/YYYY)`)

                            m.channel.send({embed: embed})
                            .then(bm => msgFinalizer(m.author.id, bm, bot, log))
                            .catch(err => {
                                m.channel.send({embed: errMsg(err, bot, log)})
                                .catch(e => { log(err.stack, 'error') });
                            });
                        }
                    }).catch(err => {
                        m.channel.send({embed: errMsg(err, bot, log)})
                        .catch(e => { log(err.stack, 'error') });
                    });
                } else 
                /* if(result.target.user.id === bot.memory.log.user.id || result.target.user.id === bot.user.id) {
                    bot.getProfile(m.author.id, true).then(profile => {
                        if(!profile.data.eggs) {
                            profile.data.eggs = {};
                        }

                        // TODO

                        if(!profile.data.eggs["1"]) {
                            profile.data.eggs["1"] = {
                                title: '🤖 Curious Being',
                                desc: 'I know what you are, but what am I?',
                                steps: `Attempt to view OptiBot's Profile via \`${bot.trigger}${path.parse(__filename).name}\`.`
                            }

                            let embed = new djs.RichEmbed()
                            .setAuthor(`I know what you are, but what am I?`, bot.icons.find('ICO_mystery'))
                            .setColor(bot.cfg.embed.egg)
                            .setDescription(`Type \`${bot.trigger}eggs\` to view all secrets you've unlocked.`)

                            m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot, log));
                        } else {
                            let embed = new djs.RichEmbed()
                            .setAuthor(`You've been here before.`, bot.icons.find('ICO_mystery'))
                            .setColor(bot.cfg.embed.egg)

                            m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot, log));
                        }
                    });
                } else  */{
                    bot.getProfile(result.target.user.id, false).then(profile => {
                        let mem = result.target;
                        let embed = new djs.RichEmbed()
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
        
                        embed.setDescription(presence.join('\n\n'));
        
                        let roles = [];
                        mem.roles.tap((role) => {
                            if(role.id !== mem.guild.id) {
                                roles.push(role.toString());
                            }
                        });
        
                        let identity = [
                            `Mention: ${mem.toString()}`,
                            `Discord ID: \`\`\`yaml\n${mem.user.id}\`\`\``
                        ].join('\n');
        
                        embed.addField('Identification', identity, true)
                        .addField('Account Creation Date', `${mem.user.createdAt.toUTCString()}\n(about ${timeago.format(mem.user.createdAt)})`, true)
        
                        if(mem.joinedAt !== null) {
                            embed.addField('Server Join Date', `${mem.joinedAt.toUTCString()}\n(about ${timeago.format(mem.joinedAt)})`)
                        }
        
                        if(roles.length > 0) {
                            embed.addField('Server Roles', `${(m.channel.type === 'dm') ? "These probably won't show correctly in DMs. Sorry! Blame Discord.\n\n" : ""}${roles.reverse().join(' ')}`)
                        }
        
                        if(profile) {
                            let ls = new Date(profile.data.lastSeen);
                            embed.addField('OptiBot Profile', 'This user has an OptiBot Profile, which contains the following data:')
                            .addField('Last Seen Date', `${ls.getUTCDate()}/${ls.getUTCMonth()+1}/${ls.getUTCFullYear()}\n(DD/MM/YYYY)`)
                        } else 
                        if(!mem.user.bot) {
                            embed.addField('OptiBot Profile', 'This user does not have an OptiBot Profile.')
                        }
        
                        m.channel.send({embed: embed})
                        .then(bm => msgFinalizer(m.author.id, bm, bot, log))
                        .catch(err => {
                            m.channel.send({embed: errMsg(err, bot, log)})
                            .catch(e => { log(err.stack, 'error') });
                        });
                    }).catch(err => {
                        m.channel.send({embed: errMsg(err, bot, log)})
                        .catch(e => { log(err.stack, 'error') });
                    });
                }
            }).catch(err => {
                m.channel.send({embed: errMsg(err, bot, log)})
                .catch(e => { log(err.stack, 'error') });
            });
        }
    }
})}
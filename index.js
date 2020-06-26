/**
 * OptiBot NX - Main Program
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Written by Kyle Edwards <wingedasterisk@gmail.com>, January 2020
 */

if(!process.send) throw new Error(`Cannot run standalone. Please use the "init.bat" file.`);

const cid = require('caller-id');
const wink = require('jaro-winkler');
const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const timeago = require("timeago.js");
const ob = require(`./modules/core/OptiBot.js`);

const log = (message, level, file, line) => {
    let call = cid.getData();
    if (!file) file = (call.evalFlag) ? 'eval()' : call.filePath.substring(call.filePath.lastIndexOf('\\')+1);
    if (!line) line = call.lineNumber;

    process.send({
        type: 'log',
        message: message,
        level: level,
        misc: `${file}:${line}`
    });
}

const bot = new ob.Client({
    presence: {
        status: 'idle', 
        activity: {
            type: 'WATCHING',
            name: `assets load 🔄`
        }
    },
    disableMentions: 'everyone'
}, parseInt(process.argv[2]), log);

bot.setWindowTitle('Connecting...');

bot.login(bot.keys.discord).catch(err => {
    bot.setWindowTitle(`Connection Failed.`);
    log(err, 'fatal');
    process.exit(1);
});

////////////////////////////////////////
// Bot Ready
////////////////////////////////////////

bot.on('ready', () => {
    if(bot.memory.bot.init) {
        log('Successfully connected to Discord API.', 'info');

        let botLoadAssets = function() {
            bot.setWindowTitle('Loading Assets...');
    
            bot.loadAssets().then((time) => {
                let now = new Date();
                let width = 64; //inner width of box
                function centerText(text, totalWidth) {
                    text = text.substring(0, totalWidth-8);

                    let leftMargin = Math.floor((totalWidth - (text.length)) / 2);
                    let rightMargin = Math.ceil((totalWidth - (text.length)) / 2);

                    return `│` + (` `.repeat(leftMargin)) + text + (` `.repeat(rightMargin)) + `│`;
                }

                let splash = bot.splash[~~(Math.random() * bot.splash.length)];

                if(splash.indexOf('\n') > -1) {
                    splash = splash.substring(splash.lastIndexOf('\n')+1).substring(0, width);
                }

                log(splash, 'debug');

                log(`╭${'─'.repeat(width)}╮`, `info`); 
                log(centerText(`  `, width), `info`);
                log(centerText(`OptiBot ${bot.version}`, width), `info`);
                log(centerText(`(c) Kyle Edwards <wingedasterisk@gmail.com>, 2020`, width), `info`);
                log(centerText(`  `, width), `info`);
                log(centerText(splash, width), `info`);
                log(centerText(`  `, width), `info`);
                log(centerText(`Finished initialization in ${process.uptime().toFixed(3)} seconds.`, width), `info`);
                log(centerText(`Assets loaded in ${time / 1000} seconds.`, width), `info`);
                log(centerText(`  `, width), `info`);
                log(`╰${'─'.repeat(width)}╯`, `info`);

                let logEntry = new bot.util.LogEntry(bot, {time: now})
                .setColor(bot.cfg.embed.default)
                .setIcon(bot.icons.find('ICO_info'))
                .setThumbnail(bot.user.displayAvatarURL({format: 'png'}))
                .setTitle(`OptiBot Initialized`, `OptiBot Initalization Time Report`)
                .setHeader(`Version: ${bot.version}`)
                .setDescription(`Boot Time: ${process.uptime().toFixed(3)} second(s)`)
                .addSection(`The following message was brought to you by Math.random()®`, {
                    data: `\`\`\`${splash}\`\`\``,
                    raw: splash
                })
                .submit("misc")

                process.send({
                    type: 'ready'
                });

                

                bot.memory.bot.init = false;

                bot.util.status(bot, 1);
                bot.setWindowTitle(null);
            }).catch(err => {
                log(err.stack, 'fatal');
                bot.exit(1);
            });
            
            if(bot.memory._temp) delete bot.memory._temp;
        }

        if(!bot.mainGuild.available) {
            bot.setWindowTitle('Waiting for primary guild...');
            log('Primary guild unavailable.\nAssets will be loaded once the guild is available again.', 'warn')
            bot.memory._temp = botLoadAssets();
        } else {
            botLoadAssets();
        }
    }
});

////////////////////////////////////////
// Message Received
////////////////////////////////////////

bot.on('message', (m) => {
    if (m.author.bot || m.author.system) return;
    
    if (bot.memory.users.indexOf(m.author.id) === -1) {
        bot.memory.users.push(m.author.id);
        bot.getProfile(m.author.id, false).then(profile => {
            if(profile) {
                profile.data.lastSeen = new Date().getTime();

                bot.updateProfile(m.author.id, profile)
            }
        });
    }

    if(m.channel.type !== 'dm' && m.guild.id === bot.cfg.guilds.optifine) {
        if(bot.mode > 0) {
            // dynamic slowmode
            if(bot.cfg.channels.blacklist.indexOf(m.channel.id) === -1 && bot.cfg.channels.blacklist.indexOf(m.channel.parentID) === -1) {
                if(bot.cfg.channels.nomodify.indexOf(m.channel.id) === -1 && bot.cfg.channels.nomodify.indexOf(m.channel.parentID) === -1) {
                    if(bot.memory.sm[m.channel.id]) {
                        bot.memory.sm[m.channel.id].now++;
                    } else {
                        bot.memory.sm[m.channel.id] = {
                            past: [ 0, 0, 0, 0, 0,],
                            now: 1,
                            mps: 0.0,
                            manual: false,
                            i: 0,
                            until: null,
                        }
                    }
                }
            }
        }

        // update moderator's last message for !modping
        for(let i in bot.memory.mods) {
            if(bot.memory.mods[i].id === m.author.id) {
                bot.memory.mods[i].status = m.author.presence.status
                bot.memory.mods[i].last_message = m.createdTimestamp
            }
        }
    }

    let input = bot.parseInput(m.content);

    bot.mainGuild.members.fetch({ user: m.author.id, cache: true }).then(member => {
        let authlvl = bot.getAuthlvl(member);

        if(authlvl < 4 && bot.mode === 0) return;
        if(authlvl < 1 && bot.mode === 1) return;

        if(input.valid) {
            /////////////////////////////////////////////////////////////
            // COMMAND HANDLER
            /////////////////////////////////////////////////////////////
    
            bot.commands.find(input.cmd).then(cmd => {
                let unknownCMD = () => {
                    let ratings = [];
                                
                    bot.commands.index.filter((thisCmd) => thisCmd.metadata.authlvl <= authlvl && !thisCmd.metadata.flags['HIDDEN'])
                    .forEach((thisCmd) => {
                        let rating = {
                            command: thisCmd.metadata.name,
                            alias: null,
                            distance: wink(input.cmd, thisCmd.metadata.name)
                        }
    
                        for(let alias of thisCmd.metadata.aliases) {
                            let adist = wink(input.cmd, alias);
                            if(adist > rating.distance) {
                                rating.distance = adist;
                                rating.alias = alias;
                            }
                        }
    
                        ratings.push(rating);
                    });
    
                    ratings.sort((a, b) => {
                        if (a.distance < b.distance) {
                            return 1;
                        } else 
                        if (a.distance > b.distance) {
                            return -1;
                        } else {
                            return 0;
                        }
                    });
    
                    let closest = ratings[0];
    
                    let embed = new djs.MessageEmbed()
                    .setAuthor('Unknown command.', bot.icons.find('ICO_info'))
                    .setColor(bot.cfg.embed.default)
    
                    if (closest.distance > 0.8) {
                        embed.setFooter(`${(closest.distance * 100).toFixed(1)}% match`);
    
                        if(closest.alias !== null) {
                            embed.setDescription(`Perhaps you meant \`${bot.prefix}${closest.alias}\`? (Alias of \`${bot.prefix}${closest.command}\`)`);
                        } else {
                            embed.setDescription(`Perhaps you meant \`${bot.prefix}${closest.command}\`?`);
                        }
                    } else {
                        embed.setDescription(`Type \`${bot.prefix}list\` for a list of commands.`);
                    }
    
                    m.channel.send({embed: embed}).then(bm => bot.util.responder(m.author.id, bm, bot));
                }
    
                let checkMisuse = (msg) => {
                    let embed = new djs.MessageEmbed()
                    .setAuthor(msg, bot.icons.find('ICO_error'))
                    .setColor(bot.cfg.embed.error)
    
                    let content = '_ _';
    
                    if(cmd.metadata.flags['DELETE_ON_MISUSE']) {
                        m.delete().catch(err => {
                            log(err.stack, 'error');
                        });
                        content = m.author;
                        embed.setDescription('This message will self-destruct in 10 seconds.');
                    }
    
                    m.channel.send(content, {embed: embed}).then(msg => {
                        if(cmd.metadata.flags['DELETE_ON_MISUSE']) {
                            msg.delete(10000);
                        } else {
                            bot.util.responder(m.author.id, bm, bot)
                        }
                    });
                }
    
                if(cmd) {
                    let loc = `#${m.channel.name}`;
                    let logargs = (cmd.metadata.flags['CONFIDENTIAL']) ? m.content.replace(/\S/gi, '*') : m.content;

                    if(m.channel.type === 'dm') {
                        loc = 'DM';
                    } else if(m.guild.id === bot.cfg.guilds.optibot) {
                        loc = `OB:#${m.channel.name}`;
                    }


                    log(`[${loc}] [L${authlvl}] ${m.author.tag} (${m.author.id}) Command issued: ${logargs}`, 'info')
                }
    
                if(!cmd) {
                    unknownCMD();
                } else
                if(authlvl < cmd.metadata.authlvl) {
                    if(cmd.metadata.flags['HIDDEN']) {
                        unknownCMD();
                    } else {
                        checkMisuse('You do not have permission to use this command.');
                    }
                } else 
                if(cmd.metadata.flags['NO_DM'] && m.channel.type === 'dm' && (authlvl < 5 || cmd.metadata.flags['STRICT'])) {
                    checkMisuse('This command cannot be used in DMs.');
                } else
                if(cmd.metadata.flags['DM_ONLY'] && m.channel.type !== 'dm' && (authlvl < 5 || cmd.metadata.flags['STRICT'])) {
                    checkMisuse('This command can only be used in DMs.');
                } else
                if(cmd.metadata.flags['BOT_CHANNEL_ONLY'] && m.channel.type !== 'dm' && (bot.cfg.channels.bot.indexOf(m.channel.id) === -1 && bot.cfg.channels.bot.indexOf(m.channel.parentID) === -1) && (authlvl === 0 || cmd.metadata.flags['STRICT'])) {
                    checkMisuse('This command can only be used in DMs OR the #optibot channel.');
                } else
                if(cmd.metadata.flags['MOD_CHANNEL_ONLY'] && m.channel.type !== 'dm' && (bot.cfg.channels.mod.indexOf(m.channel.id) === -1 && bot.cfg.channels.mod.indexOf(m.channel.parentID) === -1) && (authlvl < 5 || cmd.metadata.flags['STRICT'])) {
                    checkMisuse('This command can only be used in moderator-only channels.');
                } else {
                    if(!cmd.metadata.flags['NO_TYPER']) m.channel.startTyping();
                    bot.setTimeout(() => {
                        try {
                            cmd.exec(m, input.args, {member, authlvl, input, cmd, bot, log});
                        }
                        catch (err) {
                            if(!cmd.metadata.flags['NO_TYPER']) m.channel.stopTyping()
                            bot.util.err(err, bot, {m: m})
                        }
                    }, (cmd.metadata.flags['NO_TYPER']) ? 10 : Math.round(bot.ws.ping)+250)
                }
    
            }).catch(err => {
                bot.util.err(err, bot, {m:m});
            });
        } else {
            /////////////////////////////////////////////////////////////
            // TIDBIT HANDLER
            /////////////////////////////////////////////////////////////
    
            if (m.channel.type === 'dm') {
                let embed = new djs.MessageEmbed()
                .setColor(bot.cfg.embed.default)
                //.setAuthor(`Hi there!`, bot.icons.find('ICO_info'))
                .setTitle('Hi there!')
                .setDescription(`For a list of commands, type \`${bot.prefix}list\`. If you've donated and you'd like to receive your donator role, type \`${bot.prefix}help dr\` for instructions.`)
    
                m.channel.send({ embed: embed });
            } else
            if(m.content.match(/discordapp\.com|discord.com/i)) {
                let urls = m.content.match(/\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/gi);
    
                if(urls !== null) {
                    for(let link of urls) {
                        let seg = link.split(/(?<!\/)\/(?!\/)|(?<!\\)\\(?!\\)/g).reverse();
    
                        if(link.match(/discordapp\.com|discord.com/i) && seg.length === 5 && !isNaN(parseInt(seg[0])) && !isNaN(parseInt(seg[1])) && !isNaN(parseInt(seg[2]))) {
                            foundQuote(seg);
                            break;
                        }
                    }
    
                    function foundQuote(seg) {
                        let rg = seg[2];
                        let rc = seg[1];
                        let rm = seg[0];
    
                        let guild = bot.guilds.cache.get(rg);
                        let channel;
                        if(guild !== undefined) channel = guild.channels.cache.get(rc);
    
                        if(channel !== undefined) {
                            channel.messages.fetch(rm).then(msg => {
                                let contents = msg.content;
                                let image = null;
                                let embed = new djs.MessageEmbed()
                                .setColor(bot.cfg.embed.default)
                                .setAuthor(`Message Quote`, bot.icons.find('ICO_quote'))
                                .setTitle(`Posted by ${msg.author.tag}`)
                                .setFooter(`Quoted by ${m.author.tag}`)
        
                                /* if(msg.author.displayAvatarURL.endsWith('.gif')) {
                                    embed.setThumbnail(msg.author.displayAvatarURL.substring(0, msg.author.displayAvatarURL.lastIndexOf('.')))
                                } else {
                                    embed.setThumbnail(msg.author.displayAvatarURL)
                                } */
        
                                if(msg.content.length === 0) {
                                    contents = []
                                    if(msg.embeds.length > 0) {
                                        contents.push(`\`[${msg.embeds.length} Embed(s)]\``);
                                    }
        
                                    if(msg.attachments.size > 0) {
                                        let attURL = msg.attachments.first().url;
                                        if(attURL.endsWith('.png') || attURL.endsWith('.jpg') || attURL.endsWith('.jpeg') || attURL.endsWith('.gif')) {
                                            image = attURL;
        
                                            if((msg.attachments.size - 1) > 0) {
                                                contents.push(`\`[${msg.attachments.size} Attachment(s)]\``);
                                            }
                                        } else {
                                            contents.push(`\`[${msg.attachments.size} Attachment(s)]\``);
                                        }
                                    }
        
                                    if(contents.length > 0) {
                                        contents = contents.join('\n');
                                    }
                                } else
                                if(msg.attachments.size > 0) {
                                    let attURL = msg.attachments.first().url;
                                    if(attURL.endsWith('.png') || attURL.endsWith('.jpg') || attURL.endsWith('.jpeg') || attURL.endsWith('.gif')) {
                                        image = attURL;
                                    }
                                }
        
                                if(contents.length !== 0) {
                                    embed.setDescription(contents);
                                }
        
                                if(image !== null) {
                                    embed.setImage(image);
                                }
        
                                m.channel.send({embed: embed}).then(bm => bot.util.responder(m.author.id, bm, bot));
                            }).catch(err => {
                                if(err.stack.toLowerCase().indexOf('unknown message') === -1) {
                                    log(err.stack, 'error');
                                }
                            });
                        }
                    }
                }
            }
    
            if (m.mentions.has(bot.user)) {
                m.react(bot.mainGuild.emojis.cache.get('663409134644887572'));
            }


        }
    }).catch(err => {
        if (err.code === 10007 && input.valid) {
            bot.util.err('Sorry, you must be a member of the OptiFine Discord server to use this bot.', bot, {m: m});
        } else {
            bot.util.err(err, bot);
        }
    });
});

////////////////////////////////////////
// Node.js Parent Node Message
////////////////////////////////////////

process.on('message', (m) => {
    if(m.crashlog) {
        log('got crash data');
        bot.mainGuild.members.fetch({user: '181214529340833792', cache: true}).then(jack => {
            jack.send(`**=== OptiBot Crash Recovery Report ===**`, new djs.MessageAttachment(`./logs/${m.crashlog}`));
        }).catch(err => {
            log(err.stack, 'error');
        });
    } else
    if(m.restart) {
        log('got restart data');
        bot.guilds.cache.get(m.restart.guild).channels.cache.get(m.restart.channel).messages.fetch(m.restart.message).then(msg => {
            let embed = new djs.MessageEmbed()
            .setAuthor(`Restarted in ${((new Date().getTime() - msg.createdTimestamp) / 1000).toFixed(1)} seconds.`, bot.icons.find('ICO_okay'))
            .setColor(bot.cfg.embed.okay);

            msg.edit({embed: embed}).then(msgF => {
                bot.util.responder(m.author, msgF, bot)
            })
        }).catch(err => {
            log(err.stack, 'error');
        });
    }
});

////////////////////////////////////////
// Guild Presence Update
////////////////////////////////////////

bot.on('presenceUpdate', (old, mem) => {
    if (mem.guild.id !== bot.cfg.guilds.optifine) return;
    if (mem.user.bot) return;

    for(let i in bot.memory.mods) {
        let mod = bot.memory.mods[i];
        if(mod.id === mem.id) {
            if(mod.status !== mem.presence.status || (mem.lastMessage && mem.lastMessage.createdTimestamp !== mod.last_message)) {
                log('moderator updated');
                log('OLD')
                log(mod.status)
                log('NEW')
                log(mem.presence.status)

                bot.memory.mods[i].status = mem.presence.status
                bot.memory.mods[i].last_message = (mem.lastMessage) ? mem.lastMessage.createdTimestamp : mod.last_message
            }
        }
    }
});

////////////////////////////////////////
// Message Deletion Events
////////////////////////////////////////

bot.on('messageDelete', m => {
    let now = new Date();
    if (m.channel.type === 'dm') return;
    if (m.author.system || m.author.bot) return;
    if (m.guild.id !== bot.cfg.guilds.optifine) return;
    if (bot.parseInput(m).cmd === 'dr') return;

    bot.memory.rdel.push(m.id);

    let logEntry = new bot.util.LogEntry(bot, {time: now, channel: "delete"})
    .preLoad()

    bot.setTimeout(() => {
        log('begin calculation of executor', 'trace')
        bot.mainGuild.fetchAuditLogs({ limit: 10, type: 'MESSAGE_DELETE' }).then((audit) => {

            let ad = [...audit.entries.values()];

            let dlog = null;
            let clog = null;
            let dType = 0;
            // 0 = author
            // 1 = moderator

            for(let i = 0; i < ad.length; i++) {
                if (ad[i].target.id === m.author.id) {
                    dlog = ad[i];

                    for(let i = 0; i < bot.memory.audit.length; i++) {
                        if (bot.memory.audit[i].id === dlog.id && clog === null) {
                            clog = bot.memory.audit[i];
                        }
                        
                        if (i+1 === bot.memory.audit.length) {
                            if(dlog !== null && clog === null) {
                                dType = 1;
                                finalLog();
                            } else
                            if(dlog === null && clog === null) {
                                finalLog();
                            } else
                            if(dlog === null && clog !== null) {
                                finalLog();
                            } else
                            if(dlog !== null && clog !== null) {
                                if(dlog.extra.count > clog.extra.count) {
                                    dType = 1;
                                    finalLog();
                                } else {
                                    finalLog();
                                }
                            }
                        }
                    }
                    break;
                } else
                if (i+1 === ad.length) {
                    // deleted message does not exist in audit log, therefore it was deleted by the author
                    finalLog();
                }
            }

            function finalLog() {
                bot.memory.audit = [...audit.entries.values()];

                let doRaw = false;
                let desc = [
                    `Message originally posted on ${m.createdAt.toUTCString()}`,
                    `(${timeago.format(m.createdAt)})`
                ];
                
                logEntry.setColor(bot.cfg.embed.error)
                .setIcon(bot.icons.find('ICO_trash'))
                .setTitle(`Message Deleted`, `Message Deletion Report`)
                .setDescription(desc.join('\n'), desc.join(' '))
                .addSection(`Author`, m.author)

                if(dType === 1) {
                    logEntry.addSection(`Deleted By`, dlog.executor)
                } else
                if((m.member !== null && m.member.deleted) || (!m.member)) {
                    logEntry.addSection(`Deleted By`, `Unknown (Possibly deleted during a ban)`)
                } else {
                    logEntry.addSection(`Deleted By`, `Author`)
                }

                logEntry.addSection(`Message Location`, m)

                if(m.content.length > 0) {
                    logEntry.addSection(`Message Contents`, m.content);
                }

                let att = [];
                let att_raw = [];
                if (m.attachments.size > 0) {
                    m.attachments.each(a => {
                        att.push(`[${a.name || a.url.match(/[^\/]+$/)}](${a.url})`)
                        att_raw.push(`${a.name || a.url.match(/[^\/]+$/)} (${a.url})`)
                    });
                }

                if(att.length > 0) {
                    logEntry.addSection(`Message Attachments`, {
                        data: att.join('\n'),
                        raw: att_raw.join('\n')
                    })
                }

                if(m.embeds.length > 0) {
                    let rawEmbeds = [];
                    doRaw = true;

                    for(let i = 0; i < m.embeds.length; i++) {
                        rawEmbeds.push(util.inspect(m.embeds[i], { showHidden: true, getters: true }));
                        if(i+1 < m.embeds.length) {
                            rawEmbeds.push('');
                        } else {
                            rawEmbeds = rawEmbeds.join('\n');
                        }
                    }

                    logEntry.addSection(`Message Embeds`, {
                        data: `[${m.embeds.length} Embed${(m.embeds.length > 1) ? "s" : ""}]`,
                        raw: rawEmbeds
                    })
                }

                logEntry.submit(doRaw);

                bot.memory.rdel.splice(bot.memory.rdel.indexOf(m.id), 1);
            }
        })
    }, 5000);
});

bot.on('messageDeleteBulk', ms => {
    let now = new Date();

    let logEntry = new bot.util.LogEntry(bot, {time: now, channel: "delete"})
    .preLoad()

    bot.setTimeout(() => {
        let messages = [...ms.values()];

        let i = 0;
        (function postNext() {
            let desc = [
                `Message originally posted on ${m.createdAt.toUTCString()}`,
                `(${timeago.format(m.createdAt)})`
            ];
            
            logEntry.setColor(bot.cfg.embed.error)
            .setIcon(bot.icons.find('ICO_trash'))
            .setTitle(`(Bulk ${i+1}/${messages.length}) Message Deleted`, `Bulk Message ${i+1}-${messages.length} Deletion Report`)
            .setDescription(desc.join('\n'), desc.join(' '))
            .addSection(`Author`, m.author)
            .addSection(`Message Location`, m)

            if(m.content > 0) {
                logEntry.addSection(`Message Contents`, m.content);
            }

            let att = [];
            let att_raw = [];
            if (m.attachments.size > 0) {
                m.attachments.each(a => {
                    att.push(`[${a.name || a.url.match(/[^\/]+$/)}](${a.url})`)
                    att_raw.push(`${a.name || a.url.match(/[^\/]+$/)} (${a.url})`)
                });
            }

            if(att.length > 0) {
                logEntry.addSection(`Message Attachments`, {
                    data: att.join('\n'),
                    raw: att_raw.join('\n')
                })
            }

            if(m.embeds.length > 0) {
                let rawEmbeds = [];
                doRaw = true;

                for(let i = 0; i < m.embeds.length; i++) {
                    rawEmbeds.push(util.inspect(m.embeds[i], { showHidden: true, getters: true }));
                    if(i+1 < m.embeds.length) {
                        rawEmbeds.push('');
                    } else {
                        rawEmbeds = rawEmbeds.join('\n');
                    }
                }

                logEntry.addSection(`Message Embeds`, {
                    data: `[${m.embeds.length} Embed${(m.embeds.length > 1) ? "s" : ""}]`,
                    raw: rawEmbeds
                })
            }

            logEntry.submit().then(() => {
                i++;
                postNext();
            })
            .catch(err => {
                log(err.stack, 'error');

                i++;
                postNext();
            })
        })();
    }, 5000);
});

////////////////////////////////////////
// Message Edited
////////////////////////////////////////

bot.on('messageUpdate', (m, mNew) => {
    if (m.channel.type === 'dm') return;
    if (m.author.system || m.author.bot) return;
    if (mNew.guild.id !== bot.cfg.guilds.optifine) return;
    let timeNow = new Date();
    if (m.content.trim().toLowerCase() == mNew.content.trim().toLowerCase()) return; // ignore embed updates
    if (bot.parseInput(mNew).cmd === 'dr') return;

    let zw = "​"; // zero width character, NOT an empty string. only needed to fix emoji-only messages on mobile from being gigantic.

    let contents = [
        '////////////////////////////////////////////////////////////////',
        'OptiLog Message Edit Report',
        `Date: ${timeNow.toUTCString()}`,
        '////////////////////////////////////////////////////////////////',
        '',
        `Author: ${m.author.tag} (${m.author.id})`,
        `Original Post Date: ${m.createdAt.toUTCString()}`,
        `Message ID: ${m.id}`,
        `Location: #${m.channel.name} (${m.channel.id})`,
        '',
        `Old Message Content:`,
        m.content,
        ``,
        `New Message Content:`,
        mNew.content,
        ``,
        '////////////////////////////////////////////////////////////////',
    ]

    let files;

    let embed = new djs.MessageEmbed()
    .setColor(bot.cfg.embed.default)
    .setAuthor('Message Edited', bot.icons.find('ICO_edit'))
    .setDescription(`Original message posted on ${m.createdAt.toUTCString()}\n(${timeago.format(m.createdAt)})`)
    .addField('Author', `${m.author} | ${m.author.tag} \n\`\`\`yaml\n${m.author.id}\`\`\``)
    .addField('Message Location', `${m.channel} | [Direct URL](${m.url})`)
    .setFooter(`Event logged on ${timeNow.toUTCString()}`)
    .setTimestamp(timeNow)

    if(m.content.length > 1000 || mNew.content.length > 1000) {
        files = [new djs.MessageAttachment(Buffer.from(contents.join('\n')), 'optilog_edited_message.txt')]
        embed.setTitle('The contents of this message are too long to show in an embed. See the attached file above for details.')
    }

    if(m.content.length > 1000) {
        embed.addField('Original Message (Truncated)', `${(typeof m.content === 'string') ? m.content.substring(0, 1000) : 'null'}...`)
    } else {
        embed.addField('Original Message', `${m.content || 'null'}​${zw}`)
    }

    if(mNew.content.length > 1000) {
        embed.addField('New Message (Truncated)', `${(typeof mNew.content === 'string') ? mNew.content.substring(0, 1000) : 'null'}​...`)
    } else {
        embed.addField('New Message', `${mNew.content || 'null'}​${zw}`)
    }

    //bot.guilds.cache.get(bot.cfg.logging.guild).channels.cache.get(bot.cfg.logging.channel).send({embed: embed, files: files});
});

////////////////////////////////////////
// Channel Update
////////////////////////////////////////

bot.on('channelUpdate', (oldc, newc) => {
    let timeNow = new Date();
    if(oldc.type === 'text') {
        let embed = new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .setFooter(`Event logged on ${timeNow.toUTCString()}`)
        .setTimestamp(timeNow)

        if(oldc.topic === newc.topic) return;

        if(oldc.topic) {
            if(newc.topic) {
                // both topics exist
                embed.setAuthor('Channel Topic Updated', bot.icons.find('ICO_info'))
                .addField('Original Topic', oldc.topic)
                .addField('New Topic', newc.topic)
            } else {
                // old topic exists, new one does not
                embed.setAuthor('Channel Topic Removed', bot.icons.find('ICO_info'))
                .addField('Original Topic', oldc.topic)
            }
        } else
        if(newc.topic) {
            // old topic does not exist, new topic does
            embed.setAuthor('Channel Topic Added', bot.icons.find('ICO_info'))
                .addField('New Topic', newc.topic)
        }

        if(oldc.id === '471762249476734977') {
            oldc.send({embed:embed}).catch(err => {
                log(err.stack, 'error');
            });
        }

        embed.setDescription(`Channel: ${newc.toString()}`)

        //bot.guilds.cache.get(bot.cfg.logging.guild).channels.cache.get(bot.cfg.logging.channel).send({embed: embed});
    }
});

////////////////////////////////////////
// User Joined
////////////////////////////////////////

bot.on('guildMemberAdd', member => {
    let now = new Date();
    if (member.guild.id !== bot.cfg.guilds.optifine) return;

    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    // DO NOT SET THIS TO TRUE UNDER ANY CIRCUMSTANCES
    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    const alwaysFalse = false;

    bot.getProfile(member.user.id, alwaysFalse).then(profile => {
        if(profile && profile.data.essential.mute && (profile.data.essential.mute.end-10000 > new Date().getTime())) {
            member.roles.add(bot.cfg.roles.muted, 'Member attempted to circumvent mute.').then(() => {
                // todo: increase mute time in this case
                logEvent(true);
            }).catch(err => {
                bot.util.err(err, bot);
                logEvent();
            });
        } else {
            logEvent();
        }
    }).catch(err => {
        bot.util.err(err, bot);
        logEvent();
    });

    function logEvent(muted) {
        let logEntry = new bot.util.LogEntry(bot, {time: now, channel: "joinleave"})
        .setColor(bot.cfg.embed.okay)
        .setIcon(bot.icons.find('ICO_join'))
        .setThumbnail(member.user.displayAvatarURL({format:'png'}))
        .setTitle(`Member Joined`, `New Member Report`)
        .addSection(`Member`, member)
        .addSection(`Account Creation Date`, member.user.createdAt)
        .addSection(`New Server Member Count`, bot.mainGuild.memberCount)

        if(muted) {
            logEntry.setDescription(`This user attempted to circumvent an on-going mute. The role has been automatically re-applied.`)
        }

        if((member.user.createdAt.getTime() + (1000 * 60 * 60 * 24 * 7)) > now.getTime()) {
            // account is less than 1 week old
            logEntry.setHeader('Warning: New Discord Account')
        }

        logEntry.submit()
    }
});

////////////////////////////////////////
// User Left/Kicked
////////////////////////////////////////

bot.on('guildMemberRemove', member => {
    let now = new Date();
    if (member.guild.id !== bot.cfg.guilds.optifine) return;

    for(let i in bot.memory.mutes) {
        let mute = bot.memory.mutes[i];
        if(mute.id === member.user.id) {
            bot.clearTimeout(mute.time);
            bot.memory.mutes.splice(i, 1);
            break;
        }
    }

    bot.setTimeout(() => {
        bot.mainGuild.fetchAuditLogs({ limit: 10 }).then((audit) => {
            let ad = [...audit.entries.values()];

            for(let i = 0; i < ad.length; i++) {
                if ((ad[i].action === 'MEMBER_KICK' || ad[i].action === 'MEMBER_BAN_ADD') && ad[i].target.id === member.user.id) {
                    if(ad[i].action === 'MEMBER_KICK') {
                        let logEntry = new bot.util.LogEntry(bot, {time: now, channel: "moderation"})
                        .setColor(bot.cfg.embed.error)
                        .setIcon(bot.icons.find('ICO_leave'))
                        .setThumbnail(member.user.displayAvatarURL({format:'png'}))
                        .setTitle(`Member Kicked`, `Member Kick Report`)
                        .setHeader((ad[i].reason) ? "Reason: "+ad[i].reason : "No reason provided.")
                        .addSection(`Member`, member)
                        .addSection(`Moderator Responsible`, ad[i].executor)
                        .submit()
                    }
                    break;
                } else
                if (i+1 >= ad.length) {
                    let logEntry = new bot.util.LogEntry(bot, {time: now, channel: "joinleave"})
                    .setColor(bot.cfg.embed.error)
                    .setIcon(bot.icons.find('ICO_leave'))
                    .setThumbnail(member.user.displayAvatarURL({format:'png'}))
                    .setTitle(`Member Left`, `Member Leave Report`)
                    .addSection(`Member`, member)
                    .addSection(`Join Date`, (member.joinedAt !== null) ? member.joinedAt : 'Unknown.')
                    .addSection(`New Server Member Count`, bot.mainGuild.memberCount)
                    .submit()
                }
            }
        }).catch(err => log(err.stack, 'error'));
    }, 5000);
});

////////////////////////////////////////
// User Banned
////////////////////////////////////////

bot.on('guildBanAdd', (guild, user) => {
    let now = new Date();
    if (guild.id !== bot.cfg.guilds.optifine) return;

    let logEntry = new bot.util.LogEntry(bot, {time: now, channel: "moderation"})
    .preLoad()

    bot.setTimeout(() => {
        bot.mainGuild.fetchAuditLogs({ limit: 10, type: 'MEMBER_BAN_ADD' }).then((audit) => {
            let ad = [...audit.entries.values()];

            let mod = bot.memory.rban[user.id];
            let reason = null;
            for(let i = 0; i < ad.length; i++) {
                if (ad[i].target.id === user.id) {
                    if(!mod) mod = ad[i].executor;
                    reason = ad[i].reason;
                    break;
                }
            }
            
            logEntry.setColor(bot.cfg.embed.error)
            .setIcon(bot.icons.find('ICO_ban'))
            .setThumbnail(user.displayAvatarURL({format:'png'}))
            .setTitle(`Member Banned`, `Member Ban Report`)
            .addSection(`Banned Member`, user)

            if(reason) {
                logEntry.setHeader(`Reason: ${reason}`)
            } else {
                logEntry.setHeader(`No reason provided.`)
            }

            if(mod) {
                logEntry.addSection(`Moderator Responsible`, mod);
            } else {
                logEntry.addSection(`Moderator Responsible`, `Error: Unable to determine.`)
            }
            
            logEntry.submit()

            bot.getProfile(user.id, true).then(profile => {
                if(!profile.data.essential.record) profile.data.essential.record = [];

                let recordEntry = new bot.util.RecordEntry()
                .setDate(now)
                .setAction('ban')
                .setActionType('add')
                
                if(reason !== null) {
                    recordEntry.setReason(reason)
                }

                if(mod !== null) {
                    recordEntry.setMod(mod.id);
                }

                profile.data.essential.record.push(recordEntry.data);

                bot.updateProfile(user.id, profile).then(() => {
                    log(`ban addition record successfully saved`)
                }).catch(err => {
                    log(err.stack, 'error');
                })

            });

        }).catch(err => log(err.stack, 'error'));
    }, 5000);
});

////////////////////////////////////////
// User Ban Revoked
////////////////////////////////////////

bot.on('guildBanRemove', (guild, user) => {
    let now = new Date();
    if (guild.id !== bot.cfg.guilds.optifine) return;

    let logEntry = new bot.util.LogEntry(bot, {time: now, channel: "moderation"})
    .preLoad()

    bot.setTimeout(() => {
        bot.mainGuild.fetchAuditLogs({ limit: 10, type: 'MEMBER_BAN_REMOVE' }).then((audit) => {
            let ad = [...audit.entries.values()];

            let mod = null;
            for(let i = 0; i < ad.length; i++) {
                if (ad[i].target.id === user.id) {
                    mod = ad[i].executor;
                    break;
                }
            }
            
            logEntry.setColor(bot.cfg.embed.default)
            .setIcon(bot.icons.find('ICO_unban'))
            .setThumbnail(user.displayAvatarURL({format:'png'}))
            .setTitle(`Member Ban Revoked`, `Member Ban Removal Report`)
            .addSection(`Unbanned Member`, user)

            if(mod) {
                logEntry.addSection(`Moderator Responsible`, mod);
            } else {
                logEntry.addSection(`Moderator Responsible`, `Error: Unable to determine.`)
            }
            
            logEntry.submit()

            bot.getProfile(user.id, true).then(profile => {
                if(!profile.data.essential.record) profile.data.essential.record = [];

                let parent = null;
                for(let i = 0; i < profile.data.essential.record.length; i++) {
                    let entry = profile.data.essential.record[i];
                    if (entry.action === 4 && entry.actionType === 1) {
                        parent = entry;
                    }
                }

                let recordEntry = new bot.util.RecordEntry()
                .setDate(now)
                .setAction('ban')
                .setActionType('remove')
                .setReason(`No reason provided.`)
                
                if(parent !== null) {
                    recordEntry.setParent(parent.date);
                }

                if(mod !== null) {
                    recordEntry.setMod(mod.id);
                }

                profile.data.essential.record.push(recordEntry.data);

                bot.updateProfile(user.id, profile).then(() => {
                    log(`ban removal record successfully saved`)
                }).catch(err => {
                    log(err.stack, 'error');
                })

            });

        }).catch(err => log(err.stack, 'error'));
    }, 5000);
});

////////////////////////////////////////
// Raw Packet Data
////////////////////////////////////////

bot.on('raw', packet => {
    let now = new Date();
    if(packet.t === 'MESSAGE_REACTION_ADD') {
        let channel = bot.channels.cache.get(packet.d.channel_id);
        if (channel.messages.cache.has(packet.d.message_id)) return; // stops if the message exists in the bot's cache.

        log(util.inspect(packet));

        channel.messages.fetch(packet.d.message_id, true).then(m => {
            let emoji = packet.d.emoji.id ? packet.d.emoji.id : packet.d.emoji.name;
            let reaction = m.reactions.cache.get(emoji);
            let user = bot.users.cache.get(packet.d.user_id);

            function s2() {
                log('old emoji detected');
                if (!reaction) {
                    log(util.inspect(m.reactions.cache));
                    log(`get ${emoji}`);
                } else {
                    reaction.users.cache.set(packet.d.user_id, user);
                    bot.emit('messageReactionAdd', reaction, user);
                }
            }

            if(!user || user.partial) {
                if (channel.guild !== null && channel.guild !== undefined && channel.type === 'text') {
                    log('fetch manual')
                    channel.guild.members.fetch({ user: packet.d.user_id }).then(mem => {
                        user = mem.user;
                        s2()
                    });
                } else {
                    return;
                }
            } else {
                s2()
            }
        }).catch(err => {
            log(err.stack, 'error');
        });
    } else
    if(packet.t === 'MESSAGE_DELETE') {
        // this packet does not contain the actual message data, unfortunately.
        // as of writing, this only contains the message ID, the channel ID, and the guild ID.
        bot.setTimeout(() => {
            if (bot.memory.rdel.includes(packet.d.id)) return; // stops if the message exists in the bot's cache.
            if (packet.d.guild_id !== bot.cfg.guilds.optifine) return;

            let mt = djs.SnowflakeUtil.deconstruct(packet.d.id).date;

            let desc = [
                `Message originally posted on ${mt.toUTCString()}`,
                `(${timeago.format(mt)})`
            ];

            let logEntry = new bot.util.LogEntry(bot, {time: now, channel: "delete"})
            .setColor(bot.cfg.embed.error)
            .setIcon(bot.icons.find('ICO_trash'))
            .setTitle(`(Uncached) Message Deleted`, `Uncached Message Deletion Report`)
            .setDescription(desc.join('\n'), desc.join(' '))
            .addSection(`Message Location`, `${bot.channels.cache.get(packet.d.channel_id).toString()} | [Direct URL](https://discordapp.com/channels/${packet.d.guild_id}/${packet.d.channel_id}/${packet.d.id}) (deleted)`)
            logEntry.submit()
        }, 100);
    }
});

////////////////////////////////////////
// Message Reaction Add
////////////////////////////////////////

bot.on('messageReactionAdd', (mr, user) => {
    if (mr.message.channel.type === 'dm') return;
    if (user.id === bot.user.id) return;

    if (mr.emoji.id === bot.cfg.emoji.deleter) {
        bot.db.msg.find({message: mr.message.id}, (err, docs) => {
            if(err) {
                log(err.stack, 'error');
            } else
            if(docs.length > 0) {
                if(docs[0].user === user.id) {
                    if(mr.message.content.indexOf(bot.cfg.messages.confirmDelete) > -1) {
                        mr.message.delete().then(() => {
                            bot.db.msg.remove(docs[0], {}, (err) => {
                                if (err) {
                                    log(err.stack, 'error');
                                } else {
                                    log('Bot message deleted at user request.');
                                }
                            });
                        }).catch(err => {
                            log(err.stack, 'error');
                        });
                    } else {
                        let nm = `${mr.message.content}\n\n${bot.cfg.messages.confirmDelete}`;
                        if(nm.length === 2000 /* incredibly unlikely, but better safe than sorry */ || mr.message.content.length === 0 || mr.message.content === '_ _') {
                            nm = bot.cfg.messages.confirmDelete;
                        }

                        mr.message.edit(nm).catch(err => {
                            log(err.stack, 'error');
                        });
                    }
                }
            }
        });
    }
});

////////////////////////////////////////
// Ratelimit
////////////////////////////////////////

bot.on('rateLimit', rl => {
    let rlInfo = [
        `Timeout: ${rl.timeout}`,
        `Request Limit: ${rl.limit}`,
        `HTTP Method: ${rl.method}`,
        `Path: ${rl.path}`,
        `Route: ${rl.route}`
    ].join('\n');

    log("OptiBot is being ratelimited! \n" + rlInfo, 'warn');
});

////////////////////////////////////////
// Server Outage
////////////////////////////////////////

bot.on('guildUnavailable', (guild) => {
    log(`Guild Unavailable! \nUnable to connect to "${guild.name}" \nGuild ID: ${guild.id}`, 'warn');
});

////////////////////////////////////////
// Guild Updated
////////////////////////////////////////

bot.on('guildUpdate', (oldg, newg) => {
    if(oldg.available === false && newg.available === true) {
        log(`Guild available! \n"${newg.name}" has recovered. \nGuild ID: ${guild.id}`, 'warn');
        if(newg.id === bot.cfg.guilds.optifine) {
            bot.memory._temp();
        }
    }
});

////////////////////////////////////////
// Shard Ready
////////////////////////////////////////

bot.on('shardReady', (id, guilds) => {
    log(`Shard WebSocket ready. \nShard ID: ${id} \nUnavailable Guilds: ${(guilds) ? '\n'+[...guilds].join('\n') : 'None.'}`, 'info');
    bot.setWindowTitle()
});

////////////////////////////////////////
// Shard Disconnect
////////////////////////////////////////

bot.on('shardDisconnect', (event, id) => {
    function getCodeName(code) {
        if(code >= 0 && code <= 999) {
            return 'Reserved';
        } else
        if(code === 1000) {
            return 'Normal Closure';
        } else
        if(code === 1001) {
            return 'Going Away';
        } else
        if(code === 1002) {
            return 'Protocol Error';
        } else
        if(code === 1003) {
            return 'Unsupported Data';
        } else
        if(code === 1004) {
            return 'Reserved';
        } else
        if(code === 1005) {
            return 'No Status Received';
        } else
        if(code === 1006) {
            return 'Abnormal Closure';
        } else
        if(code === 1007) {
            return 'Invalid Frame Payload Data';
        } else
        if(code === 1008) {
            return 'Policy Violation';
        } else
        if(code === 1009) {
            return 'Message Too Big';
        } else
        if(code === 1010) {
            return 'Missing Extension';
        } else
        if(code === 1011) {
            return 'Internal Error';
        } else
        if(code === 1012) {
            return 'Service Restart';
        } else
        if(code === 1013) {
            return 'Try Again Later';
        } else
        if(code === 1014) {
            return 'Bad Gateway';
        } else
        if(code === 1015) {
            return 'TLS Handshake';
        } else
        if(code >= 1016 && code <= 3999) {
            return 'Reserved';
        } else
        if(code === 4000) {
            return 'DISCORD: Unknown Error';
        } else
        if(code === 4001) {
            return 'DISCORD: Unknown Opcode';
        } else
        if(code === 4002) {
            return 'DISCORD: Decode Error';
        } else
        if(code === 4003) {
            return 'DISCORD: Not Authenticated';
        } else
        if(code === 4004) {
            return 'DISCORD: Authentication Failed';
        } else
        if(code === 4005) {
            return 'DISCORD: Already Authenticated';
        } else
        // there is no code 4006 for some reason
        // https://discordapp.com/developers/docs/topics/opcodes-and-status-codes
        if(code === 4007) {
            return 'DISCORD: Invalid Sequence';
        } else
        if(code === 4008) {
            return 'DISCORD: Rate Limited';
        } else
        if(code === 4009) {
            return 'DISCORD: Session Timed Out';
        } else
        if(code === 4010) {
            return 'DISCORD: Invalid Shard';
        } else
        if(code === 4011) {
            return 'DISCORD: Sharding Required';
        } else
        if(code === 4012) {
            return 'DISCORD: Invalid API Version';
        } else
        if(code === 4013) {
            return 'DISCORD: Invalid Intent';
        } else
        if(code === 4014) {
            return 'DISCORD: Disallowed Intent';
        } else {
            return 'Unknown'
        }
    }

    log(`Shard WebSocket disconnected. \nShard ID: ${id} \nEvent Code: ${event.code} (${getCodeName(event.code)})`, 'warn');
    bot.setWindowTitle()
});

////////////////////////////////////////
// Shard Reconnecting
////////////////////////////////////////

bot.on('shardReconnecting', id => {
    log(`Shard WebSocket reconnecting... \nShard ID: ${id}`, 'warn');
    bot.setWindowTitle()
});

////////////////////////////////////////
// Shard Resume
////////////////////////////////////////

bot.on('shardResume', (id, replayed) => {
    log(`Shard WebSocket resumed. \nShard ID: ${id} \nEvents replayed: ${replayed}`, 'info');
    bot.setWindowTitle()
});

////////////////////////////////////////
// Shard Error
////////////////////////////////////////

bot.on('shardError', (err, id) => {
    log(`Shard WebSocket connection error. \nShard ID: ${id} \nStack: ${err.stack || err}`, 'error');
    bot.setWindowTitle()
});

////////////////////////////////////////
// Client Session Invalidated
////////////////////////////////////////

bot.on('invalidated', () => {
    log('Session Invalidated.', 'fatal');
    setWindowTitle('Session invalidated.')
    process.exit(1);
});

////////////////////////////////////////
// Client Warning
////////////////////////////////////////

bot.on('warn', info => {
    log(info, 'warn');
});

////////////////////////////////////////
// Client Debug
////////////////////////////////////////

bot.on('debug', info => {
    log(info, 'debug');
});

////////////////////////////////////////
// Client Error
////////////////////////////////////////

bot.on('error', err => {
    log(err.stack || err, 'error');
});

////////////////////////////////////////
// Guild Member Chunk Received
////////////////////////////////////////

bot.on('guildMembersChunk', (members, guild) => {
    log(`Guild member chunk received. \nSize: ${members.size}\nGuild: ${guild.name} (${guild.id})`, 'debug');
});
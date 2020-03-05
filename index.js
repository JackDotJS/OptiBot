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
const msgFinalizer = require(`./modules/util/msgFinalizer.js`)
const erm = require(`./modules/util/simpleError.js`);
const OptiBot = require(`./modules/core/optibot.js`);

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

const bot = new OptiBot({}, (process.argv[2] === 'true'), log);

process.title = `OptiBot ${bot.version} | Connecting...`;

bot.login(bot.keys.discord).catch(err => {
    process.title = `OptiBot ${bot.version} | Connection Failed.`;
    log(err, 'fatal');
    process.exit(1);
});

////////////////////////////////////////
// Bot Ready
////////////////////////////////////////

bot.on('ready', () => {
    if(bot.memory.bot.init) {
        log('Successfully connected to Discord API.', 'info');

        bot.setStatus(0);

        process.title = `OptiBot ${bot.version} | Loading Assets...`;
        
        bot.loadAssets().then((time) => {
            bot.setStatus(1);

            let width = 64; //inner width of box
            function centerText(text, totalWidth) {
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

            let embed = new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setAuthor('OptiBot Initialized', bot.icons.find('ICO_info'))
            .setTitle(`Version: ${bot.version}`)
            .setDescription(`Boot Time: ${process.uptime().toFixed(3)} second(s)`)
            .addField('The following message was brought to you by Math.random()®️', `\`\`\`${bot.splash[~~(Math.random() * bot.splash.length)]}\`\`\``)
            .setThumbnail(bot.user.displayAvatarURL)
            .setFooter(`Event logged on ${new Date().toUTCString()}`)
            .setTimestamp(new Date())

            bot.guilds.cache.get(bot.cfg.logging.guild).channels.cache.get(bot.cfg.logging.channel).send({embed: embed});

            process.send({
                type: 'ready'
            });

            bot.memory.bot.init = false;
        }).catch(err => {
            log(err.stack, 'fatal');
            bot.exit(1);
        });
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
        if(!bot.debug) {
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

    if(input.valid) {
        /////////////////////////////////////////////////////////////
        // COMMAND HANDLER
        /////////////////////////////////////////////////////////////

        bot.guilds.cache.get(bot.cfg.guilds.optifine).members.fetch(m.author.id).then(member => {

            /**
             * Authorization Level
             * 
             * 0 = Normal Member
             * 1 = Junior Moderator
             * 2 = Senior Moderator
             * 3 = Administrator
             * 4 = Developer
             */
            let authlvl = 0;
            
            if(bot.cfg.superusers.indexOf(m.author.id) > -1) {
                authlvl = 4;
            } else
            if(member.permissions.has('ADMINISTRATOR')) {
                authlvl = 3;
            } else 
            if(member.roles.cache.has(bot.cfg.roles.moderator)) {
                authlvl = 2;
            } else
            if(member.roles.cache.has(bot.cfg.roles.jrmod)) {
                authlvl = 1;
            }

            if(authlvl < 4) return; // REMOVE ON PUBLIC RELEASE

            bot.commands.find(input.cmd).then(cmd => {
                let unknownCMD = () => {
                    let ratings = [];
                                
                    bot.commands.index.filter((thisCmd) => thisCmd.metadata.authlevel <= authlvl && !thisCmd.metadata.tags['HIDDEN'])
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

                    m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot));
                }

                let checkMisuse = (msg) => {
                    let embed = new djs.MessageEmbed()
                    .setAuthor(msg, bot.icons.find('ICO_error'))
                    .setColor(bot.cfg.embed.error)

                    let content = '_ _';

                    if(cmd.metadata.tags['DELETE_ON_MISUSE']) {
                        m.delete().catch(err => {
                            log(err.stack, 'error');
                        });
                        content = m.author;
                        embed.setDescription('This message will self-destruct in 10 seconds.');
                    }

                    m.channel.send(content, {embed: embed}).then(msg => {
                        if(cmd.metadata.tags['DELETE_ON_MISUSE']) {
                            msg.delete(10000);
                        } else {
                            msgFinalizer(m.author.id, bm, bot)
                        }
                    });
                }

                if(cmd && ((m.channel.type === 'text' && m.guild.id === bot.cfg.guilds.optifine) || (m.channel.type === 'dm'))) {
                    log(`[LVL${authlvl}] [${(m.channel.type === 'dm') ? "DM" : '#'+m.channel.name}] Command issued by ${m.author.tag} (${m.author.id}) : ${(cmd.metadata.tags['CONFIDENTIAL']) ? m.content.replace(/\S/gi, '*') : m.content}`, 'info')
                }

                if(!cmd) {
                    unknownCMD();
                } else
                if(authlvl < cmd.metadata.authlevel) {
                    if(cmd.metadata.tags['HIDDEN']) {
                        unknownCMD();
                    } else {
                        checkMisuse('You do not have permission to use this command.');
                    }
                } else 
                if(cmd.metadata.tags['NO_DM'] && m.channel.type === 'dm' && (authlvl < 4 || cmd.metadata.tags['STRICT'])) {
                    checkMisuse('This command cannot be used in DMs.');
                } else
                if(cmd.metadata.tags['DM_ONLY'] && m.channel.type !== 'dm' && (authlvl < 4 || cmd.metadata.tags['STRICT'])) {
                    checkMisuse('This command can only be used in DMs.');
                } else
                if(cmd.metadata.tags['BOT_CHANNEL_ONLY'] && m.channel.type !== 'dm' && (bot.cfg.channels.bot.indexOf(m.channel.id) === -1 && bot.cfg.channels.bot.indexOf(m.channel.parentID) === -1) && (authlvl === 0 || cmd.metadata.tags['STRICT'])) {
                    checkMisuse('This command can only be used in DMs OR the #optibot channel.');
                } else
                if(cmd.metadata.tags['MOD_CHANNEL_ONLY'] && m.channel.type !== 'dm' && (bot.cfg.channels.mod.indexOf(m.channel.id) === -1 && bot.cfg.channels.mod.indexOf(m.channel.parentID) === -1) && (authlvl < 4 || cmd.metadata.tags['STRICT'])) {
                    checkMisuse('This command can only be used in moderator-only channels.');
                } else {
                    if(!cmd.metadata.tags['INSTANT']) m.channel.startTyping();
                    bot.setTimeout(() => {
                        try {
                            cmd.exec(m, input.args, {member, authlvl, input, cmd});
                        }
                        catch (err) {
                            if(!cmd.metadata.tags['INSTANT']) m.channel.stopTyping()
                            erm(err, bot, {m: m})
                        }
                    }, (cmd.metadata.tags['INSTANT']) ? 10 : Math.round(bot.ping)+250)
                }

            }).catch(err => {
                log(err.stack, 'error');
            })
        }).catch(err => {
            if (err.code === 10007) {
                erm('Sorry, you must be a member of the OptiFine Discord server to use this bot.', bot, {m: m});
            } else {
                throw (err);
            }
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
        if(m.content.indexOf('discordapp.com') > -1) {
            let urls = m.content.match(/\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/gi);

            if(urls !== null) {
                for(let link of urls) {
                    let seg = link.split(/(?<!\/)\/(?!\/)|(?<!\\)\\(?!\\)/g).reverse();

                    if(!isNaN(parseInt(seg[0])) && !isNaN(parseInt(seg[1])) && !isNaN(parseInt(seg[2]))) {
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
    
                            m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot));
                        }).catch(err => {
                            log(err.stack, 'error');
                        });
                    }
                }
            }
        }

        if (m.mentions.has(bot.user)) {
            m.react(bot.guilds.cache.get(bot.cfg.guilds.optifine).emojis.cache.get('663409134644887572'));
        }
    }
});

////////////////////////////////////////
// Node.js Parent Node Message
////////////////////////////////////////

process.on('message', (m) => {
    if(m.crashlog !== null) {
        log('got crash data', 'trace');
        bot.guilds.cache.get(bot.cfg.guilds.optifine).members.fetch('181214529340833792').then(jack => {
            jack.send(`**=== OptiBot Crash Recovery Report ===**`, new djs.MessageAttachment(`./logs/${m.crashlog}`));
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
    let timeNow = new Date();
    if (m.channel.type === 'dm') return;
    //if (m.guild.id !== bot.cfg.guilds.optifine) return;
    if (m.author.system || m.author.bot) return;
    if (bot.parseInput(m).cmd === 'dr') return;

    bot.setTimeout(() => {
        log('begin calculation of executor', 'trace')
        bot.guilds.cache.get(bot.cfg.guilds.optifine).fetchAuditLogs({ limit: 10, type: 'MESSAGE_DELETE' }).then((audit) => {

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
                let zw = "​"; // zero width character, NOT an empty string. only needed to fix emoji-only messages on mobile from being gigantic.
                let embed = new djs.MessageEmbed()
                .setColor(bot.cfg.embed.error)
                .setDescription(`Original message posted on ${m.createdAt.toUTCString()}\n(${timeago.format(m.createdAt)})`)
                .addField('Author', `${m.author} | ${m.author.tag} \n\`\`\`yaml\n${m.author.id}\`\`\``)
                .addField(`Message Location`, `${m.channel}`)
                .setFooter(`Event logged on ${timeNow.toUTCString()}`)
                .setTimestamp(timeNow)

                let files;
                let contents = [
                    '////////////////////////////////////////////////////////////////',
                    'OptiLog Message Deletion Report',
                    `Date: ${timeNow.toUTCString()}`,
                    '////////////////////////////////////////////////////////////////',
                    '',
                ]

                if(dType === 1) {
                    embed.setAuthor(`Message Deleted by Moderator`, bot.icons.find('ICO_trash'))
                    .addField('Moderator Responsible', `${dlog.executor} | ${dlog.executor.tag} \n\`\`\`yaml\n${dlog.executor.id}\`\`\``)

                    if(dlog.reason !== null) embed.addField('Reason', dlog.reason)

                    contents.push([
                        `Executor: Moderator`,
                        `Moderator Responsible: ${dlog.executor.tag} (${dlog.executor.id})`,
                        `Reason: ${(dlog.reason === null) ? 'No reason provided.' : dlog.reason}`,
                        ``,
                        '////////////////////////////////////////////////////////////////',
                    ].join('\n'))
                } else 
                if(m.member !== null && m.member.deleted) {
                    embed.setAuthor(`Message Deleted`, bot.icons.find('ICO_trash'))
                    embed.addField('Note', 'This message *may* have been deleted as part of a user ban.');

                    contents.push([
                        `Executor: Unknown`,
                        `Notice: This message was likely deleted during a user ban`,
                        ``,
                        '////////////////////////////////////////////////////////////////',
                    ].join('\n'))
                } else {
                    embed.setAuthor(`Message Deleted by Author`, bot.icons.find('ICO_trash'))

                    contents.push([
                        `Executor: Author`,
                        ``,
                        '////////////////////////////////////////////////////////////////',
                    ].join('\n'))
                }
                if(m.content.length > 1000) {
                    embed.addField('Deleted Message (Truncated)', `${(typeof m.content === 'string') ? m.content.substring(0, 1000) : 'null'}​...`)
                    .setTitle('The contents of this message are too long to show in an embed. See the attached file above for details.')
                } else {
                    embed.addField('Deleted Message', `${m.content || 'null'}​${zw}`)
                }

                contents.push([
                    `Author: ${m.author.tag} (${m.author.id})`,
                    `Post Date: ${m.createdAt.toUTCString()}`,
                    `Message ID: ${m.id}`,
                    `Location: #${m.channel.name} (${m.channel.id})`,
                    '',
                    `Message Content:`,
                    m.content,
                    ``
                ].join('\n'));

                let attach = [];
                if (m.attachments.size > 0) {
                    m.attachments.each(at => {
                        attach.push(at.url);
                    });

                    contents.push([
                        'Attachments:',
                        attach.join('\n'),
                        '',
                    ].join('\n'))

                    embed.addField('Message Attachments', attach.join('\n'));
                }

                contents.push('////////////////////////////////////////////////////////////////');

                if(m.content.length > 1000) files = [new djs.MessageAttachment(Buffer.from(contents.join('\n')), 'optilog_deleted_message.txt')];

                bot.guilds.cache.get(bot.cfg.logging.guild).channels.cache.get(bot.cfg.logging.channel).send({embed: embed, files: files});
                
                bot.memory.audit = [...audit.entries.values()];
            }
        })
    }, 2000);
});

bot.on('messageDeleteBulk', ms => {
    let timeNow = new Date();

    let contents = [
        '////////////////////////////////////////////////////////////////',
        'OptiLog Multiple Message Deletion Report',
        `Date: ${timeNow.toUTCString()}`,
        '////////////////////////////////////////////////////////////////',
        ''
    ]
    ms.each(m => {
        let tm = [
            `Author: ${m.author.tag} (${m.author.id})`,
            `Post Date: ${m.createdAt.toUTCString()}`,
            `Message ID: ${m.id}`,
            `Location: #${m.channel.name} (${m.channel.id})`,
            ``,
            `Message Content:`,
            m.content
        ]

        if (m.attachments.size > 0) {
            tm.push('');
            tm.push('Attachments:')
            m.attachments.each(at => {
                tm.push(at.url);
            });
        }

        tm.push('\n////////////////////////////////////////////////////////////////\n',)

        contents.push(tm.join('\n'));
    });

    // todo: add config for "files" channel in optibot server
    // need to do something similar for other events that post raw text files
    bot.guilds.cache.get(bot.cfg.logging.guild).channels.cache.get(bot.cfg.logging.channel).send({
        files: [new djs.MessageAttachment(Buffer.from(contents.join('\n')), 'optilog_bulk_deleted_messages.txt')]
    }).then(am => {
        let embed = new djs.MessageEmbed()
        .setColor(bot.cfg.embed.error)
        .setAuthor(`Multiple Messages Deleted`, bot.icons.find('ICO_trash'))
        .setTitle(`See linked file for details.`)
        .setURL([...am.attachments.values()][0].url)
        .setFooter(`Event logged on ${timeNow.toUTCString()}`)
        .setTimestamp(timeNow);

        bot.guilds.cache.get(bot.cfg.logging.guild).channels.cache.get(bot.cfg.logging.channel).send({
            embed: embed
        });
    });
});

////////////////////////////////////////
// Message Edited
////////////////////////////////////////

bot.on('messageUpdate', (m, mNew) => {
    let timeNow = new Date();
    if (m.channel.type === 'dm') return;
    if (mNew.guild.id !== bot.cfg.guilds.optifine) return;
    if (m.author.system || m.author.bot) return;
    if (m.content.trim().toLowerCase() == mNew.content.trim().toLowerCase()) return;
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

    bot.guilds.cache.get(bot.cfg.logging.guild).channels.cache.get(bot.cfg.logging.channel).send({embed: embed, files: files});
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

        bot.guilds.cache.get(bot.cfg.logging.guild).channels.cache.get(bot.cfg.logging.channel).send({embed: embed});
    }
});

////////////////////////////////////////
// User Joined
////////////////////////////////////////

bot.on('guildMemberAdd', member => {
    let timeNow = new Date();
    let count = bot.guilds.cache.get(bot.cfg.guilds.optifine).memberCount;
    if (member.guild.id !== bot.cfg.guilds.optifine) return;

    let embed = new djs.MessageEmbed()
    .setColor(bot.cfg.embed.okay)
    .setAuthor('New Member', bot.icons.find('ICO_join'))
    .setDescription(`${member} | ${member.user.tag} \n\`\`\`yaml\n${member.user.id}\`\`\``)
    .setThumbnail(member.user.displayAvatarURL)
    .addField('Account Creation Date', `${member.user.createdAt.toUTCString()} (${timeago.format(member.user.createdAt)})`)
    .addField('New Member Count', count.toLocaleString())
    .setFooter(`Event logged on ${timeNow.toUTCString()}`)
    .setTimestamp(timeNow)

    if((member.user.createdAt.getTime() + (1000 * 60 * 60 * 24 * 7)) > timeNow.getTime()) {
        embed.setTitle('Warning: New Discord Account')
    }

    bot.guilds.cache.get(bot.cfg.logging.guild).channels.cache.get(bot.cfg.logging.channel).send({embed: embed}).then(() => {
        if(count % 1000 === 0) {
            let embed = new djs.MessageEmbed()
            .setColor(bot.cfg.embed.okay)
            .setAuthor('Milestone Achieved', bot.icons.find('ICO_star'))
            .setTitle(`This server has reached ${count.toLocaleString()} members!`)
            .setDescription(`User ${member} (${member.user.tag}) was our ${count.toLocaleString()}th member.`)
            .setThumbnail(member.user.displayAvatarURL)
            .setFooter(`Event logged on ${timeNow.toUTCString()}`)
            .setTimestamp(timeNow)
    
            bot.guilds.cache.get(bot.cfg.logging.guild).channels.cache.get(bot.cfg.logging.channel).send({embed: embed});
        }
    });
});

////////////////////////////////////////
// User Left/Kicked
////////////////////////////////////////

bot.on('guildMemberRemove', member => {
    let timeNow = new Date();
    if (member.guild.id !== bot.cfg.guilds.optifine) return;

    bot.setTimeout(() => {
        bot.guilds.cache.get(bot.cfg.guilds.optifine).fetchAuditLogs({ limit: 10 }).then((audit) => {
            let ad = [...audit.entries.values()];

            for(let i = 0; i < ad.length; i++) {
                if (ad[i].target.id === member.user.id && (ad[i].action === 'MEMBER_KICK' || ad[i].action === 'MEMBER_BAN_ADD')) {
                    if(ad[i].action === 'MEMBER_KICK') {
                        let embed = new djs.MessageEmbed()
                        .setColor(bot.cfg.embed.error)
                        .setAuthor('User Kicked', bot.icons.find('ICO_kick'))
                        .setTitle((ad[i].reason) ? "Reason: "+ad[i].reason : "No reason provided.")
                        .addField('Kicked User', `${member} | ${member.user.tag} \n\`\`\`yaml\n${member.user.id}\`\`\``)
                        .addField('Moderator Responsible', `${ad[i].executor} | ${ad[i].executor.tag} \n\`\`\`yaml\n${ad[i].executor.id}\`\`\``)
                        .setThumbnail(member.user.displayAvatarURL)
                        .setFooter(`Event logged on ${timeNow.toUTCString()}`)
                        .setTimestamp(timeNow)

                        bot.guilds.cache.get(bot.cfg.logging.guild).channels.cache.get(bot.cfg.logging.channel).send({embed: embed});
                    }
                    break;
                } else
                if (i+1 === ad.length) {
                    let embed = new djs.MessageEmbed()
                    .setColor(bot.cfg.embed.error)
                    .setAuthor('Member Left', bot.icons.find('ICO_leave'))
                    .setDescription(`${member} | ${member.user.tag} \n\`\`\`yaml\n${member.user.id}\`\`\``)
                    .addField('Initial Join Date', (member.joinedAt !== null) ? `${member.joinedAt.toUTCString()}\n(${timeago.format(member.joinedAt)})` : 'Unknown.')
                    .addField('New Member Count', bot.guilds.cache.get(bot.cfg.guilds.optifine).memberCount.toLocaleString())
                    .setThumbnail(member.user.displayAvatarURL)
                    .setFooter(`Event logged on ${timeNow.toUTCString()}`)
                    .setTimestamp(timeNow)

                    bot.guilds.cache.get(bot.cfg.logging.guild).channels.cache.get(bot.cfg.logging.channel).send({embed: embed});
                }
            }
        }).catch(err => log(err.stack, 'error'));
    }, 2000);
});

////////////////////////////////////////
// User Banned
////////////////////////////////////////

bot.on('guildBanAdd', (guild, user) => {
    let timeNow = new Date();
    if (guild.id !== bot.cfg.guilds.optifine) return;

    bot.setTimeout(() => {
        bot.guilds.cache.get(bot.cfg.guilds.optifine).fetchAuditLogs({ limit: 10, type: 'MEMBER_BAN_ADD' }).then((audit) => {
            let ad = [...audit.entries.values()];

            for(let i = 0; i < ad.length; i++) {
                if (ad[i].target.id === user.id) {
                    let embed = new djs.MessageEmbed()
                    .setColor(bot.cfg.embed.error)
                    .setAuthor('User Banned', bot.icons.find('ICO_ban'))
                    .setTitle((ad[i].reason) ? "Reason: "+ad[i].reason : "No reason provided.")
                    .addField('Banned User', `${user} | ${user.tag} \n\`\`\`yaml\n${user.id}\`\`\``)
                    .addField('Moderator Responsible', `${ad[i].executor} | ${ad[i].executor.tag} \n\`\`\`yaml\n${ad[i].executor.id}\`\`\``)
                    .setThumbnail(user.displayAvatarURL)
                    .setFooter(`Event logged on ${timeNow.toUTCString()}`)
                    .setTimestamp(timeNow)

                    bot.guilds.cache.get(bot.cfg.logging.guild).channels.cache.get(bot.cfg.logging.channel).send({embed: embed});
                    break;
                } else
                if (i+1 === ad.length) {
                    let embed = new djs.MessageEmbed()
                    .setColor(bot.cfg.embed.error)
                    .setAuthor('User Banned', bot.icons.find('ICO_ban'))
                    .setTitle(`Log Error: Unable to determine Moderator responsible. See Audit Logs.`)
                    .addField('Banned User', `${user} | ${user.tag} \n\`\`\`yaml\n${user.id}\`\`\``)
                    .setThumbnail(user.displayAvatarURL)
                    .setFooter(`Event logged on ${timeNow.toUTCString()}`)
                    .setTimestamp(timeNow)

                    bot.guilds.cache.get(bot.cfg.logging.guild).channels.cache.get(bot.cfg.logging.channel).send({embed: embed});
                }
            }
        }).catch(err => log(err.stack, 'error'));
    }, 2000);
});

////////////////////////////////////////
// User Ban Revoked
////////////////////////////////////////

bot.on('guildBanRemove', (guild, user) => {
    let timeNow = new Date();
    if (guild.id !== bot.cfg.guilds.optifine) return;

    bot.setTimeout(() => {
        bot.guilds.cache.get(bot.cfg.guilds.optifine).fetchAuditLogs({ limit: 10, type: 'MEMBER_BAN_REMOVE' }).then((audit) => {
            let ad = [...audit.entries.values()];

            for(let i = 0; i < ad.length; i++) {
                if (ad[i].target.id === user.id) {
                    let embed = new djs.MessageEmbed()
                    .setColor(bot.cfg.embed.default)
                    .setAuthor('Ban Revoked', bot.icons.find('ICO_unban'))
                    .addField('Unbanned User', `${user} | ${user.tag} \n\`\`\`yaml\n${user.id}\`\`\``)
                    .addField('Moderator Responsible', `${ad[i].executor} | ${ad[i].executor.tag} \n\`\`\`yaml\n${ad[i].executor.id}\`\`\``)
                    .setThumbnail(user.displayAvatarURL)
                    .setFooter(`Event logged on ${timeNow.toUTCString()}`)
                    .setTimestamp(timeNow)

                    bot.guilds.cache.get(bot.cfg.logging.guild).channels.cache.get(bot.cfg.logging.channel).send({embed: embed});
                    break;
                } else
                if (i+1 === ad.length) {
                    let embed = new djs.MessageEmbed()
                    .setColor(bot.cfg.embed.default)
                    .setAuthor('Ban Revoked', bot.icons.find('ICO_ban'))
                    .setTitle(`Log Error: Unable to determine Moderator responsible. See Audit Logs.`)
                    .addField('Unbanned User', `${user} | ${user.tag} \n\`\`\`yaml\n${user.id}\`\`\``)
                    .setThumbnail(user.displayAvatarURL)
                    .setFooter(`Event logged on ${timeNow.toUTCString()}`)
                    .setTimestamp(timeNow)

                    bot.guilds.cache.get(bot.cfg.logging.guild).channels.cache.get(bot.cfg.logging.channel).send({embed: embed});
                }
            }
        }).catch(err => log(err.stack, 'error'));
    }, 2000);
});

////////////////////////////////////////
// Raw Packet Data
////////////////////////////////////////

bot.on('raw', packet => {
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

            if(!user) {
                if (channel.guild !== null && channel.guild !== undefined && channel.type === 'text') {
                    // todo: fetch user manually
                    log('fetch manual')
                    channel.guild.members.fetch(packet.d.user_id).then(mem => {
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

        // i was planning on using this to extend the message deletion event to be able to log old deleted messages, but this doesn't even contain the contents so it's a little bit useless now.

        // I might still use this anyway, sometime in the future.
    }
});

////////////////////////////////////////
// Message Reaction Add
////////////////////////////////////////

bot.on('messageReactionAdd', (mr, user) => {
    if (mr.message.channel.type === 'dm') return;
    if (user.id === bot.user.id) return;

    if (mr.emoji.name === bot.cfg.emoji.medal) {
        // todo
    } else 
    if (mr.emoji.id === bot.cfg.emoji.deleter) {
        bot.db.msg.find({message: mr.message.id}, (err, docs) => {
            if(err) {
                log(err.stack, 'error');
            } else
            if(docs.length > 0) {
                if(docs[0].user === user.id) {
                    if(mr.message.content === bot.cfg.messages.confirmDelete) {
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
                        mr.message.edit(bot.cfg.messages.confirmDelete).catch(err => {
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
// Shard Ready
////////////////////////////////////////

bot.on('shardReady', (id, guilds) => {
    log(`Shard WebSocket ready. \nShard ID: ${id} \nUnavailable Guilds: ${(guilds) ? '\n'+[...guilds].join('\n') : 'None.'}`, 'info');
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
});

////////////////////////////////////////
// Shard Reconnecting
////////////////////////////////////////

bot.on('shardReconnecting', id => {
    log(`Shard WebSocket reconnecting... \nShard ID: ${id}`, 'warn');
});

////////////////////////////////////////
// Shard Resume
////////////////////////////////////////

bot.on('shardResume', (id, replayed) => {
    log(`Shard WebSocket resumed. \nShard ID: ${id} \nEvents replayed: ${replayed}`, 'info');
});

////////////////////////////////////////
// Shard Error
////////////////////////////////////////

bot.on('shardError', (err, id) => {
    log(`Shard WebSocket connection error. \nShard ID: ${id} \nStack: ${err.stack || err}`, 'error');
});

////////////////////////////////////////
// Client Session Invalidated
////////////////////////////////////////

bot.on('invalidated', () => {
    log('Session Invalidated.', 'fatal');
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

/* bot.on('debug', info => {
    log(info, 'debug');
}); */

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
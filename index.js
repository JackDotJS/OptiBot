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
const errMsg = require(`./modules/util/simpleError.js`);
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

const bot = new OptiBot({}, Boolean(process.argv[2]), log);

bot.login(bot.keys.discord.main).then(() => {
    if(typeof bot.keys.discord.log === 'string') {
        bot.memory.log = new djs.Client();
        bot.memory.log.login(bot.keys.discord.log).catch(err => {
            log(err, 'fatal');
        });
    }
}).catch(err => {
    log(err, 'fatal');
});

////////////////////////////////////////
// Bot Ready Event
////////////////////////////////////////

bot.on('ready', () => {
    if(bot.memory.bot.init) {
        process.title = `Loading...`;
        log('Successfully connected to Discord API.', 'info');

        bot.setStatus(0);

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

            if(bot.keys.discord.log) bot.memory.bot.bootTime = process.uptime().toFixed(3);

            process.title = `OptiBot ${bot.version}`;

            process.send({
                type: 'ready'
            });

            if(bot.memory.log === null) bot.memory.bot.init = false;
        }).catch(err => {
            log(err.stack, 'fatal');
            bot.exit(1);
        });
    }
});

if(bot.memory.log !== null) bot.memory.log.on('ready', () => {
    if(bot.memory.bot.init) {
        let timeNow = new Date();
        log('OptiLog ready.', 'warn');
        bot.memory.log.user.setStatus('invisible');

        let embed = new djs.RichEmbed()
        .setColor(bot.cfg.embed.default)
        .setAuthor('OptiBot Initialized', bot.icons.find('ICO_info'))
        .setTitle(`Version: ${bot.version}`)
        .setDescription(`Boot Time: ${bot.memory.bot.bootTime} second(s)`)
        .addField('The following message was brought to you by Math.random()®️', `\`\`\`${bot.splash[~~(Math.random() * bot.splash.length)]}\`\`\``)
        .setThumbnail(bot.user.displayAvatarURL)
        .setFooter(`Event logged on ${timeNow.toUTCString()}`)
        .setTimestamp(timeNow)

        bot.memory.log.guilds.get(bot.cfg.logging.guild).channels.get(bot.cfg.logging.channel).send({embed: embed});

        bot.memory.bot.init = false;
    }
});

////////////////////////////////////////
// Message Received Event
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

    if(m.channel.type !== 'dm' && m.guild.id === bot.cfg.guilds.optibot) {
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

    let input = bot.parseInput(m.content);

    if(input.valid) {
        /////////////////////////////////////////////////////////////
        // COMMAND HANDLER
        /////////////////////////////////////////////////////////////

        bot.guilds.get(bot.cfg.guilds.optifine).fetchMember(m.author.id).then(member => {

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
            if(member.roles.has(bot.cfg.roles.moderator)) {
                authlvl = 2;
            } else
            if(member.roles.has(bot.cfg.roles.jrmod)) {
                authlvl = 1;
            }

            if(authlvl < 4) return; // REMOVE ON PUBLIC RELEASE

            bot.commands.find(input.cmd).then(cmd => {
                let unknownCMD = () => {
                    let ratings = [];
                                
                    bot.commands.index.filter((thisCmd) => thisCmd.metadata.authlevel <= authlvl && !thisCmd.metadata.tags['HIDDEN'])
                    .forEach((thisCmd) => {
                        ratings.push({
                            command: thisCmd.metadata.name,
                            distance: wink(input.cmd, thisCmd.metadata.name)
                        })
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

                    let embed = new djs.RichEmbed()
                    .setAuthor('Unknown command.', bot.icons.find('ICO_info'))
                    .setColor(bot.cfg.embed.default)

                    if (closest.distance > 0.8) {
                        embed.setDescription(`Perhaps you meant \`${bot.trigger}${closest.command}\`? (${(closest.distance * 100).toFixed(1)}% match)`)
                    }

                    m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot, log));
                }

                let checkMisuse = (msg) => {
                    let embed = new djs.RichEmbed()
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
                            msgFinalizer(m.author.id, bm, bot, log)
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
                            let embed = errMsg(err, bot, log);
                            if(!cmd.metadata.tags['INSTANT']) m.channel.stopTyping();
                            
                            m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot, log));
                        }
                    }, (cmd.metadata.tags['INSTANT']) ? 200 : 10)
                }

            }).catch(err => {
                log(err.stack, 'error');
            })
        }).catch(err => {
            if (err.code === 10007) {
                let embed = new djs.RichEmbed()
                .setAuthor('Sorry, you must be a member of the OptiFine Discord server to use this bot.', bot.icons.find('ICO_error'))
                .setColor(bot.cfg.embed.error)
    
                m.channel.send({embed: embed});
            } else {
                throw (err);
            }
        });
    } else {
        /////////////////////////////////////////////////////////////
        // TIDBIT HANDLER
        /////////////////////////////////////////////////////////////

        if (m.channel.type === 'dm') {
            let embed = new djs.RichEmbed()
            .setColor(bot.cfg.embed.default)
            //.setAuthor(`Hi there!`, bot.icons.find('ICO_info'))
            .setTitle('Hi there!')
            .setDescription(`For a list of commands, type \`${bot.trigger}list\`. If you've donated and you'd like to receive your donator role, type \`${bot.trigger}help dr\` for instructions.`)

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

                    bot.guilds.get(rg).channels.get(rc).fetchMessage(rm).then(msg => {
                        let contents = msg.content;
                        let image = null;
                        let embed = new djs.RichEmbed()
                        .setColor(bot.cfg.embed.default)
                        .setAuthor(`Message Quote`, bot.icons.find('ICO_quote'))
                        .setTitle(msg.author.tag)
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

                        m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot, log));
                    }).catch(err => {
                        log(err.stack, 'error');
                    });
                }
            }
        }

        if (m.isMentioned(bot.user)) {
            m.react(bot.guilds.get(bot.cfg.guilds.optifine).emojis.get('663409134644887572'));
        }
    }
});

////////////////////////////////////////
// Node.js Parent Node Message Event
////////////////////////////////////////

process.on('message', (m) => {
    if(m.crashlog !== null) {
        log('got crash data', 'trace');
        bot.guilds.get(bot.cfg.guilds.optifine).fetchMember('181214529340833792').then(jack => {
            jack.send(`**=== OptiBot Crash Recovery Report ===**`, new djs.Attachment(`./logs/${m.crashlog}`));
        }).catch(err => {
            log(err.stack, 'error');
        });
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
        bot.guilds.get(bot.cfg.guilds.optifine).fetchAuditLogs({ limit: 10, type: 'MESSAGE_DELETE' }).then((audit) => {

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
                let embed = new djs.RichEmbed()
                .setColor(bot.cfg.embed.error)
                .setDescription(`Original message posted on ${m.createdAt.toUTCString()}\n(${timeago.format(m.createdAt)})`)
                .addField('Author', `${m.author} | ${m.author.tag} \n\`\`\`yaml\n${m.author.id}\`\`\``)
                .addField(`Message Location`, `${m.channel} | [Direct URL](${m.url})`)
                .setFooter(`Event logged on ${timeNow.toUTCString()}`)
                .setTimestamp(timeNow)

                if(dType === 1) {
                    embed.setAuthor(`Message Deleted by Moderator`, bot.icons.find('ICO_trash'))
                    .addField('Moderator Responsible', `${dlog.executor} | ${dlog.executor.tag} \n\`\`\`yaml\n${dlog.executor.id}\`\`\``)
                    .addField('Reason', (dlog.reason === null) ? 'No reason provided.' : dlog.reason)
                } else 
                if(m.member !== null && m.member.deleted) {
                    embed.setAuthor(`Message Deleted`, bot.icons.find('ICO_trash'))
                    embed.addField('Note', 'This message *may* have been deleted as part of a user ban.');
                } else {
                    embed.setAuthor(`Message Deleted by Author`, bot.icons.find('ICO_trash'))
                }

                embed.addField('Deleted Message', m.content);

                let attach = [];
                if (m.attachments.size > 0) {
                    m.attachments.tap(at => {
                        attach.push(at.url);
                    });

                    embed.addField('Message Attachments', attach.join('\n'));
                }

                if(bot.memory.log !== null) bot.memory.log.guilds.get(bot.cfg.logging.guild).channels.get(bot.cfg.logging.channel).send({embed: embed});

                
                bot.memory.audit = [...audit.entries.values()];
            }
        })
    }, 2000);
});

bot.on('messageDeleteBulk', ms => {
    let timeNow = new Date();

    let embed = new djs.RichEmbed()
    .setColor(bot.cfg.embed.error)
    .setAuthor(`Multiple Messages Deleted`, bot.icons.find('ICO_trash'))
    .setDescription('See attached file above for details.')
    .setFooter(`Event logged on ${timeNow.toUTCString()}`)
    .setTimestamp(timeNow);

    let contents = [
        '////////////////////////////////////////////////////////////////',
        'OptiLog Multiple Message Deletion Report',
        `Date: ${timeNow.toUTCString()}`,
        '////////////////////////////////////////////////////////////////',
        ''
    ]
    ms.tap(m => {
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
            m.attachments.tap(at => {
                tm.push(at.url);
            });
        }

        tm.push('\n////////////////////////////////////////////////////////////////\n',)

        contents.push(tm.join('\n'));
    });

    if(bot.memory.log !== null) {
        bot.memory.log.guilds.get(bot.cfg.logging.guild).channels.get(bot.cfg.logging.channel).send({
            embed: embed, 
            files: [new djs.Attachment(Buffer.from(contents.join('\n')), 'deleted_messages.txt')]
        });
    }
});

////////////////////////////////////////
// Message Edited Event
////////////////////////////////////////

bot.on('messageUpdate', (m, mNew) => {
    let timeNow = new Date();
    if (m.channel.type === 'dm') return;
    if (mNew.guild.id !== bot.cfg.guilds.optifine) return;
    if (m.author.system || m.author.bot) return;
    if (m.content.trim().toLowerCase() == mNew.content.trim().toLowerCase()) return;
    if (bot.parseInput(mNew).cmd === 'dr') return;

    let embed = new djs.RichEmbed()
    .setColor(bot.cfg.embed.default)
    .setAuthor('Message Edited', bot.icons.find('ICO_edit'))
    .setDescription(`Original message posted on ${m.createdAt.toUTCString()}\n(${timeago.format(m.createdAt)})`)
    .addField('Author', `${m.author} | ${m.author.tag} \n\`\`\`yaml\n${m.author.id}\`\`\``)
    .addField('Message Location', `${m.channel} | [Direct URL](${m.url})`)
    .addField('Original Message', `${m.content}`)
    .addField('New Message', `${mNew.content}`)
    .setFooter(`Event logged on ${timeNow.toUTCString()}`)
    .setTimestamp(timeNow)

    if(bot.memory.log !== null) bot.memory.log.guilds.get(bot.cfg.logging.guild).channels.get(bot.cfg.logging.channel).send({embed: embed});
});

////////////////////////////////////////
// User Joined
////////////////////////////////////////

bot.on('guildMemberAdd', (member) => {
    let timeNow = new Date();
    if (member.guild.id !== bot.cfg.guilds.optifine) return;

    let embed = new djs.RichEmbed()
    .setColor(bot.cfg.embed.okay)
    .setAuthor('New Member', bot.icons.find('ICO_join'))
    .setDescription(`${member} | ${member.user.tag} \n\`\`\`yaml\n${member.user.id}\`\`\``)
    .setThumbnail(member.user.displayAvatarURL)
    .addField('Account Creation Date', `${member.user.createdAt.toUTCString()} (${timeago.format(member.user.createdAt)})`)
    .setFooter(`Event logged on ${timeNow.toUTCString()}`)
    .setTimestamp(timeNow)

    if((member.user.createdAt.getTime() + (1000 * 60 * 60 * 24 * 7)) > timeNow.getTime()) {
        embed.setTitle('Warning: New Discord Account')
    }

    if(bot.memory.log !== null) bot.memory.log.guilds.get(bot.cfg.logging.guild).channels.get(bot.cfg.logging.channel).send({embed: embed});

    bot.setTimeout(() => {
        let count = bot.guilds.get(bot.cfg.guilds.optifine).memberCount;

        if(count % 1000 === 0) {
            let embed = new djs.RichEmbed()
            .setColor(bot.cfg.embed.okay)
            .setAuthor('Milestone Achieved', bot.icons.find('ICO_star'))
            .setTitle(`This server has reached ${count.toLocaleString()} members!`)
            .setDescription(`User ${member} (${member.user.tag}) was our ${count.toLocaleString()}th member.`)
            .setThumbnail(member.user.displayAvatarURL)
            .setFooter(`Event logged on ${timeNow.toUTCString()}`)
            .setTimestamp(timeNow)

            if(bot.memory.log !== null) bot.memory.log.guilds.get(bot.cfg.logging.guild).channels.get(bot.cfg.logging.channel).send({embed: embed});
        }
    }, 2500);
});

////////////////////////////////////////
// User Left/Kicked
////////////////////////////////////////

bot.on('guildMemberRemove', (member) => {
    let timeNow = new Date();
    if (member.guild.id !== bot.cfg.guilds.optifine) return;

    bot.setTimeout(() => {
        bot.guilds.get(bot.cfg.guilds.optifine).fetchAuditLogs({ limit: 10 }).then((audit) => {
            let ad = [...audit.entries.values()];

            for(let i = 0; i < ad.length; i++) {
                if (ad[i].target.id === member.user.id && (ad[i].action === 'MEMBER_KICK' || ad[i].action === 'MEMBER_BAN_ADD')) {
                    if(ad[i].action === 'MEMBER_KICK') {
                        let embed = new djs.RichEmbed()
                        .setColor(bot.cfg.embed.error)
                        .setAuthor('User Kicked', bot.icons.find('ICO_kick'))
                        .setTitle((ad[i].reason) ? "Reason: "+ad[i].reason : "No reason provided.")
                        .addField('Kicked User', `${member} | ${member.user.tag} \n\`\`\`yaml\n${member.user.id}\`\`\``)
                        .addField('Moderator Responsible', `${ad[i].executor} | ${ad[i].executor.tag} \n\`\`\`yaml\n${ad[i].executor.id}\`\`\``)
                        .setThumbnail(member.user.displayAvatarURL)
                        .setFooter(`Event logged on ${timeNow.toUTCString()}`)
                        .setTimestamp(timeNow)

                        if(bot.memory.log !== null) bot.memory.log.guilds.get(bot.cfg.logging.guild).channels.get(bot.cfg.logging.channel).send({embed: embed});
                    }
                    break;
                } else
                if (i+1 === ad.length) {
                    let embed = new djs.RichEmbed()
                    .setColor(bot.cfg.embed.error)
                    .setAuthor('Member Left', bot.icons.find('ICO_leave'))
                    .setDescription(`${member} | ${member.user.tag} \n\`\`\`yaml\n${member.user.id}\`\`\``)
                    .setThumbnail(member.user.displayAvatarURL)
                    .setFooter(`Event logged on ${timeNow.toUTCString()}`)
                    .setTimestamp(timeNow)

                    if(bot.memory.log !== null) bot.memory.log.guilds.get(bot.cfg.logging.guild).channels.get(bot.cfg.logging.channel).send({embed: embed});
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
        bot.guilds.get(bot.cfg.guilds.optifine).fetchAuditLogs({ limit: 10, type: 'MEMBER_BAN_ADD' }).then((audit) => {
            let ad = [...audit.entries.values()];

            for(let i = 0; i < ad.length; i++) {
                if (ad[i].target.id === user.id) {
                    let embed = new djs.RichEmbed()
                    .setColor(bot.cfg.embed.error)
                    .setAuthor('User Banned', bot.icons.find('ICO_ban'))
                    .setTitle((ad[i].reason) ? "Reason: "+ad[i].reason : "No reason provided.")
                    .addField('Banned User', `${user} | ${user.tag} \n\`\`\`yaml\n${user.id}\`\`\``)
                    .addField('Moderator Responsible', `${ad[i].executor} | ${ad[i].executor.tag} \n\`\`\`yaml\n${ad[i].executor.id}\`\`\``)
                    .setThumbnail(user.displayAvatarURL)
                    .setFooter(`Event logged on ${timeNow.toUTCString()}`)
                    .setTimestamp(timeNow)

                    if(bot.memory.log !== null) bot.memory.log.guilds.get(bot.cfg.logging.guild).channels.get(bot.cfg.logging.channel).send({embed: embed});
                    break;
                } else
                if (i+1 === ad.length) {
                    let embed = new djs.RichEmbed()
                    .setColor(bot.cfg.embed.error)
                    .setAuthor('User Banned', bot.icons.find('ICO_ban'))
                    .setTitle(`Log Error: Unable to determine Moderator responsible. See Audit Logs.`)
                    .addField('Banned User', `${user} | ${user.tag} \n\`\`\`yaml\n${user.id}\`\`\``)
                    .setThumbnail(user.displayAvatarURL)
                    .setFooter(`Event logged on ${timeNow.toUTCString()}`)
                    .setTimestamp(timeNow)

                    if(bot.memory.log !== null) bot.memory.log.guilds.get(bot.cfg.logging.guild).channels.get(bot.cfg.logging.channel).send({embed: embed});
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
        bot.guilds.get(bot.cfg.guilds.optifine).fetchAuditLogs({ limit: 10, type: 'MEMBER_BAN_REMOVE' }).then((audit) => {
            let ad = [...audit.entries.values()];

            for(let i = 0; i < ad.length; i++) {
                if (ad[i].target.id === user.id) {
                    let embed = new djs.RichEmbed()
                    .setColor(bot.cfg.embed.default)
                    .setAuthor('Ban Revoked', bot.icons.find('ICO_unban'))
                    .addField('Unbanned User', `${user} | ${user.tag} \n\`\`\`yaml\n${user.id}\`\`\``)
                    .addField('Moderator Responsible', `${ad[i].executor} | ${ad[i].executor.tag} \n\`\`\`yaml\n${ad[i].executor.id}\`\`\``)
                    .setThumbnail(user.displayAvatarURL)
                    .setFooter(`Event logged on ${timeNow.toUTCString()}`)
                    .setTimestamp(timeNow)

                    if(bot.memory.log !== null) bot.memory.log.guilds.get(bot.cfg.logging.guild).channels.get(bot.cfg.logging.channel).send({embed: embed});
                    break;
                } else
                if (i+1 === ad.length) {
                    let embed = new djs.RichEmbed()
                    .setColor(bot.cfg.embed.default)
                    .setAuthor('Ban Revoked', bot.icons.find('ICO_ban'))
                    .setTitle(`Log Error: Unable to determine Moderator responsible. See Audit Logs.`)
                    .addField('Unbanned User', `${user} | ${user.tag} \n\`\`\`yaml\n${user.id}\`\`\``)
                    .setThumbnail(user.displayAvatarURL)
                    .setFooter(`Event logged on ${timeNow.toUTCString()}`)
                    .setTimestamp(timeNow)

                    if(bot.memory.log !== null) bot.memory.log.guilds.get(bot.cfg.logging.guild).channels.get(bot.cfg.logging.channel).send({embed: embed});
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
        let channel = bot.channels.get(packet.d.channel_id);
        if (channel.messages.has(packet.d.message_id)) return;
        channel.fetchMessage(packet.d.message_id).then(m => {
            let emoji = packet.d.emoji.id ? `${packet.d.emoji.name}:${packet.d.emoji.id}` : packet.d.emoji.name;
            let reaction = m.reactions.get(emoji);

            if (reaction) {
                reaction.users.set(packet.d.user_id, bot.users.get(packet.d.user_id));
            }

            log('old emoji detected', 'trace');
            bot.emit('messageReactionAdd', reaction, bot.users.get(packet.d.user_id));
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
// Ratelimit Events
////////////////////////////////////////

bot.on('ratelimit', rl => {
    let rlInfo = [
        `Request Limit: ${rl.requestLimit}`,
        `Time Difference: ${rl.timeDifference}`,
        `HTTP Method: ${rl.method}`,
        `Path: ${rl.path}`
    ].join('\n');

    log("OptiBot is being ratelimited! \n" + rlInfo, 'warn');
});

if(bot.memory.log !== null) bot.memory.log.on('ratelimit', rl => {
    let rlInfo = [
        `Request Limit: ${rl.requestLimit}`,
        `Time Difference: ${rl.timeDifference}`,
        `HTTP Method: ${rl.method}`,
        `Path: ${rl.path}`
    ].join('\n');

    log("OptiBot Logging is being ratelimited! \n" + rlInfo, 'warn');
});

////////////////////////////////////////
// Websocket Disconnect Event
////////////////////////////////////////

bot.on('disconnect', event => {
    if (event.code === 1000) {
        log("Disconnected from websocket with event code 1000. (Task Complete)", 'warn');
    } else {
        log(`Disconnected from websocket with event code ${event.code}`, 'fatal');
    }
});

if(bot.memory.log !== null) bot.memory.log.on('disconnect', event => {
    if (event.code === 1000) {
        log("OptiLog disconnected from websocket with event code 1000. (Task Complete)", 'warn');
    } else {
        log(`OptiLog disconnected from websocket with event code ${event.code}`, 'fatal');
    }
});

////////////////////////////////////////
// Websocket Reconnecting Event
////////////////////////////////////////

bot.on('reconnecting', () => {
    log('Attempting to reconnect to websocket...', 'warn');
});

bot.on('reconnecting', () => {
    log('OptiLog attempting to reconnect to websocket...', 'warn');
});

////////////////////////////////////////
// General Warning
////////////////////////////////////////

bot.on('warn', info => {
    log(info, 'warn');
});

if(bot.memory.log !== null) bot.memory.log.on('warn', info => {
    log(info, 'warn');
});

////////////////////////////////////////
// General Debug
////////////////////////////////////////

/* bot.on('debug', info => {
    log(info, 'debug');
}); */

////////////////////////////////////////
// WebSocket Resume
////////////////////////////////////////

bot.on('resume', replayed => {
    log('WebSocket resumed. Number of events replayed: '+replayed, 'warn');
});

if(bot.memory.log !== null) bot.memory.log.on('resume', replayed => {
    log('OptiLog WebSocket resumed. Number of events replayed: '+replayed, 'warn');
});

////////////////////////////////////////
// WebSocket Error
////////////////////////////////////////

bot.on('error', err => {
    log(err.stack || err, 'error');
});

if(bot.memory.log !== null) bot.memory.log.on('error', err => {
    log(err.stack || err, 'error');
});
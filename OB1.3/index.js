////////////////////////////////////////
//   OptiBot 1.3: Complete Rewrite    //
//         Kyle Edwards, 2019         //
////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
// Pre-initialization
////////////////////////////////////////////////////////////////////////////////

function log(msg, level) {
    var content = String(msg);
    // fuck every single god damn thing about this fucking programming language. god
    process.send({content, level});
}

var debugMode = false;
if (process.argv[2] === 'true') {
    log('OPTIBOT RUNNING IN DEBUG MODE', 'warn');
    debugMode = true;
}

////////////////////////////////////////////////////////////////////////////////
// Dependencies, Configuration files
////////////////////////////////////////////////////////////////////////////////

const discord  = require('discord.js');
const request  = require('request');
const events   = require('events');
const jimp     = require('jimp');
const fs       = require('fs');
const Random   = require('random-js');
const cstr     = require('string-similarity');
const database = require('nedb');

const cfg    = require('./cfg/config.json');
const rules  = require('./cfg/rules.json');
const pkg    = require('./package.json');
const smr    = require('./cfg/smr.json');
const faq    = require('./cfg/faq2.json');
const splash = require('./cfg/splash.json');

////////////////////////////////////////////////////////////////////////////////
// Initialize
////////////////////////////////////////////////////////////////////////////////



/*
log('test');

process.exit();*/
// 0 = success
// 1 = error
// 2 = restart
// 3 = long restart

var db = {};
db.msg = new database({ filename: './data/messages.db', autoload: true });
db.muted = new database({ filename: './data/muted.db', autoload: true });
db.bl = new database({ filename: './data/blacklist.db', autoload: true });
db.dr = new database({ filename: './data/dr.db', autoload: true });

db.msg.persistence.setAutocompactionInterval(300000);
db.muted.persistence.setAutocompactionInterval(7200000);
db.bl.persistence.setAutocompactionInterval(7200000);
db.dr.persistence.setAutocompactionInterval(300000);

const limitRemove = new events.EventEmitter().setMaxListeners(cfg.db.size+1);

const bot = new discord.Client();
var shutdown = false;
var booting = true;
bot.login(cfg.keys.discord).then(() => {
    process.title = 'Loading required assets...';
    log('Successfully logged in using token: '+cfg.keys.discord, 'debug');
    activityHandler('booting');
}).catch((err) => {
    log(err, 'error');
    shutdownHandler(2);
})

var icons = {};
var images = {};

const mt = Random.engines.mt19937().autoSeed();

var lastInt = 0;
var scheduled_rs = false;
bot.setInterval(() => {
    if(!scheduled_rs) {
        var now = new Date();
        if(now.getHours() === 2 && now.getMinutes() === 0) {
            scheduled_rs = true;
            activityHandler('shutdown');

            log('Scheduled restart initialized.', 'warn');

            if(lastInt+300000 > now.getTime()) {
                log('Restarting in 5 minutes...', 'warn');
                bot.setTimeout(() => {
                    shutdownHandler(10);
                }, 300000);
            } else {
                log('Restarting in 1 minute...', 'warn');
                bot.setTimeout(() => {
                    shutdownHandler(10);
                }, 60000);
            }
        }
    }
}, 1000);

var CD_active = false;
var CD_mult = 1;
var CD_timer = false;
var CD_threshold = 0;

var gh_docsUpdateTimeout = false;
var gh_docsUpdating = false;
const gh_docs_finish = new events.EventEmitter();
var gh_docs = [];

/*
var vc_stream;
var vc_connection;
var vc_loaded = false;
var vc_queue = [];
*/

var activity      = 'online';
var activityLabel = [];
bot.setInterval(() => {
    bot.user.setStatus(activity);

    if(activityLabel.length !== 0) {
        if(activityLabel[1] === 'PLAYING') {
            bot.user.setActivity(activityLabel[0], {type: 'PLAYING'});
        } else
        if(activityLabel[1] === 'LISTENING') {
            bot.user.setActivity(activityLabel[0], {type: 'LISTENING'});
        }
    } else {
        bot.user.setActivity(null);
    }
}, 3600000);

bot.setInterval(() => {
    checkMuted();
}, 300000)

////////////////////////////////////////////////////////////////////////////////
// Event Handlers
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////
// Bot Ready Event
////////////////////////////////////////

bot.on('ready', () => {
    function finalReady() {
        process.title = 'OptiBot ' + pkg.version + ' - ' + Math.round(bot.ping)+"ms";
        var leftMargin = Math.floor((36 - pkg.version.length) / 2);
        var rightMargin = Math.ceil((36 - pkg.version.length) / 2);

        var version = '//'+(' '.repeat(leftMargin))+pkg.version+(' '.repeat(rightMargin))+'//';

        booting = false;
        activityHandler('ready');
        log('////////////////////////////////////////');
        log('//              OptiBot               //');
        log(version);
        log('//           Ready to work!           //');
        log('//       (c) Kyle Edwards, 2019       //');
        log('////////////////////////////////////////');

        bot.setInterval(() => {
            process.title = 'OptiBot ' + pkg.version + ' - ' + Math.round(bot.ping)+"ms";
        }, 1000);
    }

    log('boot stage1', 'debug');
    loadImages(() => {
        log('boot stage2', 'debug');
        updateDocs(undefined, () => {
            log('boot stage3', 'debug');
            db.msg.find({}, (err, docs) => {
                if(err) {
                    log(err, 'error');
                } else {
                    var i = 0;

                    (function fetchNext() {
                        log('stage3 loop'+i, 'debug');
                        if(i === docs.length) {
                            log('Finished loading previous messages.', 'debug');
                            finalReady()
                        } else {
                            bot.guilds.get(docs[i].guild).channels.get(docs[i].channel).fetchMessage(docs[i].message).then(m => {
                                m.reactions.get('❌').fetchUsers().then(u => {
                                    if(u.has(docs[i].user)) {
                                        updateCache('remove', e);
                                        m.delete();
                                        i++
                                        fetchNext();
                                    } else
                                    if(!m.deleted) {
                                        deletionCollector(m, docs[i].user, docs[i]);
                                        i++
                                        fetchNext();
                                    }
                                }).catch(err => {
                                    log('Failed to fetch users from message: '+err.stack, 'error')
                                    i++
                                    fetchNext();
                                });
                            }).catch(err => {
                                log('Failed to load cached message: '+err.stack, 'error');
                                i++
                                fetchNext();
                            });
                        }
                    })()


                    /*docs.forEach((e) => {
                        bot.guilds.get(e.guild).channels.get(e.channel).fetchMessage(e.message).then(m => {
                            m.reactions.get('❌').fetchUsers().then(u => {
                                if(u.has(e.user)) {
                                    updateCache('remove', e);
                                    m.delete();
                                } else
                                if(!m.deleted) {
                                    deletionCollector(m, e.user, e);
                                }
                            }).catch(err => { log('Failed to fetch users from message: '+err.stack, 'error') });
        
                            done++
        
                            if(done === docs.length) {
                                log('Finished loading previous messages.', 'debug');
                                finalReady()
                            }
                        }).catch(err => {
                            log('Failed to load cached message: '+err.stack, 'error');
                        });
                    });*/
                }
            });
        });
    });

    cmdIndex.sort((a,b) => a.trigger.localeCompare(b.trigger));
});

////////////////////////////////////////
// Message Deleted Event
////////////////////////////////////////

bot.on('messageDelete', m => {
    if(m.author.system || m.author.bot) return;
    if(m.channel.type === 'dm') return;

    var msg = `Recorded message deletion at ${new Date()}`;
    var msg2 = `\nPosted by ${m.author.username}#${m.author.discriminator} in #${m.channel.name} `;
    var msg3;

    if(m.content.toLowerCase().startsWith('!dr')) {
        msg3 = `on ${m.createdAt} \nMessage Contents: \n"!dr [removed]"`;
    } else {
        msg3 = `on ${m.createdAt} \nMessage Contents: \n"${m.content}"`;
    }

    if(typeof m.member !== undefined && typeof m.member !== null) {
        if(typeof m.member.nickname !== undefined && m.member.nickname !== null) {
            msg2 += `(aka "${m.member.nickname}") `;
        }
    }

    if(m.attachments.size > 0) {
        msg3 += '\n\nMessage Attachments: '
        m.attachments.tap(at => {
            msg3 += "\n"+at.url
        });
    }

    log(msg+msg2+msg3, 'warn');
});

////////////////////////////////////////
// Message Edited Event
////////////////////////////////////////

bot.on('messageUpdate', (m, mNew) => {
    if(m.author.system || m.author.bot) return;
    if(m.channel.type === 'dm') return;

    if(m.content.trim().toLowerCase() == mNew.content.trim().toLowerCase()) return;

    var msg = `Recorded message edit at ${new Date()}`;
    var msg2 = `\nPosted by ${m.author.username}#${m.author.discriminator} in #${m.channel.name} `;
    var msg3;
    var msg4;

    if(m.content.toLowerCase().startsWith('!dr')) {
        msg3 = `on ${m.createdAt} \nOriginal Message Contents: \n"!dr [removed]"`;
    } else {
        msg3 = `on ${m.createdAt} \nOriginal Message Contents: \n"${m.content}"`;
    }

    if(mNew.content.toLowerCase().startsWith('!dr')) {
        msg4 = `\n\nNew Message Contents: \n"!dr [removed]"`;
    } else {
        msg4 = `\n\nNew Message Contents: \n"${mNew.content}"`;
    }

    if(typeof m.member !== undefined && typeof m.member !== null) {
        if(typeof m.member.nickname !== undefined && m.member.nickname !== null) {
            msg2 += `(aka "${m.member.nickname}") `;
        }
    }

    log(msg+msg2+msg3+msg4);
});

////////////////////////////////////////
// User joined
////////////////////////////////////////

bot.on('guildMemberAdd', member => {
    if(member.guild.id !== cfg.basic.of_server) return;
    
    log('User has joined the server: '+member.user.username+'#'+member.user.discriminator+' ('+member.user.id+')');

    /*var embed = new discord.RichEmbed()
        .setColor(cfg.vs.embed.default)
        .attachFile(new discord.Attachment(icons['opti_fine.png'], "thumbnail.png"))
        .setAuthor('Welcome to the official OptiFine Discord server!', 'attachment://thumbnail.png')
        .setDescription("Due to a large influx of people recently, we've created this automated message to answer some of the most common questions that keep coming our way. In addition, PLEASE be sure to read the <#479192475727167488> and <#531622141393764352>.")
        .addField('When is OptiFine 1.14 coming out?', "**There is no official ETA. Nobody really knows.** However, unstable builds have been released as of May 19. [Click here to go straight to the download.](https://optifine.net/downloads) (Click on \"Preview versions\" at the top.)")
        .addField('Can I use the unstable builds on 1.14.x?', "No. These builds are currently being developed for 1.14.0. The bugfix versions will be available later.")
    
    member.send({embed: embed}).then(() => {
        log('MOTD successfully sent to '+member.user.username+'#'+member.user.discriminator);
    }).catch((err) => {
        if(err.code === 50007) {
            log('Could not send MOTD to new member '+member.user.username+'#'+member.user.discriminator+' (User has server DMs disabled)', 'warn')
        } else {
            log('Could not send MOTD to new member '+member.user.username+'#'+member.user.discriminator+': '+err.stack, 'error');
        }
    });*/

    bot.setTimeout(function() {
        if(!member.deleted && member.roles.size !== 0) {
            log('10 Minute wait has expired for new user '+member.user.username+'#'+member.user.discriminator+' ('+member.user.id+')');
        }
    }, 600000)

});

////////////////////////////////////////
// User was banned
////////////////////////////////////////

bot.on('guildBanAdd', (guild, member) => {
    if(guild.id !== cfg.basic.of_server) return;

    bot.guilds.get(cfg.basic.of_server).fetchAuditLogs({limit: 1}).then((audit) => {
        var ad = audit.entries.first()
        if(ad.action === 'MEMBER_BAN_ADD' && ad.target.id === member.id && ad.createdTimestamp+1000 > new Date().getTime()) {
            var msg = 'User '+member.username+'#'+member.discriminator+' ('+member.id+') was banned by '+ad.executor.username+'#'+ad.executor.discriminator;
            
            if(ad.reason) msg += '\nReason: '+ad.reason;

            log(msg, 'warn');
        } else {
            log('User was banned from the server: '+member.username+'#'+member.discriminator+' ('+member.id+')', 'warn')
        }
    }).catch(err => log(err.stack, 'error'));
});

////////////////////////////////////////
// User left/was kicked
////////////////////////////////////////

bot.on('guildMemberRemove', member => {
    bot.guilds.get(cfg.basic.of_server).fetchAuditLogs({limit: 1}).then((audit) => {
        var ad = audit.entries.first()
        if(ad.action === 'MEMBER_KICK' && ad.target.id === member.user.id && ad.createdTimestamp+1000 > new Date().getTime()) {
            var msg = 'User '+member.user.username+'#'+member.user.discriminator+' ('+member.user.id+') was kicked by '+ad.executor.username+'#'+ad.executor.discriminator;
            
            if(ad.reason) msg += '\nReason: '+ad.reason;

            log(msg, 'warn');
        } else 
        if(ad.action === 'MEMBER_BAN_ADD' && ad.target.id === member.user.id && ad.createdTimestamp+1000 > new Date().getTime()) {
            return;
        } else {
            log('User has left the server: '+member.user.username+'#'+member.user.discriminator+' ('+member.user.id+')', 'warn')
        }
    }).catch(err => log(err.stack, 'error'));
});

////////////////////////////////////////
// Ratelimit Event
////////////////////////////////////////

bot.on('ratelimit', rl => {
    var rlInfo = "Request Limit: "+rl.requestLimit+"\n"
        + "Time Difference: "+rl.timeDifference+"\n"
        + "HTTP Method: "+rl.method+"\n"
        + "Path: "+rl.path+"\n"
    log("Bot is being ratelimited! \n" + rlInfo, 'warn');
});

////////////////////////////////////////
// Websocket Disconnect Event
////////////////////////////////////////

bot.on('disconnect', event => {
    log("Disconnected from websocket with event code \""+event.code+"\"", 'fatal');
});

////////////////////////////////////////
// Websocket Reconnecting Event
////////////////////////////////////////

bot.on('reconnecting', () => {
    log('Attempting to reconnect to websocket...', 'warn');
});

////////////////////////////////////////
// Message Received Event
////////////////////////////////////////

bot.on('message', (m) => {
    if(m.author.bot || m.author.system) return; // message was posted by system or bot
    if(shutdown) return; // bot is shutting down
    if(booting) return; // bot is still loading required assets
    if(scheduled_rs) return; // bot is undergoing a scheduled restart

    lastInt = new Date().getTime();

    if(debugMode && m.author.id !== '271760054691037184' && m.author.id !== '181214529340833792') {
        if(m.channel.type === 'dm') {
            errorMsg(m, 'OptiBot is currently undergoing maintenance. Please check by later!');
        }
        return;
    }

    bot.guilds.get(cfg.basic.of_server).fetchMember(m.author, true).then(member => {
        var isAdmin = member.permissions.has("KICK_MEMBERS", true);

        // Modify message to be usable by code.
        var input = m.content.trim().split("\n", 1)[0];
        var cmd   = input.toLowerCase().split(" ")[0].substr(1);
        var args  = input.split(" ").slice(1).filter(function (e) { return e.length != 0 });

        db.bl.count({id:m.author.id}, (err, count) => {
            if(err) {
                errorHandler(m, err);
            } else
            if(count > 0 && !isAdmin) {
                if(m.channel.type === 'dm') {
                    errorMsg(m, 'Sorry, you\'re not allowed to use any OptiBot commands or functions. Please contact a moderator if you think this is a mistake.');
                } else
                if(m.content.trim().startsWith(cfg.basic.trigger) && cmd === 'dr') {
                    m.delete();
                }
            } else {
                if(cfg.channels.blacklist.indexOf(m.channel.id) > -1) return; // channel is on blacklist
                if(CD_active && !isAdmin && m.author.id !== '271760054691037184') return; // bot is in cooldown mode and the user does not have mod permissions

                ////////////////////////////////////////
                // Commands
                ////////////////////////////////////////

                if(!m.content.trim().startsWith(cfg.basic.trigger)) {
                    if(m.channel.type === 'dm') {
                        var embed = new discord.RichEmbed()
                        .setColor(cfg.vs.embed.default)
                        .attachFiles([new discord.Attachment(icons['opti_info.png'], "thumbnail.png"), new discord.Attachment(images['token.png'], "token.png")])
                        .setAuthor("Donator Verification", 'attachment://thumbnail.png')
                        .setThumbnail('attachment://token.png')
                        .setDescription('To gain access to the Donator role, simply use this command: `!dr` Include your donation E-Mail and token. You can find your donator token on the website: https://optifine.net/login. Look at the bottom of the page for a string of random characters. Please note that your "Donation ID" is **NOT** your token.')

                        m.channel.send({embed: embed});
                    } else
                    if(smr.some(badlink => m.content.includes(badlink))) {
                        var embed = new discord.RichEmbed()
                        .setColor(cfg.vs.embed.default)
                        .attachFile(new discord.Attachment(icons['opti_warn.png'], "thumbnail.png"))
                        .setAuthor('Illegal mod website detected', 'attachment://thumbnail.png')
                        .setDescription('The previous message may contain a link to an illegal Minecraft mod website. Remember to avoid suspicious links, and proceed with caution.'
                        + '\n\nRead more about the StopModReposts movement: https://stopmodreposts.org/')

                        m.channel.send({embed: embed});
                    } else 
                    if (m.content.indexOf('#') > -1) {
                        log('possible match', 'debug')
                        //capture everything between quotes, codeblocks, and strikethroughs.
                        var filter = m.content.match(/"[^"]+"|`{3}[^```]+`{3}|~{2}[^~~]+~{2}|`{1}[^`]+`{1}|<[^<>]+>/gi);
                        var filtered = new String(m.content);

                        function s2() {
                            var refs = filtered.match(/(?<![a-z]#)(?<=#)(\d+)(?![a-z])\b/gi);

                            if(refs !== null) {
                                //ignore first 10 issues, and numbers that are larger than 5 characters in length.
                                if(refs.filter(e => (e.length < 5) && (parseInt(e) > 10)).length > 0) {
                                    log('finally', 'debug')
                                    typer(m, true);
                                    ghRefs(m, refs, isAdmin);
                                }
                            }
                        }

                        if(filter !== null) {
                            log('replacing quotes', 'debug');
                            for(i=0;i<filter.length;i++) {
                                log('replacing '+i, 'debug');
                                filtered = filtered.replace(filter[i], '');

                                if(i+1 === filter.length) {
                                    s2();
                                }
                            }
                        } else {
                            s2();
                        }
                    } else {
                        // hilarious joke
                        var now = new Date();

                        if(now.getMonth() === 3 && now.getDate() === 1) {
                            var regex = m.content.match(/\bi\'?m\s+(.*)/i);
                            if(regex !== null) {
                                var msg = regex[1];

                                if(regex[1].indexOf('.') > 1) {
                                    msg = regex[1].substr(0, regex[1].indexOf('.'));
                                }

                                if(msg.length > 1800) {
                                    m.channel.send(`Hi ${m.author}, please stop spamming. \n\nIn other news, I'm OptiBot!`);
                                } else {
                                    m.channel.send(`Hi ${msg}, I'm OptiBot!`);
                                }
                            }
                        }
                    }
                    return;
                }

                // let me show you what a clusterfuck of code i can make in just two short lines:
                let validator = input.match(/!\w/);
                if((validator) ? (input.indexOf(validator[0]) !== 0) : true) return;
                // cool, huh?
                // please end my life

                //CD_interrupt.emit('cmd');
                if(!CD_active) typer(m, true);
                cooldownHandler(m, isAdmin);

                if(m.channel.type === 'dm' || isAdmin) {
                    getCmd(cmd, (res) => {
                        if(res) {
                            bot.setTimeout(() => {
                                if(!CD_active) {
                                    if(!res.metadata.dm && m.channel.type === 'dm') {
                                        errorMsg(m, "Sorry, this command can only be used in server chat.")
                                    } else {
                                        if(cmd === 'dr') {
                                            var censored = [];
                                            args.forEach((e)=> {
                                                var c = e.replace(/./g, "*");
                                                censored.push(c);
                                            });
                                            log('input from '+m.author.username+'#'+m.author.discriminator+': !'+cmd+' '+censored.join(' '));
                                        } else {
                                            log('input from '+m.author.username+'#'+m.author.discriminator+': '+input);
                                        }
    
                                        try {
                                            res.execute(m, args, isAdmin, member);
                                        }
                
                                        catch(err) {
                                            errorHandler(m, err);
                                        }
                                    }
                                }
                            }, 250);
                        } else {
                            unknownCmd(m);
                        }
                    });
                } else 
                if(m.channel.type !== 'dm') {
                    var embed = new discord.RichEmbed()
                        .setColor(cfg.vs.embed.error)
                        .attachFile(new discord.Attachment(icons['opti_err.png'], "thumbnail.png"))
                        .setAuthor("Sorry, all commands can only be used in DMs for the time being.", 'attachment://thumbnail.png')
                        .setFooter("This message will self-destruct in ~10 seconds.")

                    typer(m, false);
                    m.channel.send({embed: embed}).then(msg => {
                        bot.setTimeout(()=>{
                            msg.delete();
                        }, 10000)
                    });
                }
            }
        });
    }).catch(err => {
        if(err.code !== 10007) {
            throw(err.stack);
        } else {
            errorMsg(m, 'Sorry, you must be a member of the OptiFine Discord server to use this bot.');
        }
    });
})

////////////////////////////////////////////////////////////////////////////////
// Command Handlers
////////////////////////////////////////////////////////////////////////////////

const cmdIndex = [
    {
        trigger: "114",
        metadata: {
            shortdesc: "OptiFine 1.14",
            longdesc: "Standard response for OptiFine 1.14 information. Use this if the bot doesnt recognize the question automatically.",
            usage: "!114",
            admin: false,
            hidden: false,
            dm: false,
        },
        execute: function (m, args, isAdmin) {
            autoresponse(m);
        }
    },
    {
        trigger: "faqtest",
        metadata: {
            shortdesc: "faq",
            longdesc: "faq",
            usage: "!faqtest",
            admin: true,
            hidden: true,
            dm: true,
        },
        execute: function (m, args, isAdmin) {
            if(!isAdmin) {
                errorMsg(m, 'missingPermission');
            } else {
                var embed = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .setAuthor("Q: When is OptiFine for [version] coming out?")
                .setDescription("A: When it's done.");

                typer(m, false);
                bot.guilds.get('517649143590813707').channels.get('545801003421925376').send({embed: embed}).then(msg => { deletable(m, msg) });
            }
        }
    },
    {
        trigger: "lmgtfy",
        metadata: {
            shortdesc: "Let me Google that for you.",
            longdesc: "Instruct a special someone on the basics of web browsing.",
            usage: "!lmgtfy <query>",
            admin: false,
            hidden: false,
            dm: true,
        },
        execute: function (m, args, isAdmin) {
            if(!args[0]) {
                errorMsg(m, 'You must specify something to search for.');
            } else {
                var embed = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFile(new discord.Attachment(icons['opti_search.png'], "thumbnail.png"))
                .setAuthor('Super Convenient Search Tool™', 'attachment://thumbnail.png')
                .setDescription('[Let me just Google that for you real quick.](http://lmgtfy.com/?q='+encodeURIComponent(m.content.substr(8))+')')

                typer(m, false);
                m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
            }
        }
    },
    {
        trigger: "actually",
        metadata: {
            shortdesc: "ackchyually",
            longdesc: "**ackchyually**",
            usage: "!actually",
            admin: false,
            hidden: false,
            dm: true,
        },
        execute: function (m, args, isAdmin) {
            var embed = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFile(new discord.Attachment(images['actually.png'], "image.png"))
                .setImage('attachment://image.png')

            typer(m, false);
            m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
        }
    },
    {
        trigger: "dmtest",
        metadata: {
            shortdesc: "dmtest",
            longdesc: "dmtest",
            usage: "!dmtest",
            admin: true,
            hidden: true, //for now
            dm: true,
        },
        execute: function (m, args, isAdmin) {
            if(isAdmin) {
                var embed = new discord.RichEmbed()
                .attachFile(new discord.Attachment(icons['opti_fine.png'], "thumbnail.png"))
                .setAuthor('Welcome to the official OptiFine Discord server!', 'attachment://thumbnail.png')
                .setColor(cfg.vs.embed.default)
                .setDescription('Please be sure to read the <#479192475727167488> before posting. In addition, please try to search the <#531622141393764352> BEFORE asking any questions, as there\'s a good chance they\'ve already been answered.')

                m.author.send({embed: embed}).catch((err) => {
                    log(err, 'error');
                });
            } else {
                errorMsg(m, 'Sorry, you do not have permission to use this command.');
            }
        }
    },
    {
        trigger: "bug",
        metadata: {
            shortdesc: "Gives instructions to fix common issues with OptiFine.",
            longdesc: "Gives detailed instructions to troubleshoot common issues with OptiFine.",
            usage: "!bug [page #]",
            admin: false,
            hidden: true, //for now
            dm: true,
        },
        execute: function (m, args, isAdmin) {
            errorMsg(m, 'Sorry, this command is currently a work-in-progress.');
            /*
            var embed = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFile(new discord.Attachment(icons['opti_bug.png'], "thumbnail.png"))
                .setAuthor('OptiFine Debugger', 'attachment://thumbnail.png')
                .setDescription("")
            
            typer(m, false);
            m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
            */
        }
    },
    {
        trigger: "typing",
        metadata: {
            shortdesc: "Several people are typing.",
            longdesc: "Several people are typing.",
            usage: "!typing",
            admin: false,
            hidden: false,
            dm: true,
        },
        execute: function (m, args, isAdmin) {
            var embed = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFile(new discord.Attachment(images['typing.png'], "image.png"))
                .setImage('attachment://image.png')

            typer(m, false);
            m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
        }
    },
    {
        trigger: "goodboy",
        metadata: {
            shortdesc: "Good boy!",
            longdesc: "Good boy!",
            usage: "!goodboy",
            admin: false,
            hidden: false,
            dm: true,
        },
        execute: function (m, args, isAdmin) {
            var embed = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFile(new discord.Attachment(images['goodboy.gif'], "image.gif"))
                .setImage('attachment://image.gif')

            typer(m, false);
            m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
        }
    },
    {
        trigger: "chkmute",
        metadata: {
            shortdesc: "Force check muted list.",
            longdesc: "Force check muted list for expired timelimits.",
            usage: "!chkmute",
            admin: true,
            hidden: false,
            dm: true,
        },
        execute: function (m, args, isAdmin) {
            if(isAdmin) {
                checkMuted(() => {
                    var embed = new discord.RichEmbed()
                        .setColor(cfg.vs.embed.okay)
                        .attachFile(new discord.Attachment(icons['opti_success.png'], "thumbnail.png"))
                        .setAuthor('Done.', 'attachment://thumbnail.png')

                    typer(m, false);
                    m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
                });
            } else {
                errorMsg(m, 'Sorry, you do not have permission to use this command.');
            }
        }
    },
    {
        trigger: "offline",
        metadata: {
            shortdesc: "For when the bot is in debug mode.",
            longdesc: "For when the bot is in debug mode.",
            usage: "!offline",
            admin: false,
            hidden: true,
            dm: true,
        },
        execute: function (m, args, isAdmin) {
            var embed = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFile(new discord.Attachment(images['offline_bot.png'], "image.png"))
                .setDescription('See that? This means the bot is busy, and can\'t be used right now.')
                .setImage('attachment://image.png')

            typer(m, false);
            m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
        }
    },
    {
        trigger: "thonk",
        metadata: {
            shortdesc: "sp614x irl",
            longdesc: "sp614x irl",
            usage: "!thonk",
            admin: false,
            hidden: false,
            dm: true,
        },
        execute: function (m, args, isAdmin) {
            var embed = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFile(new discord.Attachment(images['sp_superthonk.gif'], "image.gif"))
                .setDescription('hmmm')
                .setImage('attachment://image.gif')

            typer(m, false);
            m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
        }
    },
    {
        trigger: "faq",
        metadata: {
            shortdesc: "Search the FAQ.",
            longdesc: "Search the FAQ, using string similarity.",
            usage: "!faq <query>",
            admin: false,
            hidden: false,
            dm: true,
        },
        execute: function (m, args, isAdmin) {
            // todo: fetch messages directly from #faq channel (#33)
            if(!args[0]) {
                errorMsg(m, 'You must specify a question to search for.')
            } else {
                var query = m.content.substr(5);
                var result = cstr.findBestMatch(query, Object.keys(faq));

                var embed = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFile(new discord.Attachment(icons["opti_info.png"], "thumbnail.png"))
                .setAuthor('Frequently Asked Questions', 'attachment://thumbnail.png')
                .setDescription('<#531622141393764352>')
                .addField(result.bestMatch.target, faq[result.bestMatch.target])
                .setFooter(`${Math.round(result.bestMatch.rating * 100)}% match during search.`)

                typer(m, false);
                m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
            }
        }
    },
    {
        trigger: "drtest",
        metadata: {
            shortdesc: "Donator role test.",
            longdesc: "Donator role test.",
            usage: "!drtest",
            admin: true,
            hidden: true,
            dm: true,
        },
        execute: function (m, args, isAdmin) {
            if(m.author.id === '181214529340833792') {
                bot.guilds.get(cfg.basic.of_server).fetchMember(m.author.id).then(mem => {
                    mem.removeRole(cfg.roles.donator, 'donator test').then(() => {
                        typer(m, false);
                        m.channel.send('removed');
                    }).catch(err => errorHandler(m, err));
                }).catch(err => errorHandler(m, err));
            } else {
                errorMsg(m, 'Sorry, you do not have permission to use this command.');
            }
        }
    },
    {
        trigger: "dr",
        metadata: {
            shortdesc: "Verifies donator status to grant Donator role. DMS ONLY",
            longdesc: "Verifies your donator status and grants the Donator role. Please provide your donator email and token. You can find your donator token by logging in through the website. https://optifine.net/login THIS COMMAND CAN ONLY BE USED IN DMS.",
            usage: "!dr <donator email> <token>",
            admin: false,
            hidden: false,
            dm: true,
        },
        execute: function (m, args, isAdmin) {
            if(m.channel.type !== 'dm') {
                m.delete().then(() => {
                    db.dr.find({}, (err, docs) => {
                        var newCount = {
                            count: docs[0].count+1
                        }

                        var embed = new discord.RichEmbed()
                        .setColor(cfg.vs.embed.error)
                        .attachFile(new discord.Attachment(icons['opti_err.png'], "thumbnail.png"))
                        .setAuthor("Please DM this bot to use that command.", 'attachment://thumbnail.png')
                        .setFooter("Times people have tried giving their personal information away: "+newCount.count);

                        typer(m, false);
                        m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });

                        db.dr.update({}, newCount, (err) => {
                            if(err) log(err.stack, 'error');
                        });
                    });
                }).catch(err => {
                    errorHandler(m, err)
                });
            } else
            if(!args[0]) {
                errorMsg(m, 'You must specify your donator email.');
            } else
            if(args[0].indexOf('@')<0 && args[0].indexOf('.')<0) {
                errorMsg(m, 'You must specify a valid email.');
            } else 
            if(!args[1]) {
                errorMsg(m, 'You must specify your donator token.');
            } else {
                bot.guilds.get(cfg.basic.of_server).fetchMember(m.author.id).then(mem => {
                    if(mem.roles.has(cfg.roles.donator)) {
                        errorMsg(m, 'You already have the donator role!');
                    } else {
                        
                        request({url:'https://optifine.net/validateToken?e='+encodeURIComponent(args[0])+'&t='+encodeURIComponent(args[1]), headers: {'User-Agent': 'optibot'}}, (err, res, body) => {
                            if(err) {
                                errorHandler(m, err);
                            } else
                            if(!res || !body || res.statusCode === 404 || res.statusCode === 503 || res.statusCode === 522) {
                                errorHandler(m, new Error('Failed to get a response from the OptiFine API'));
                            } else
                            if(res.statusCode === 200) {
                                if(body === 'true') {
                                    mem.addRole(cfg.roles.donator, 'Donator status verified.').then(() => {
                                        var embed = new discord.RichEmbed()
                                        .setColor(cfg.vs.embed.okay)
                                        .attachFile(new discord.Attachment(icons['opti_success.png'], "thumbnail.png"))
                                        .setAuthor('Thank you for your contribution! Your donator role has been activated.', 'attachment://thumbnail.png')
                                        .setFooter('Please note, your token has now been renewed.');

                                        typer(m, false);
                                        m.channel.send({embed: embed});
                                    }).catch(err => errorHandler(m, err));
                                } else {
                                    errorMsg(m, 'Invalid credentials. Please be sure that your token and email are the same as what you see on https://optifine.net/login');
                                }
                            } else {
                                errorHandler(m, new Error('Unexpected response from OptiFine API'));
                            }
                        });
                    }
                }).catch(err => errorHandler(m, err));
            }
        }
    },
    {
        trigger: "say",
        metadata: {
            shortdesc: "Ventriloquism!",
            longdesc: "Ventriloquism! Will also send attachments, if any are included.",
            usage: "!say <text>",
            admin: true,
            hidden: true,
            dm: true,
        },
        execute: function (m, args, isAdmin) {
            if(m.author.id === '181214529340833792') {
                if(!args[0]) {
                    errorMsg(m, 'You must specify a channel ID to speak in.');
                } else
                if(!args[1] && m.attachments.size === 0) {
                    errorMsg(m, 'You must specify something to send.');
                } else {
                    var v_msg = m.content.substring(('!say '+args[0]+' ').length)
                    var attachment;

                    if(!args[1]) v_msg = undefined;

                    if(m.attachments.size !== 0) attachment = {files:[m.attachments.first(1)[0].url]};

                    log('[saying] '+v_msg+'\n[attachment] '+attachment, 'warn');

                    bot.guilds.get(cfg.basic.of_server).channels.get(args[0]).send(v_msg, attachment).then(() => {
                        var embed = new discord.RichEmbed()
                        .setColor(cfg.vs.embed.okay)
                        .attachFile(new discord.Attachment(icons['opti_success.png'], "thumbnail.png"))
                        .setAuthor('Message sent.', 'attachment://thumbnail.png')

                        typer(m, false);
                        m.channel.send({embed: embed})
                    })
                }
            } else {
                errorMsg(m, 'Sorry, you do not have permission to use this command.');
            }
        }
    },
    {
        trigger: "mute",
        metadata: {
            shortdesc: "Enable mute on a user.",
            longdesc: "Enables text chat mute on the specified user. Time limit optional.",
            usage: "!mute <user @mention> [timelimit, # of hours]",
            admin: true,
            hidden: false,
            dm: false,
        },
        execute: function (m, args, isAdmin) {
            if(isAdmin) {
                muteUser(m, args, true);
            } else {
                errorMsg(m, 'Sorry, you do not have permission to use this command.');
            }
        }
    },
    {
        trigger: "unmute",
        metadata: {
            shortdesc: "Disable mute on a user.",
            longdesc: "Disables text chat mute on the specified user.",
            usage: "!unmute <user @mention>",
            admin: true,
            hidden: false,
            dm: false,
        },
        execute: function (m, args, isAdmin) {
            if(isAdmin) {
                muteUser(m, args, false);
            } else {
                errorMsg(m, 'Sorry, you do not have permission to use this command.');
            }
        }
    },
    {
        trigger: "role",
        metadata: {
            shortdesc: "Toggle roles for users.",
            longdesc: "Gives or removes roles for the specified user. OptiBot uses string similarity, so typos won't break this.",
            usage: "!role <user @mention> <role name>",
            admin: true,
            hidden: false,
            dm: false,
        },
        execute: function (m, args, isAdmin) {
            if(isAdmin) {
                // toggle roles for users
                if(!args[0]) {
                    errorMsg(m, 'Please specify the user to give a role to.');
                } else
                if(!args[1]) {
                    errorMsg(m, 'Please specify the role to give to that user.')
                } else
                if(m.mentions.members.size === 0) {
                    errorMsg(m, 'You must specify a valid user @mention.')
                } else {
                    var role;
                    var roleTypes = {
                        'Shader Developer': cfg.roles.shader_dev,
                        'Texture Artist': cfg.roles.texture_artist,
                        'Mod Developer': cfg.roles.mod_dev
                    };

                    var c_res = cstr.findBestMatch(args[1], Object.keys(roleTypes));
                    role = roleTypes[c_res.bestMatch.target];

                    bot.guilds.get(cfg.basic.of_server).fetchMember(m.mentions.members.first(1)[0].id).then(mem => {
                        if(cfg.roles.protected.indexOf(mem.user.id) > -1) {
                            errorMsg(m, 'You\'re not strong enough to manage that user.');
                        } else
                        if(!mem.roles.has(role)) {
                            mem.addRole(role, 'Role granted by '+m.author.username+'#'+m.author.discriminator).then(() => {
                                var embed = new discord.RichEmbed()
                                .setColor(cfg.vs.embed.okay)
                                .attachFile(new discord.Attachment(icons['opti_success.png'], "thumbnail.png"))
                                .setAuthor('Successfully granted role \''+c_res.bestMatch.target+'\' to \''+m.mentions.members.first(1)[0].user.username+'#'+m.mentions.members.first(1)[0].user.discriminator+'\'', 'attachment://thumbnail.png')

                                typer(m, false);
                                m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
                            }).catch(err => {
                                errorHandler(m, err);
                            });
                        } else {
                            mem.removeRole(role, 'Role removed by '+m.author.username+'#'+m.author.discriminator).then(() => {
                                var embed = new discord.RichEmbed()
                                .setColor(cfg.vs.embed.okay)
                                .attachFile(new discord.Attachment(icons['opti_success.png'], "thumbnail.png"))
                                .setAuthor('Successfully removed role \''+c_res.bestMatch.target+'\' from \''+m.mentions.members.first(1)[0].user.username+'#'+m.mentions.members.first(1)[0].user.discriminator+'\'', 'attachment://thumbnail.png')

                                typer(m, false);
                                m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
                            }).catch(err => {
                                errorHandler(m, err);
                            });
                        }
                    }).catch(err => errorHandler(m, err));
                }
            } else {
                errorMsg(m, 'Sorry, you do not have permission to use this command.');
            }
        }
    },
    {
        trigger: "status",
        metadata: {
            shortdesc: "OptiFine and Mojang server status.",
            longdesc: "Displays the status of the OptiFine and Minecraft/Mojang servers.",
            usage: "!status",
            admin: false,
            hidden: false,
            dm: true,
        },
        execute: function(m, args, isAdmin) {
            /* 
            gray = pinging
            green = online
            yellow = partial outage
            red = service unavailable
            teal = unknown response
            orange = error occurred during request
            black = failed response
            */
            var responses = {
                optifine: [
                    {server:"optifine.net", status:"gray"},
                    {server:"s.optifine.net", status:"gray"},
                    {server:"optifined.net", status:"gray"}
                ],
                mojang: [
                    {server:"minecraft.net", status:"gray"},
                    {server:"session.minecraft.net", status:"gray"},
                    {server:"account.mojang.com", status:"gray"},
                    {server:"authserver.mojang.com", status:"gray"},
                    {server:"sessionserver.mojang.com", status:"gray"},
                    {server:"api.mojang.com", status:"gray"},
                    {server:"textures.minecraft.net", status:"gray"},
                    {server:"mojang.com", status:"gray"}
                ]
            };
            var of_servers_text = '';
            var mc_servers_text = '';
            var footer = "If you're having issues, check your internet connection.";

            function translate(cb) {
                log('translate()', 'debug');
                of_servers_text = '';
                mc_servers_text = '';
                function translator(target, index, cb1) {
                    if(target[index].status === 'gray') {
                        cb1('<:pinging:569276842796777473> Pinging '+`[${target[index].server}](${target[index].server})`+'...');
                    } else
                    if(target[index].status === 'green') {
                        cb1('<:okay:546570334233690132> '+`[${target[index].server}](${target[index].server})`+' is online');
                    } else {
                        footer = "Maybe try again in 10 minutes?";
                        if(target[index].status === 'yellow') {
                            cb1('<:warn:546570334145609738> Unknown response from '+`[${target[index].server}](${target[index].server})`);
                        } else
                        if(target[index].status === 'orange') {
                            cb1('<:error:546570334120312834> An error occurred while pinging '+`[${target[index].server}](${target[index].server})`);
                        } else
                        if(target[index].status === 'red') {
                            cb1('<:error:546570334120312834> '+`[${target[index].server}](${target[index].server})`+' is down');
                        } else
                        if(target[index].status === 'black') {
                            cb1('<:error:546570334120312834> Failed to get any response from '+`[${target[index].server}](${target[index].server})`);
                        }
                    }
                }

                var i1 = 0;
                var i2 = 0;

                (function loop_of() {
                    log('optifine loop'+i1, 'debug');
                    translator(responses.optifine, i1, (result) => {
                        of_servers_text += result+'\n';

                        if(parseInt(i1)+1 === responses.optifine.length) {
                            loop_mc();
                        } else {
                            i1++
                            loop_of();
                        }
                    });
                })()

                function loop_mc() {
                    log('mojang loop'+i2, 'debug');
                    translator(responses.mojang, i2, (result) => {
                        mc_servers_text += result+'\n';

                        if(parseInt(i2)+1 === responses.mojang.length) {
                            if(cb) cb(of_servers_text, mc_servers_text);
                        } else {
                            i2++
                            loop_mc();
                        }
                    });
                }
            }

            translate(() => {
                var embed = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFile(new discord.Attachment(icons['opti_connect.png'], "thumbnail.png"))
                .setAuthor('Server Status', 'attachment://thumbnail.png')
                .addField('OptiFine Servers', of_servers_text)
                .addField('Mojang Servers', mc_servers_text)
                .setFooter(footer);

                typer(m, false); //maybe keep typing until pinging has finished?
                m.channel.send("_ _", {embed: embed}).then(msg => {
                    deletable(m, msg);

                    var s1 = false;
                    var s2 = false;
                    var s3 = false;
                    var s4 = false;

                    var current_of = JSON.parse(JSON.stringify(of_servers_text));
                    var current_mc = JSON.parse(JSON.stringify(mc_servers_text));

                    var thisLoop = 0;

                    var updateLoop = bot.setInterval(() => {
                        thisLoop++;
                        if(thisLoop === 5) embed.setDescription('This is taking a while. At this point, you could safely assume the remaining servers are down.');
                        if(msg.deleted) {
                            log('status message deleted', 'debug');
                            bot.clearInterval(updateLoop);
                            log('cleared status loop')
                        } else {
                            log('checking update', 'debug');
                            translate((newOF, newMC) => {
                                if(current_of !== newOF || current_mc !== newMC || thisLoop === 5) {
                                    log(current_of, 'debug');
                                    log(newOF, 'debug');
                                    log('status changed', 'debug');
                                    embed.fields[0].value = newOF;
                                    embed.fields[1].value = newMC;
                                    embed.setFooter(footer);

                                    if(s1 && s2 && s3 && s4) {
                                        embed.description = null;
                                        msg.edit("_ _", {embed: embed});

                                        log('status message updated', 'debug');
                                        log('finished checking status', 'debug');
                                        bot.clearInterval(updateLoop);
                                        log('cleared status loop')
                                    } else {
                                        msg.edit("_ _", {embed: embed});

                                        log('status message updated', 'debug');
                                        current_of = JSON.parse(JSON.stringify(newOF));
                                        current_mc = JSON.parse(JSON.stringify(newMC));
                                    }
                                } else log('no update', 'debug');
                            });
                        }
                        
                    }, 2000);

                    request({url:'http://optifine.net/home', headers: {'User-Agent': 'optibot'}}, (err, res, body) => {
                        if(err) {
                            if(err.code === 'ETIMEDOUT') {
                                responses.optifine[0].status = 'red';
                                s1 = true;
                            } else {
                                responses.optifine[0].status = 'orange';
                                s1 = true;
                                log(err.stack, 'error');
                            }
                        } else
                        if(!res || !body) {
                            responses.optifine[0].status = 'black';
                            s1 = true;
                        } else
                        if(res.statusCode === 200) {
                            responses.optifine[0].status = 'green';
                            s1 = true;
                        } else
                        if([404,503,520,522,524].indexOf(res.statusCode) !== -1) {
                            responses.optifine[0].status = 'red';
                            s1 = true;
                        } else {
                            log('Unexpected response from '+responses.optifine[0].server+' - '+res.statusCode, 'error');
                            responses.optifine[0].status = 'teal';
                            s1 = true;
                        }
                    });

                    request({url:'http://s.optifine.net', headers: {'User-Agent': 'optibot'}}, (err, res, body) => {
                        if(err) {
                            if(err.code === 'ETIMEDOUT') {
                                responses.optifine[1].status = 'red';
                                s2 = true;
                            } else {
                                responses.optifine[1].status = 'orange';
                                s2 = true;
                                log(err.stack, 'error');
                            }
                        } else
                        if(!res) {
                            responses.optifine[1].status = 'black';
                            s2 = true;
                        } else
                        if(res.statusCode === 404) {
                            responses.optifine[1].status = 'green';
                            s2 = true;
                        } else
                        if([503,520,522,524].indexOf(res.statusCode) !== -1) {
                            responses.optifine[1].status = 'red';
                            s2 = true;
                        } else {
                            log('Unexpected response from '+responses.optifine[1].server+' - '+res.statusCode, 'error');
                            responses.optifine[1].status = 'teal';
                            s2 = true;
                        }
                    });

                    request({url:'http://optifined.net', headers: {'User-Agent': 'optibot'}}, (err, res, body) => {
                        if(err) {
                            if(err.code === 'ETIMEDOUT') {
                                responses.optifine[2].status = 'red';
                                s3 = true;
                            } else {
                                responses.optifine[2].status = 'orange';
                                s3 = true;
                                log(err.stack, 'error');
                            }
                        } else
                        if(!res || !body) {
                            responses.optifine[2].status = 'black';
                            s3 = true;
                        } else
                        if(res.statusCode === 200) {
                            responses.optifine[2].status = 'green';
                            s3 = true;
                        } else
                        if([404,503,520,522,524].indexOf(res.statusCode) !== -1) {
                            responses.optifine[2].status = 'red';
                            s3 = true;
                        } else {
                            log('Unexpected response from '+responses.optifine[2].server+' - '+res.statusCode, 'error');
                            responses.optifine[2].status = 'teal';
                            s3 = true;
                        }
                    });

                    request({url:'https://status.mojang.com/check', headers: {'User-Agent': 'optibot'}}, (err, res, body) => {
                        if(err) {
                            if(err.code === 'ETIMEDOUT') {
                                responses.mojang[0].status = 'black';
                                responses.mojang[1].status = 'black';
                                responses.mojang[2].status = 'black';
                                responses.mojang[3].status = 'black';
                                responses.mojang[4].status = 'black';
                                responses.mojang[5].status = 'black';
                                responses.mojang[6].status = 'black';
                                responses.mojang[7].status = 'black';
                                s4 = true;
                            } else {
                                responses.mojang[0].status = 'orange';
                                responses.mojang[1].status = 'orange';
                                responses.mojang[2].status = 'orange';
                                responses.mojang[3].status = 'orange';
                                responses.mojang[4].status = 'orange';
                                responses.mojang[5].status = 'orange';
                                responses.mojang[6].status = 'orange';
                                responses.mojang[7].status = 'orange';
                                s4 = true;
                                log(err.stack, 'error');
                            }
                        } else
                        if(!res || !body) {
                            responses.mojang[0].status = 'black';
                            responses.mojang[1].status = 'black';
                            responses.mojang[2].status = 'black';
                            responses.mojang[3].status = 'black';
                            responses.mojang[4].status = 'black';
                            responses.mojang[5].status = 'black';
                            responses.mojang[6].status = 'black';
                            responses.mojang[7].status = 'black';
                            s4 = true;
                        } else {
                            var json = JSON.parse(body);
                            for(var i in json) {
                                responses.mojang[i].status = json[i][Object.keys(json[i])];

                                if(parseInt(i)+1 === json.length) {
                                    s4 = true;
                                }
                            }
                        }
                    });
                });
            });
        }
    },
    {
        trigger: "bb",
        metadata: {
            shortdesc: "Link to the Blockbench Discord Server.",
            longdesc: "Provides a quick link to the Blockbench Discord Server.",
            usage: "!bb",
            admin: false,
            hidden: false,
            dm: true,
        },
        execute: function(m, args, isAdmin) {
            var embed = new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(icons['opti_bench.png'], "thumbnail.png"))
            .setAuthor('Blockbench Discord Server', 'attachment://thumbnail.png')
            .setDescription('https://discord.gg/e427TZR')

            typer(m, false);
            m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
        }
    },
    {
        trigger: "color",
        metadata: {
            shortdesc: "Test color codes.",
            longdesc: "Displays a colored square, using the specified color code. Supports Hexidecimal and RGB. Alpha channel optional.",
            usage: "!color [hex code | rgb code]",
            admin: false,
            hidden: false,
            dm: true,
        },
        execute: function(m, args, isAdmin) {
            var color;

            function isHex() {
                log('testing hex', 'debug')
                let num = args[0];

                if(num.startsWith('#')) {
                    num = num.substr(1);
                }

                if(num.length === 6) {
                    num += 'ff';
                }

                if(num.length !== 8) {
                    return false;
                } else 
                if (parseInt(num, 16).toString(16) === num.toLowerCase()) {
                    color = parseInt(num, 16);
                    return true;
                } else return false;
            }

            function isRGB() {
                if(!args[0] && !args[1] && !args[2]) {
                    return false;
                } else {
                    for(i = 0; i < 5; i++) {
                        if(i === 4 && args[3]) {
                            color = jimp.rgbaToInt(parseInt(args[0]), parseInt(args[1]), parseInt(args[2]), parseInt(args[3]));
                            return true;
                        } else 
                        if(i === 3 && !args[3]) {
                            color = jimp.rgbaToInt(parseInt(args[0]), parseInt(args[1]), parseInt(args[2]), 255);
                            return true;
                        } else {
                            log('checking args['+i+']', 'debug');
                            let num = parseInt(args[i]);

                            if(isNaN(num) || num > 255 || num < 0) {
                                return false;
                            }
                        }
                    }
                }
            }

            function final() {
                new jimp(128, 128, color, (err, image) => {
                    if(err) {
                        errorHandler(m, err);
                    } else {
                        image.getBuffer(jimp.AUTO, (err_b, imgFinal) => {
                            if (err_b) errorHandler(m, err_b);
                            else {
                                var embed = new discord.RichEmbed()
                                .setColor(cfg.vs.embed.default)
                                .attachFiles([new discord.Attachment(icons['opti_color.png'], "thumbnail.png"), new discord.Attachment(imgFinal, "color.png")])
                                .setAuthor("Color Viewer", 'attachment://thumbnail.png')
                                .setImage('attachment://color.png')
                                .setFooter("#"+color.toString(16).toUpperCase()) //.slice(0, -2)
                                
                                typer(m, false);
                                m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
                            }
                        });
                    }
                });
            }

            if(!args[0]) errorMsg(m, "You must specify a valid color code (RGB or Hexidecimal. Alpha channel optional)");
            else if(isRGB()) final();
            else if(isHex()) final();
            else errorMsg(m, "You must specify a valid color code (RGB or Hexidecimal. Alpha channel optional)");
        }
    },
    {
        trigger: "members",
        metadata: {
            shortdesc: "Show member count.",
            longdesc: "Displays the number of people in the server.",
            usage: "!members",
            admin: false,
            hidden: false,
            dm: true,
        },
        execute: function(m, args, isAdmin, member) {
            var embed = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFile(new discord.Attachment(icons['opti_member.png'], "thumbnail.png"))
                .setAuthor('Current member count: '+member.guild.memberCount, 'attachment://thumbnail.png')

            typer(m, false);
            m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
        }
    },
    {
        trigger: "offtopic",
        metadata: {
            shortdesc: "Go to <#426005631997181963>.",
            longdesc: "Go directly to <#426005631997181963>. Do not pass go, do not collect $200.",
            usage: "!offtopic",
            admin: false,
            hidden: false,
            dm: false,
        },
        execute: function(m, args, isAdmin) {
            if(m.channel.id === '426005631997181963') {
                errorMsg(m, "Are you lost?");
            } else {
                var embed = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFile(new discord.Attachment(images['offtopic.png'], "image.png"))
                .setDescription('<#426005631997181963>')
                .setImage('attachment://image.png')

                typer(m, false);
                m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
            }
        }
    },
    {
        trigger: "coin",
        metadata: {
            shortdesc: "Flip a coin.",
            longdesc: "Flips a coin. Not much else to it, really. Heads or tails?",
            usage: "!coin",
            admin: false,
            hidden: false,
            dm: true,
        },
        execute: function(m, args, isAdmin) {
            var embed = new discord.RichEmbed()
                .attachFile(new discord.Attachment(icons['opti_coin.png'], "thumbnail.png"))
                .setColor(cfg.vs.embed.default)
            
            var coin = ["Heads", "Tails"];

            embed.setAuthor(Random.pick(mt, coin), 'attachment://thumbnail.png')

            typer(m, false);
            m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
        }
    },
    {
        trigger: "dice",
        metadata: {
            shortdesc: "Roll a dice.",
            longdesc: "Roll a dice. Uses a single dice by default, but you can roll up to 6 at once.",
            usage: "!dice [# of dice]",
            admin: false,
            hidden: false,
            dm: true,
        },
        execute: function(m, args, isAdmin) {
            var embed = new discord.RichEmbed()
                .attachFile(new discord.Attachment(icons['opti_dice.png'], "thumbnail.png"))
                .setColor(cfg.vs.embed.default)
            
            var title = 'You rolled... ';

            var dice = [
                '<:dice1:546570333453549578>',
                '<:dice2:546570333382246400>',
                '<:dice3:546570333550018560>',
                '<:dice4:546570333923180545>',
                '<:dice5:546570334019518475>',
                '<:dice6:546570334254399492>'
            ];

            if(isNaN(args[0])) {
                var result = Random.integer(1, 6)(mt);
                embed.setAuthor(title+result+'!', 'attachment://thumbnail.png')
                    .setDescription(dice[result-1])

                typer(m, false);
                m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
            } else {
                var diceCount = parseInt(args[0]);

                if(diceCount >= 1) {
                    var resultsEmoji = '';
                    var resultsTotal = 0;

                    if(diceCount > 6) {
                        diceCount = 6;
                        embed.setFooter('Only 6 at a time, sorry.')
                    }

                    for(var i = 0; i < diceCount; i++) {
                        let rand = Random.integer(1, 6)(mt);
                        resultsEmoji += dice[rand-1]+' ';
                        resultsTotal += rand;

                        if(i+1 === diceCount) {
                            finalize();
                            break;
                        }
                    }

                    function finalize() {
                        embed.setAuthor(title+resultsTotal+'!', 'attachment://thumbnail.png')
                            .setDescription(resultsEmoji)

                        typer(m, false);
                        m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
                    }
                    
                } else
                if(diceCount === 0) {
                    embed.setAuthor(title+'0!', 'attachment://thumbnail.png')
                        .setFooter('I wonder why.')

                    typer(m, false);
                    m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
                } else
                if(diceCount < 0) {
                    var responses = [
                        "What... do you want me to do?",
                        "That's not how this works.",
                        "Seriously?",
                        "How?",
                        "I hope that was just some kind of typo."
                    ]

                    errorMsg(m, Random.pick(mt, responses))
                }
            }
        }
    },
    {
        trigger: "8ball",
        metadata: {
            shortdesc: "Shake a Magic 8-ball.",
            longdesc: "Answer life's most daunting questions with a virtual Magic 8-ball.",
            usage: "!8ball [query]",
            admin: false,
            hidden: false,
            dm: true,
        },
        execute: function(m, args, isAdmin) {
            var res_positive = [
                "It is certain.",
                "It is decidedly so.",
                "Without a doubt.",
                "Yes - Definitely.",
                "You may rely on it.",
                "As I see it, yes.",
                "Most likely.",
                "Outlook good.",
                "Yes.",
                "Signs point to yes."
            ]
            var res_neutral = [
                "Reply hazy, try again.",
                "Ask again later.",
                "Better not tell you now.",
                "Cannot predict now.",
                "Concentrate and ask again."
            ]
            var res_negative = [
                "Don't count on it.",
                "My reply is no.",
                "My sources say no.",
                "Outlook not so good.",
                "Very doubtful."
            ]

            var responses = [
                res_positive, res_positive, res_positive, res_neutral, res_negative, res_negative, res_negative
            ]

            var type = Random.integer(0, 4)(mt);

            var embed = new discord.RichEmbed()
                .setAuthor(Random.pick(mt, responses[type]), 'attachment://thumbnail.png')

            if(type < 3) {
                embed.setColor(cfg.vs.embed.okay)
                    .attachFile(new discord.Attachment(icons['opti_8ball_good.png'], "thumbnail.png"))
            } else 
            if(type > 3) {
                embed.setColor(cfg.vs.embed.error)
                    .attachFile(new discord.Attachment(icons['opti_8ball_bad.png'], "thumbnail.png"))
            } else {
                embed.setColor(cfg.vs.embed.default)
                    .attachFile(new discord.Attachment(icons['opti_8ball.png'], "thumbnail.png"))
            }

            typer(m, false);
            m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
        }
    },
    {
        trigger: "rng",
        metadata: {
            shortdesc: "Random number generator.",
            longdesc: "Generates a random number between 1 and 100. You can also set custom limits, if you want.",
            usage: "!rng [<min> <max>]",
            admin: false,
            hidden: false,
            dm: true,
        },
        execute: function(m, args, isAdmin) {
            var embed = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFile(new discord.Attachment(icons['opti_random.png'], "thumbnail.png"))

            if(!args[0]) {
                embed.setAuthor(Math.round(Random.real(1, 100)(mt)), 'attachment://thumbnail.png')

                typer(m, false);
                m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
            } else 
            if(isNaN(args[0])) {
                errorMsg(m, 'You must input numbers only.');
            } else 
            if(!args[1]) {
                errorMsg(m, 'You must specify the maximum limit.');
            } else
            if(isNaN(args[1])) {
                errorMsg(m, 'The maximum limit must be a number.');
            } else {
                embed.setAuthor(Math.round(Random.real(parseInt(args[0]), parseInt(args[1]))(mt)), 'attachment://thumbnail.png')

                typer(m, false);
                m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
            }
        }
    },
    {
        trigger: "bl",
        metadata: {
            shortdesc: "OptiBot blacklist.",
            longdesc: "Blacklists users, preventing them from using OptiBot commands.",
            usage: "!bl <user @mention>",
            admin: true,
            hidden: false,
            dm: false,
        },
        execute: function(m, args, isAdmin) {
            if(!isAdmin) {
                errorMsg(m, 'Sorry, you do not have permission to use this command.');
            } else
            if(!args[0]) {
                errorMsg(m, "Please specify the user to add or remove from the blacklist");
            } else
            if (m.mentions.members.size === 0) {
                errorMsg(m, 'You must specify a user via @mention.');
            } else
            if (m.mentions.members.first(1)[0].id === m.author.id) {
                errorMsg(m, 'You cannot blacklist yourself.');
            } else 
            if (m.mentions.members.first(1)[0].id === bot.user.id ) {
                errorMsg(m, '...seriously?');
            } else
            if (m.mentions.members.some(r => cfg.roles.protected.indexOf(r.id) === 0) ) {
                errorMsg(m, 'You\'re not strong enough to blacklist that user.');
            } else {

                db.bl.count({id:m.mentions.members.first(1)[0].id}, (err, count) => {
                    if(err) {
                        errorHandler(m, err);
                    } else
                    if(count === 0) {
                        db.bl.insert({id:m.mentions.members.first(1)[0].id}, (err2) => {
                            if(err2) {
                                errorHandler(m, err2);
                            } else {
                                var embed = new discord.RichEmbed()
                                    .setColor(cfg.vs.embed.okay)
                                    .attachFile(new discord.Attachment(icons['opti_success.png'], "thumbnail.png"))
                                    .setAuthor("Successfully added "+m.mentions.members.first(1)[0].user.username+"#"+m.mentions.members.first(1)[0].user.discriminator+" to the blacklist.", 'attachment://thumbnail.png')

                                typer(m, false);
                                m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
                            }
                        });
                    } else {
                        db.bl.remove({id:m.mentions.members.first(1)[0].id}, (err2) => {
                            if(err2) {
                                errorHandler(m, err2);
                            } else {
                                var embed = new discord.RichEmbed()
                                    .setColor(cfg.vs.embed.okay)
                                    .attachFile(new discord.Attachment(icons['opti_success.png'], "thumbnail.png"))
                                    .setAuthor("Successfully removed "+m.mentions.members.first(1)[0].user.username+"#"+m.mentions.members.first(1)[0].user.discriminator+" from the blacklist.", 'attachment://thumbnail.png')

                                typer(m, false);
                                m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
                            }
                        });
                    }
                });
            }
        }
    },
    {
        trigger: "rules",
        metadata: {
            shortdesc: "Display server rules.",
            longdesc: "Display all server rules, or just a single rule.",
            usage: "!rules [rule #]",
            admin: false,
            hidden: false,
            dm: true,
        },
        execute: function(m, args, isAdmin) {
            if(isNaN(args[0])) {
                var embed = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFile(new discord.Attachment(icons['opti_docs.png'], "thumbnail.png"))
                .setAuthor("OptiFine Discord Server Rules", 'attachment://thumbnail.png')
                .setDescription("To continue participating in this server, please read and follow the rules at all times. For more information, [click here.](https://discordapp.com/channels/423430686880301056/479192475727167488/531868049402495006 \"You found a secret!\")")
            
                for(i in rules){
                    embed.addField(rules[i][0], rules[i][1])
                }

                typer(m, false);
                m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
            } else
            if (rules[parseInt(args[0])-1] === undefined) {
                if(parseInt(args[0]) < 0) {
                    errorMsg(m, '˙ʇsᴉxǝ ʇou sǝop ǝlnɹ ʇɐɥ┴');
                } else
                if(parseInt(args[0]) === 34) {
                    errorMsg(m, 'Hilarious.');
                } else
                if(parseInt(args[0]) === 64) {
                    errorMsg(m, 'YAHOOOOOOOOOO');
                } else
                if(parseInt(args[0]) === 69) {
                    errorMsg(m, 'Nice.');
                } else
                if(parseInt(args[0]) === 173) {
                    errorMsg(m, '[REDACTED]');
                } else
                if(parseInt(args[0]) === 614) {
                    errorMsg(m, '🙂');
                } else
                if(parseInt(args[0]) === 420) {
                    errorMsg(m, 'DUDE WEED LMAO');
                } else
                if(parseInt(args[0]) === 9001) {
                    errorMsg(m, 'This joke died 10 years ago.');
                } else {
                    errorMsg(m, 'That rule does not exist.');
                }
            } else {
                var ruleIndex = rules[parseInt(args[0])-1]
                var embed = new discord.RichEmbed()
                    .setColor(cfg.vs.embed.default)
                    .attachFile(new discord.Attachment(icons['opti_docs.png'], "thumbnail.png"))
                    .setAuthor(ruleIndex[0]+' - '+ruleIndex[1], 'attachment://thumbnail.png')
                
                typer(m, false);
                m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
            }
        }
    },
    {
        trigger: "udc",
        metadata: {
            shortdesc: "Update OptiFine docs.",
            longdesc: "Makes OptiBot redownload the current version of the OptiFine docs from GitHub. Docs are cached internally, and never updated automatically unless the bot restarts. \n\nTL;DR: Use this command if new files are added to the OptiFine documentation.",
            usage: "!udc",
            admin: false,
            hidden: false,
            dm: true,
        },
        execute: function(m, args, isAdmin) {
            if(gh_docsUpdateTimeout && !isAdmin) {
                errorMsg(m, 'Docs can only be updated once every hour, please wait.');
            } else
            if(gh_docsUpdating) {
                errorMsg(m, 'Docs are already being updated, please wait.');
            } else {
                var listener = () => {
                    var embed = new discord.RichEmbed()
                    .setColor(cfg.vs.embed.okay)
                    .attachFile(new discord.Attachment(icons['opti_success.png'], "thumbnail.png"))
                    .setAuthor('Done', 'attachment://thumbnail.png')

                    typer(m, false);
                    m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });

                    try {
                        gh_docs_finish.removeListener('done', listener);
                    }
                    
                    catch (err) {
                        errorHandler(m, err);
                    }
                }

                try {
                    gh_docs_finish.on('done', listener);
                }
                
                catch (err) {
                    errorHandler(m, err);
                }
                

                updateDocs(m);
            }
        }
    },
    {
        trigger: "docs",
        metadata: {
            shortdesc: "Search OptiFine documentation.",
            longdesc: "Search for files in the current version of OptiFine documentation, or just give a link to the entire directory. Line numbers are optional.",
            usage: "!docs [query, no spaces] [line #]",
            admin: false,
            hidden: false,
            dm: true,
        },
        execute: function(m, args, isAdmin) {
            var embed = new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(icons["opti_docs.png"], "thumbnail.png"))
            .setAuthor("Official OptiFine Documentation", 'attachment://thumbnail.png')

            if(!args[0]) {
                embed.addField("Main Directory", "https://github.com/sp614x/optifine/tree/master/OptiFineDoc/doc");

                typer(m, false);
                m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
            } else {
                var files = [];

                for(var i = 0; i < gh_docs.length; i++) {
                    files.push(gh_docs[i].name);

                    if(i+1 === gh_docs.length) finalize();
                }

                function finalize() {
                    log('finalizing search', 'debug');
                    var fileSearch = cstr.findBestMatch(args[0], files);
                    var target = fileSearch.bestMatch.target;
                    var searching = false;

                    function done() {
                        typer(m, false);
                        m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
                    }

                    if(args[1] && !isNaN(parseInt(args[1])) && !target.endsWith('.png')) {
                        searching = true;
                        embed.addField(target, gh_docs[fileSearch.bestMatchIndex].html_url+'#L'+Math.abs(parseInt(args[1])))

                        request({url: 'https://raw.githubusercontent.com/sp614x/optifine/master/OptiFineDoc/doc/'+target+'?ref=master&access_token='+cfg.keys.github, headers: {'User-Agent': 'optibot'}}, (err, res, body) => {
                            if(err) {
                                errorHandler(m, err);
                            } else
                            if(!res || !body){
                                errorHandler(m, new Error('Failed to get a response from the GitHub API. (stage3)'));
                            } else {
                                var codeblock = body.split(/\r\n|\r|\n/g)[Math.abs(parseInt(args[1]))-1];

                                var filetype = target.substring(target.lastIndexOf('.')+1, target.length);
                                embed.addField('Line #'+Math.abs(parseInt(args[1])), `\`\`\`${filetype}\n${codeblock}\`\`\``);

                                done();
                            }
                        });
                    } else {
                        embed.addField(target, gh_docs[fileSearch.bestMatchIndex].html_url)
                    }

                    if(target.endsWith('.png')) {
                        embed.setImage(gh_docs[fileSearch.bestMatchIndex].download_url);
                    }

                    embed.setFooter(`${Math.round(fileSearch.bestMatch.rating * 100)}% match during search.`)

                    if(!searching) {
                        done();
                    }
                }

            }
        }
    },
    {
        trigger: "shaders",
        metadata: {
            shortdesc: "Official list of Shader Packs.",
            longdesc: "Provides a quick link to the Official list of Shader Packs.",
            usage: "!shaders",
            admin: false,
            hidden: false,
            dm: true,
        },
        execute: function(m, args, isAdmin) {
            var embed = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFile(new discord.Attachment(icons['opti_shader.png'], "thumbnail.png"))
                .setAuthor('Official List of Shader Packs', 'attachment://thumbnail.png')
                .setDescription('http://shaders.wikia.com/wiki/Shader_Packs')

            typer(m, false);
            m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
        }
    },
    {
        trigger: "mcwiki",
        metadata: {
            shortdesc: "Search the Minecraft Wiki.",
            longdesc: "Search for anything on the Official Minecraft Wiki.",
            usage: "!mcwiki <query>",
            admin: false,
            hidden: false,
            dm: true,
        },
        execute: function(m, args, isAdmin) {
            var embed = new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(icons['opti_mcwiki.png'], "thumbnail.png"))
            .setAuthor('Official Minecraft Wiki', 'attachment://thumbnail.png');

            if(!args[0]) {
                embed.addField("Home Page", 'https://minecraft.gamepedia.com/Minecraft_wiki');

                typer(m, false);
                m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
            } else {
                var url = "https://minecraft.gamepedia.com/api.php?action=query&format=json&generator=search&gsrsearch="+encodeURIComponent(m.content.trim().split("\n", 1)[0].substring(8))+"&gsrlimit=1&prop=info&inprop=url";
                
                if(args[0].toLowerCase() === "random") url = "https://minecraft.gamepedia.com/api.php?action=query&format=json&generator=random&prop=info&inprop=url";

                request(url, (err, res, data) => {
                    if(err) {
                        errorHandler(m, err);
                    } else 
                    if(!res || !data) {
                        errorHandler(m, new Error('Failed to get a response from the Minecraft Wiki API'));
                    } else {
                        var result = JSON.parse(data);

                        if(!result.query) {
                            embed.setDescription("Error: Could not find a matching page.")
                            .addField("Home Page", 'https://minecraft.gamepedia.com/Minecraft_wiki');

                            typer(m, false);
                            m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
                        } else {
                            var resultID = Object.keys(result.query.pages)[0];
                            embed.addField(result.query.pages[resultID].title, result.query.pages[resultID].fullurl);

                            typer(m, false);
                            m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
                        }
                    }
                });
            }
        }
    },
    {
        trigger: "help",
        metadata: {
            shortdesc: "Shows this menu.",
            longdesc: "General information hub for OptiBot commands.",
            usage: "!help [command name | page #]",
            admin: false,
            hidden: false,
            dm: true,
        },
        execute: function(m, args, isAdmin) {
            if(args[0]) {
                if(isNaN(args[0]) && args[0].toLowerCase() !== 'mod') {
                    getCmd(args[0], (res) => {
                        if(res) {
                            function s2 () {
                                if(res.metadata.admin && !isAdmin) {
                                    errorMsg(m, 'You do not have permission to view this command.');
                                } else {
                                    var embed = new discord.RichEmbed()
                                    .setColor(cfg.vs.embed.default)
                                    .attachFile(new discord.Attachment(icons['opti_info.png'], "thumbnail.png"))
                                    .setAuthor('OptiBot Command: '+cfg.basic.trigger+res.trigger, 'attachment://thumbnail.png')
                                    .setDescription(res.metadata.longdesc)
                                    .addField('Usage', "```"+res.metadata.usage+"```");
                                    
        
                                    if(res.metadata.dm) {
                                        embed.setFooter("This command can be used in DMs.", 'https://cdn.discordapp.com/emojis/546570334233690132.png')
                                    } else {
                                        embed.setFooter("This command can not be used in DMs.", 'https://cdn.discordapp.com/emojis/546570334120312834.png')
                                    }
        
                                    typer(m, false);
                                    m.channel.send({embed:embed}).then(msg => { deletable(m, msg) });
                                }
                            }

                            if(args[0].toLowerCase() === 'exec') {
                                if(m.author.id === '181214529340833792') {
                                    s2();
                                } else {
                                    errorMsg(m, '"'+args[0]+'" is not a valid command.');
                                }
                            } else {
                                s2();
                            }
                        } else {
                            errorMsg(m, '"'+args[0]+'" is not a valid command.');
                        }
                    });
                } else {
                    s2();
                }
            } else {
                s2();
            }

            function s2() {
                var visible = [];
                var limit = 5;
                var pageCount;
                var currentPage = 1;

                // filter out commands the user should not see
                if(args[0] && args[0].toLowerCase() === 'mod') {
                    if(isAdmin) {
                        if(m.channel.type === 'dm' || (typeof m.channel.id !== undefined && cfg.channels.mod.indexOf(m.channel.id) > -1)) {
                            visible = cmdIndex.filter((e) => (!e.metadata.hidden && e.metadata.admin) ? true : false);
                        } else {
                            errorMsg(m, 'You must be in a moderator-only channel to view this information.')
                        }
                    } else {
                        errorMsg(m, 'You do not have permission to view this information.')
                    }
                } else {
                    visible = cmdIndex.filter((e) => {
                        if(isAdmin && typeof m.channel.id !== undefined && cfg.channels.mod.indexOf(m.channel.id) > -1) {
                            if(!e.metadata.hidden) return true;
                            else return false;
                        } else {
                            if(!e.metadata.hidden && !e.metadata.admin) return true;
                            else return false;
                        }
                    });
                }
                
                if(m.channel.type === 'dm') {
                    limit = 25;
                }

                if(!visible) return;
                pageCount = Math.ceil(visible.length / limit);

                // get page number, if specified
                if(args[0] && !isNaN(args[0])) {
                    if(parseInt(args[0]) <= pageCount && parseInt(args[0]) > 1) {
                        currentPage = parseInt(args[0]);
                    }
                } else
                if(args[0] && args[0].toLowerCase() === 'mod' && args[1] && !isNaN(args[1])) {
                    if(parseInt(args[1]) <= pageCount && parseInt(args[1]) > 1) {
                        currentPage = parseInt(args[1]);
                    }
                }

                var embed = new discord.RichEmbed()
                .setColor(cfg.vs.embed.default)
                .attachFile(new discord.Attachment(icons['opti_info.png'], "thumbnail.png"))
                .setAuthor(`OptiBot Commands (Page ${currentPage}/${pageCount})`, 'attachment://thumbnail.png', 'https://goo.gl/NNm3yN');

                if(limit === 5) {
                    embed.setDescription('You can view more commands at once in DMs.')
                }
                
                var added = 0;

                for(var i in visible) {
                    if( parseInt(i)+1 > (limit * (currentPage - 1)) ) {
                        embed.addField(cfg.basic.trigger+visible[i].trigger, "`"+visible[i].metadata.usage+"` - "+visible[i].metadata.shortdesc);
                        added++;
                    }

                    if(parseInt(i)+1 === visible.length || added === limit) {
                        typer(m, false);
                        m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });

                        break;
                    }
                }
            }
        }
    },
    {
        trigger: "pfp",
        metadata: {
            shortdesc: "Update avatar.",
            longdesc: "Updates OptiBot's Discord avatar.",
            usage: "!pfp",
            admin: true,
            hidden: true,
            dm: true,
        },
        execute: function(m, args, isAdmin) {
            if(m.author.id === '181214529340833792') {
                bot.user.setAvatar('./icons/opti_pfp.png');
            } else {
                errorMsg(m, 'Sorry, you do not have permission to use this command.');
            }
        }
    },
    {
        trigger: "about",
        metadata: {
            shortdesc: "About OptiBot",
            longdesc: "Displays basic information about OptiBot, including credits and the current version.",
            usage: "!about",
            admin: false,
            hidden: false,
            dm: true,
        },
        execute: function(m, args, isAdmin) {
            var p1 = jimp.read(bot.user.avatarURL);
            var p2 = jimp.read(icons['optifine_thumbnail_mask.png']);

            Promise.all([p1, p2]).then((images) => {
                var icon = images[0];
                var mask = images[1];

                icon.mask(mask, 0, 0);

                icon.getBuffer(jimp.AUTO, (err_b, imgFinal) => {
                    if (err_b) errorHandler(m, err_b);
                    else {
                        var embed = new discord.RichEmbed()
                        .setColor(cfg.vs.embed.default)
                        .attachFiles([new discord.Attachment(icons['opti_info.png'], "thumbnail.png"), new discord.Attachment(imgFinal, "logo.png")])
                        .setAuthor('About OptiBot', 'attachment://thumbnail.png')
                        .setDescription('The official OptiFine Discord server bot. Made out of love for a great community, for a great game.')
                        .addField('Credits', 
                        '<@181214529340833792> - Programmer, Creator of OptiBot'
                        + '\n<@202558206495555585> - Contributor, Creator of OptiFine'
                        + '\n<@321718654163222529> - Contributor'
                        + '\n<@216984834143158275> - Early bugtesting')
                        .setThumbnail('attachment://logo.png')
                        .setFooter('Version '+pkg.version+' • '+Random.pick(mt, splash))

                        typer(m, false);
                        m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
                    }
                });
            });
        }
    },
    {
        trigger: "donate",
        metadata: {
            shortdesc: "Information about OptiFine donations.",
            longdesc: "Provides detailed information about OptiFine donations, including perks and pricing.",
            usage: "!donate [page #]",
            admin: false,
            hidden: false,
            dm: true,
        },
        execute: function(m, args, isAdmin) {
            var pages = [
                {
                    embed: new discord.RichEmbed()
                    .setColor(cfg.vs.embed.default)
                    .attachFile(new discord.Attachment(icons['opti_donate.png'], "thumbnail.png"))
                    .setAuthor('Donation Info (Page 1/2)', 'attachment://thumbnail.png')
                    .setDescription('Support OptiFine\'s development with a one-time donation of $10, and optionally receive an OptiFine player cape as a sign of your awesomeness. In addition, you may request the Donator role on this very Discord server. This grants instant access to the exclusive, donator-only text channel. (Instructions on page 2) \n\nhttps://optifine.net/donate')
                    .setFooter('Thank you for your consideration!')
                },
                {
                    embed: new discord.RichEmbed()
                    .setColor(cfg.vs.embed.default)
                    .attachFiles([new discord.Attachment(icons['opti_donate.png'], "thumbnail.png"), new discord.Attachment(images['token.png'], "token.png")])
                    .setAuthor('Donation Info (Page 2/2)', 'attachment://thumbnail.png')
                    .setThumbnail('attachment://token.png')
                    .setDescription('To gain access to the Donator role, simply DM <@468582311370162176> with this command: `!dr` Include your donation E-Mail and token. You can find your donator token on the website: https://optifine.net/login. Look at the bottom of the page for a string of random characters. Please note that your "Donation ID" is **NOT** your token.')
                },
            ];

            let pageNum = 0;
            if(!isNaN[args[0]] && pages[args[0]-1] !== undefined) pageNum = args[0]-1;
            

            typer(m, false);
            m.channel.send(pages[pageNum]).then(msg => { deletable(m, msg) });
        }
    },
    {
        trigger: "lab",
        metadata: {
            shortdesc: "Link to the ShaderLABS Discord Server.",
            longdesc: "Provides a quick link to the ShaderLABS Discord Server.",
            usage: "!lab",
            admin: false,
            hidden: false,
            dm: true,
        },
        execute: function(m, args, isAdmin) {
            var embed = new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(icons['opti_lab.png'], "thumbnail.png"))
            .setAuthor('ShaderLABS Discord Server', 'attachment://thumbnail.png')
            .setDescription('https://discord.gg/RP8CEdB')

            typer(m, false);
            m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
        }
    },
    {
        trigger: "of",
        metadata: {
            shortdesc: "OptiFine home page.",
            longdesc: "Provides a quick link to the OptiFine website.",
            usage: "!of",
            admin: false,
            hidden: false,
            dm: true,
        },
        execute: function(m, args, isAdmin) {
            var embed = new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(icons['opti_fine.png'], "thumbnail.png"))
            .setAuthor('OptiFine Official Website', 'attachment://thumbnail.png')
            .setDescription('https://optifine.net/home')
            
            typer(m, false);
            m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
        }
    },
    {
        trigger: "gh",
        metadata: {
            shortdesc: "Link to the OptiFine issue tracker.",
            longdesc: "Provides a quick link to the OptiFine issue tracker on GitHub.",
            usage: "!gh",
            admin: false,
            hidden: false,
            dm: true,
        },
        execute: function(m, args, isAdmin, member) {
            var embed = new discord.RichEmbed()
            .attachFile(new discord.Attachment(icons['opti_gh.png'], "gh.png"))
            .setColor(cfg.vs.embed.default)
            .setAuthor('OptiFine Issue Tracker', 'attachment://gh.png')
            .setDescription('https://github.com/sp614x/optifine/issues');

            typer(m, false);
            m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
        }
    },
    {
        trigger: "cape",
        metadata: {
            shortdesc: "Display donator capes.",
            longdesc: "Displays donator capes for a specified user. Usernames are not case-sensitive.",
            usage: "!cape <player name>",
            admin: false,
            hidden: false,
            dm: true,
        },
        execute: function (m, args, isAdmin) {
            if(!args[0]) {
                errorMsg(m, 'Please specify the Minecraft username of the cape owner.')
            } else {
                request({url: 'https://api.mojang.com/users/profiles/minecraft/'+args[0], encoding: null}, (err_m, res_m, data_m) => {
                    if(err_m) {
                        errorHandler(m, err_m);
                    } else
                    if(!res_m) {
                        errorHandler(m, new Error('Failed to get a response from the Mojang API'));
                    } else
                    if(res_m.statusCode === 204) {
                        var embed = new discord.RichEmbed()
                        .setColor(cfg.vs.embed.error)
                        .attachFile(new discord.Attachment(icons['opti_err.png'], "thumbnail.png"))
                        .setAuthor('That user does not exist.', 'attachment://thumbnail.png')
                        .setFooter('Maybe check your spelling?');
                        
                        typer(m, false);
                        m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
                    } else {
                        var result = JSON.parse(data_m);

                        var username = result.name;
                        request({url: 'https://optifine.net/capes/'+username+'.png', encoding: null}, (err_o, res_o, data_o) => {
                            if(err_o) {
                                errorHandler(m, err_o);
                            } else
                            if(!res_o) {
                                errorHandler(m, new Error('Failed to get a response from OptiFine.net'));
                            } else
                            if(res_o.statusCode === 404) {
                                errorMsg(m, 'That user does not have a cape.');
                            } else
                            if(res_o.statusCode === 200) {
                                jimp.read(data_o, (err_j, image) => {
                                    if(err_j) errorHandler(m, err_j);
                                    else {
                                        var full = false;
                                        if((args[1] && args[1].toLowerCase() === 'full') || (image.bitmap.width < 46)) {
                                            full = true;
                                            image.resize(256, jimp.AUTO, jimp.RESIZE_NEAREST_NEIGHBOR);
                                            finalize(image);
                                        } else {
                                            if(jimp.intToRGBA(image.getPixelColor(1,1)).a !== 0) {
                                                // standard capes
                                                let elytra = image.clone();
                                                let cape = image.clone();
                                                
                                                cape.crop(1, 1, 10, 16);
                                                elytra.crop(36, 2, 10, 20);

                                                new jimp(21, 20, (err_s2, image_s2) => {
                                                    if(err_s2) errorHandler(m, err_s2)
                                                    else {
                                                        image_s2.composite(cape, 0, 0);
                                                        image_s2.composite(elytra, 11, 0);
                                                        image_s2.resize(jimp.AUTO, 200, jimp.RESIZE_NEAREST_NEIGHBOR);

                                                        finalize(image_s2);
                                                    }
                                                });
                                            } else {
                                                // banner capes
                                                let elytra = image.clone();
                                                let cape = image.clone();
                                                
                                                cape.crop(2, 2, 20, 32);
                                                elytra.crop(72, 4, 20, 40);

                                                new jimp(42, 40, (err_s2, image_s2) => {
                                                    if(err_s2) errorHandler(m, err_s2)
                                                    else {
                                                        image_s2.composite(cape, 0, 0);
                                                        image_s2.composite(elytra, 22, 0);
                                                        image_s2.resize(jimp.AUTO, 200, jimp.RESIZE_NEAREST_NEIGHBOR);

                                                        finalize(image_s2);
                                                    }
                                                });
                                            }
                                        }

                                        function finalize(image_p) {
                                            image_p.getBuffer(jimp.AUTO, (err_b, imgFinal) => {
                                                if (err_b) errorHandler(m, err_b);
                                                else {
                                                    var embed = new discord.RichEmbed()
                                                    .setColor(cfg.vs.embed.default)
                                                    .attachFiles([new discord.Attachment(icons['opti_cape.png'], "thumbnail.png"), new discord.Attachment(imgFinal, "cape.png")])
                                                    .setImage('attachment://cape.png')
                                                    .setFooter(username);

                                                    if(username.toLowerCase().indexOf('optibot') > -1) {
                                                        embed.setDescription('Please note that OptiBot does NOT have it\'s own Minecraft account, nor a donator cape.')
                                                    } else
                                                    if(username.toLowerCase().indexOf('optifine') > -1) {
                                                        embed.setDescription('Please note that OptiFine itself does NOT have an official Minecraft account, nor a donator cape.')
                                                    } else
                                                    if(username.toLowerCase().indexOf('sp615x') > -1 || username.toLowerCase().indexOf('sp613x') > -1) {
                                                        embed.setDescription('Perhaps you meant "sp614x"?')
                                                    }

                                                    if(full) {
                                                        embed.setAuthor('Donator Cape (Full Texture)', 'attachment://thumbnail.png')
                                                    } else {
                                                        embed.setAuthor('Donator Cape', 'attachment://thumbnail.png')
                                                    }
                                                    
                                                    typer(m, false);
                                                    m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
                                                }
                                            });
                                        }
                                    }
                                });
                            } else {
                                errorHandler(m, new Error("Unexpected response: "+res_o.statusCode));
                            }
                        });
                    }
                });
            }
        }
    },
    {
        trigger: "ping",
        metadata: {
            shortdesc: "Websocket Ping.",
            longdesc: "Displays average websocket latency.",
            usage: "!ping",
            admin: true,
            hidden: false,
            dm: true,
        },
        execute: function (m, args, isAdmin) {
            if(isAdmin) {
                typer(m, false);
                m.channel.send(Math.round(bot.ping)+"ms");
            } else {
                errorMsg(m, 'Sorry, you do not have permission to use this command.');
            }
        }
    },
    {
        trigger: "error",
        metadata: {
            shortdesc: "Destructive Error Test.",
            longdesc: "Destructive Error Test.",
            usage: "!error",
            admin: true,
            hidden: true,
            dm: true,
        },
        execute: function (m, args, isAdmin) {
            if(isAdmin) {
                errorHandler(m, new Error('test error destructive'));
            } else {
                errorMsg(m, 'Sorry, you do not have permission to use this command.');
            }
        }
    },
    {
        trigger: "error1",
        metadata: {
            shortdesc: "Non-destructive Error Test.",
            longdesc: "Non-destructive Error Test.",
            usage: "!error1",
            admin: true,
            hidden: true,
            dm: true,
        },
        execute: function (m, args, isAdmin) {
            if(isAdmin) {
                errorMsg(m, 'test error non-destructive');
            } else {
                errorMsg(m, 'Sorry, you do not have permission to use this command.');
            }
        }
    },
    {
        trigger: "error2",
        metadata: {
            shortdesc: "Short Error Test.",
            longdesc: "Short Error Test.",
            usage: "!error2",
            admin: true,
            hidden: true,
            dm: true,
        },
        execute: function (m, args, isAdmin) {
            if(isAdmin) {
                errorHandler(m, new Error('test error short'), true);
            } else {
                errorMsg(m, 'Sorry, you do not have permission to use this command.');
            }
        }
    },
    {
        trigger: "error3",
        metadata: {
            shortdesc: "Fatal Error Test.",
            longdesc: "Fatal Error Test.",
            usage: "!error3",
            admin: true,
            hidden: true,
            dm: true,
        },
        execute: function (m, args, isAdmin) {
            if(isAdmin) {
                throw new Error('test error fatal');
            } else {
                errorMsg(m, 'Sorry, you do not have permission to use this command.');
            }
        }
    },
    {
        trigger: "exec",
        metadata: {
            shortdesc: "Execute some code.",
            longdesc: "Attempts to execute some code.",
            usage: "!exec [javascript code]",
            admin: true,
            hidden: true,
            dm: true,
        },
        execute: function (m, args, isAdmin) {
            if(m.author.id === '181214529340833792') {
                try {
                    var execute = eval(m.content.substring(5));
                    var msg = "```javascript\n"+execute+"```";
                    log(execute, 'warn');

                    if (msg.length >= 2000) {
                        typer(m, false);
                        m.channel.send('Output too long, see log.');
                    } else {
                        typer(m, false);
                        m.channel.send(msg);
                    }
                }
                catch(err) {
                  errorHandler(m, err, true);
                }
            } else {
                unknownCmd(m);
            }
        }
    },
    {
        trigger: "stop",
        metadata: {
            shortdesc: "Makes the bot shut down entirely.",
            longdesc: "Makes the bot shut down entirely.",
            usage: "!stop",
            admin: true,
            hidden: false,
            dm: true,
        },
        execute: function (m, args, isAdmin) {
            if(isAdmin) {
                var embed = new discord.RichEmbed()
                    .setColor(cfg.vs.embed.default)
                    .attachFile(new discord.Attachment(icons['opti_exit.png'], "thumbnail.png"))
                    .setAuthor('Shutting down...', 'attachment://thumbnail.png')
                
                typer(m, false);
                m.channel.send({embed: embed}).then(msg => {
                    shutdownHandler(0);
                }).catch(err => {
                    errorHandler(m, err);
                    shutdownHandler(0);
                });
            } else {
                errorMsg(m, 'Sorry, you do not have permission to use this command.');
            }
        }
    },
    {
        trigger: "sleep",
        metadata: {
            shortdesc: "Makes the bot shut down temporarily.",
            longdesc: "Makes the bot shutdown for 1 hour before restarting.",
            usage: "!sleep",
            admin: true,
            hidden: false,
            dm: true,
        },
        execute: function (m, args, isAdmin) {
            if(isAdmin) {
                var embed = new discord.RichEmbed()
                    .setColor(cfg.vs.embed.default)
                    .attachFile(new discord.Attachment(icons['opti_exit.png'], "thumbnail.png"))
                    .setAuthor('Going to sleep...', 'attachment://thumbnail.png')
                
                typer(m, false);
                m.channel.send({embed: embed}).then(msg => {
                    shutdownHandler(3);
                }).catch(err => {
                    errorHandler(m, err);
                    shutdownHandler(3);
                });
            } else {
                errorMsg(m, 'Sorry, you do not have permission to use this command.');
            }
        }
    },
    {
        trigger: "restart",
        metadata: {
            shortdesc: "Restarts the bot.",
            longdesc: "Restarts the bot.",
            usage: "!restart",
            admin: true,
            hidden: false,
            dm: true,
        },
        execute: function (m, args, isAdmin) {
            if(isAdmin) {
                var embed = new discord.RichEmbed()
                    .setColor(cfg.vs.embed.default)
                    .attachFile(new discord.Attachment(icons['opti_exit.png'], "thumbnail.png"))
                    .setAuthor('Restarting...', 'attachment://thumbnail.png')
                
                typer(m, false);
                m.channel.send({embed: embed}).then(msg => {
                    shutdownHandler(2);
                }).catch(err => {
                    errorHandler(m, err);
                    shutdownHandler(2);
                });
            } else {
                errorMsg(m, 'Sorry, you do not have permission to use this command.');
            }
        }
    }
];

////////////////////////////////////////////////////////////////////////////////
// Global Functions
////////////////////////////////////////////////////////////////////////////////

function muteUser(m, args, muting) {
    if(!args[0]) {
        if(muting) {
            errorMsg(m, 'Please specify the user to mute.')
        } else {
            errorMsg(m, 'Please specify the user to unmute.')
        }
    } else
    if(m.mentions.members.size === 0) {
        errorMsg(m, 'You must specify a valid user @mention.')
    } else {
        bot.guilds.get(cfg.basic.of_server).fetchMember(m.mentions.members.first(1)[0].id).then(mem => {
            var db_data = {
                member_id: mem.user.id
            };

            if(cfg.roles.protected.indexOf(m.mentions.members.first(1)[0].id) > -1) {
                if(muting) {
                    errorMsg(m, 'You\'re not powerful enough to mute that user.');
                } else {
                    errorMsg(m, 'That user is too powerful to be muted in the first place.')
                }
                return;
            };

            if(muting && mem.roles.has(cfg.roles.muted)) {
                errorMsg(m, 'That user is already muted.')
                return;
            } else
            if(!muting && !mem.roles.has(cfg.roles.muted)) {
                errorMsg(m, 'That user is not muted.')
                return;
            }

            function finalize() {
                var mutedUser = m.mentions.members.first(1)[0].user.username+'#'+m.mentions.members.first(1)[0].user.discriminator;
                var embed = new discord.RichEmbed()
                    .setColor(cfg.vs.embed.okay)
                    .attachFile(new discord.Attachment(icons['opti_success.png'], "thumbnail.png"))
                
                if(muting) {
                    mem.addRole(cfg.roles.muted, 'User muted by '+m.author.username+'#'+m.author.discriminator).then(() => {
                        if(!db_data.time) {
                            embed.setAuthor('Successfully muted '+mutedUser+'. User will be muted INDEFINITELY.', 'attachment://thumbnail.png');
                        } else {
                            if(args[1] === '1') {
                                embed.setAuthor('Successfully muted '+mutedUser+'. User will be unmuted in approximately '+args[1]+' hour.', 'attachment://thumbnail.png');
                            } else {
                                embed.setAuthor('Successfully muted '+mutedUser+'. User will be unmuted in approximately '+args[1]+' hours.', 'attachment://thumbnail.png');
                            }

                            db.muted.insert(db_data);
                        }

                        typer(m, false);
                        m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
                    }).catch(err => errorHandler(m, err));
                } else {
                    mem.removeRole(cfg.roles.muted, 'User unmuted by '+m.author.username+'#'+m.author.discriminator).then(() => {
                        db.muted.find({member_id: mem.user.id}, (err, res) => {
                            if(err) {
                                errorHandler(m, err);
                            } else
                            if(res.length !== 0) {
                                db.muted.remove({member_id: mem.user.id});
                            }
                        });

                        embed.setAuthor('Successfully unmuted '+m.mentions.members.first(1)[0].user.username+'#'+m.mentions.members.first(1)[0].user.discriminator, 'attachment://thumbnail.png')

                        typer(m, false);
                        m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
                    }).catch(err => errorHandler(m, err));
                }
            }

            if(muting) {
                if(args[1]) {
                    if(isNaN(args[1])) {
                        errorMsg(m, 'Time limit must be a valid number of hours.')
                    } else 
                    if (parseInt(args[1]) < 1) {
                        errorMsg(m, 'Be reasonable.')
                    } else {
                        var now = new Date();
    
                        db_data.time = now.setHours(now.getHours() + parseInt(args[1]));
    
                        finalize();
                    }
                } else {
                    finalize();
                }
            } else {
                finalize();
            }
        }).catch(err => errorHandler(m, err));
    }
}
function getCmd(cmd, callback) {
    for(i in cmdIndex) {
        if(cmd.toLowerCase() === cmdIndex[i].trigger) {
            callback(cmdIndex[i]);
            break;
        } else
        if((parseInt(i)+1) === cmdIndex.length) {
            callback();
        }
    }
}

function ghRefs(m, issues, isAdmin) {
    log('GHREFS', 'debug');
    log(issues, 'debug');
    // limit to 4 for normal users, limit to 8 for donators, limit to 12 for moderators
    var issueLinks = [];
    //var brk = false;
    var limited = false;
    let i = 0;

    (function search() {
        log('parsing '+issues[i], 'debug');

        request('https://github.com/sp614x/optifine/issues/'+issues[i]+'.json', (err, res, data) => {
            log('response', 'debug');
            if(err) {
                errorHandler(m, err);
            } else
            if(!res || !data) {
                errorHandler(m, new Error('Failed to get a response from the GitHub API'));
            } else 
            if(res.statusCode === 403) {
                errorHandler(m, new Error('403 Forbidden (OptiBot may be ratelimited)'));
            } else {

                let title = JSON.parse(data).title;

                if(title) {
                    let result = `[#${issues[i]} - ${title}](https://github.com/sp614x/optifine/issues/${issues[i]})`;
                    if(issueLinks.indexOf(result) === -1) {
                        issueLinks.push(result);
                    }
                }

                var last = i+1 === issues.length;

                // if we have 4 links, and the user is NOT a donator, and the user is NOT an admin
                if(issueLinks.length === 4 && !m.member.roles.has(cfg.roles.donator) && !isAdmin) {
                    if(!last) limited = true;
                    finalize();
                } else
                // if we have 8 links, and the user is NOT an admin
                if(issueLinks.length === 8 && !isAdmin) {
                    if(!last) limited = true;
                    finalize();
                } else
                // if we have 12 links
                if(issueLinks.length === 12) {
                    if(!last) limited = true;
                    finalize();
                } else
                if(last) {
                    finalize();
                } else {
                    bot.setTimeout(() => {
                        i++;
                        search();
                    }, 500);
                }
            }
        });
    })();

    function finalize() {
        log('finalizing', 'debug');
        let footer = ' GitHub issues found';
        if(issueLinks.length === 1) {
            footer = ' GitHub issue found';
        }

        if(limited) {
            footer += '. Some issues were omitted to prevent spam.'
        }

        let desc = '';
        if(issueLinks.length === 0) {
            desc = 'https://github.com/sp614x/optifine/issues'
        }
        for(i in issueLinks) {
            desc += issueLinks[i];

            if(i+1 !== issueLinks.length) {
                desc += '\n\n';
            }
        }

        var embed = new discord.RichEmbed()
        .attachFile(new discord.Attachment(icons['opti_gh.png'], "gh.png"))
        .setColor(cfg.vs.embed.default)
        .setAuthor('OptiFine Issue Tracker', 'attachment://gh.png')
        .setDescription(desc)
        .setFooter(issueLinks.length+footer);

        typer(m, false);
        m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
    }
}

function checkMuted(callback) {
    log('Checking muted users', 'debug')
    db.muted.find({}, (err, res) => {
        if(err) {
            log(err, 'error');
        } else
        if(res.length !== 0) {
            var i = -1;
            var unmuted = 0;
            (function unmuteLoop() {
                i++
                if(i === res.length) {
                    if(unmuted === 1) {
                        log('All muted users checked. '+unmuted+' user has been unmuted and removed from database.');
                    } else 
                    if(unmuted > 1) {
                        log('All muted users checked. '+unmuted+' users have been unmuted and removed from database.');
                    } else {
                        log('All muted users checked.');
                    }

                    if(callback) {
                        callback();
                    }
                } else {
                    bot.setTimeout(() => {
                        if(res[i].time < new Date()) {
                            bot.guilds.get(cfg.basic.of_server).fetchMember(res[i].member_id).then(mem => {
                                if(mem.roles.has(cfg.roles.muted)) {
                                    mem.removeRole(cfg.roles.muted, 'Mute time limit expired.').then(() => {
                                        db.muted.remove({member_id: mem.user.id});
                                        unmuted++;
                                        unmuteLoop();
                                    }).catch(err => {
                                        log(err, 'error');
                                        unmuteLoop();
                                    });
                                } else { unmuteLoop() }
                            }).catch(err => {
                                log(err, 'error');
                                unmuteLoop();
                            });
                        } else { unmuteLoop() }
                    }, 500);
                }
            })()
            // loop through all entries, check dates, then compare with current date. if current date is greater than entry date, unmute and remove user from db.
            // important: loop must go through EVERY entry regardless of finding a successful match.
            // might need a delay between each loop to avoid ratelimiting, especially if several users are muted around the same time for the same period.
        } else {
            log('No muted users in database.', 'debug');

            if(callback) {
                callback();
            }
        }
    });
}

function updateDocs(m, callback) {
    gh_docsUpdating = true;
    gh_docsUpdateTimeout = true;
    bot.setTimeout(() => {
        gh_docsUpdateTimeout = false;
    }, 3600000);

    request({url:'https://api.github.com/repos/sp614x/optifine/contents/OptiFineDoc/doc?ref=master&access_token='+cfg.keys.github, headers: {'User-Agent': 'optibot'}}, (err, res, body) => {
        if(err) {
            errorHandler(m, err);
        } else
        if(!res || !body){
            errorHandler(m, new Error('Failed to get a response from the GitHub API. (stage1)'));
        } else {
            log('stage1 no errors', 'debug');
            var result = JSON.parse(body);

            if(result.message) {
                log(result.message, 'error');
                errorHandler(m, new Error('GitHub API rate limit exceeded.'));
                return;
            }

            gh_docs = result;

            s2();
        }
    });

    function s2() {
        request({url: 'https://api.github.com/repos/sp614x/optifine/contents/OptiFineDoc/doc/images?ref=master&access_token='+cfg.keys.github, headers: {'User-Agent': 'optibot'}}, (err, res, body) => {
            if(err) {
                errorHandler(m, err);
            } else
            if(!res || !body){
                errorHandler(m, new Error('Failed to get a response from the GitHub API. (stage2)'));
            } else {
                log('stage2 no errors', 'debug');
                var result = JSON.parse(body);

                if(result.message) {
                    log(result.message, 'error');
                    errorHandler(m, new Error('GitHub API rate limit exceeded.'));
                    return;
                }

                for(var i = 0; i < result.length; i++) {
                    log('stage2 loop'+i, 'debug');

                    gh_docs.push(result[i]);

                    if(i+1 === result.length) {
                        finalize();
                    }
                }
            }
        });
    }

    function finalize() {
        gh_docsUpdating = false;

        try {
            gh_docs_finish.emit('done');
        }

        catch (err) {
            errorHandler(m, err);
        }
        

        if(callback) callback();
    }
}

function unknownCmd(m) {
    // this is it's own separate function to keep the !exec command hidden from other users
    var embed = new discord.RichEmbed()
        .setColor(cfg.vs.embed.default)
        .attachFile(new discord.Attachment(icons['opti_info.png'], "thumbnail.png"))
        .setAuthor('Unknown command. Type !help for a list of commands.', 'attachment://thumbnail.png')
    
    typer(m, false);
    m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
}

function errorMsg(m, message) {
    var embed = new discord.RichEmbed()
    .setColor(cfg.vs.embed.error)
    .attachFile(new discord.Attachment(icons['opti_err.png'], "thumbnail.png"))
    .setAuthor(message, 'attachment://thumbnail.png')

    typer(m, false);
    m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
}

function loadImages(callback) {
    function s2() {
        log('loadImages stage2', 'debug')
        fs.readdir('./images', (err, files) => {
            if(err) {
                log('Failed to load images directory', 'fatal');
                log(err, 'fatal');
                shutdownHandler(2);
            } else {
                var i = 0;
                (function loadNext() {
                    if(callback && i === files.length) {
                        callback();
                    } else {
                        fs.readFile('./images/'+files[i], (err, data) => {
                            if (err) {
                                if(err.code !== 'EISDIR') {
                                    log('Failed to load icon: '+err.stack, 'error');
                                };
        
                                i++;
                                loadNext();
                            } else {
                                if(!files[i].startsWith('.')) {
                                    log('adding '+files[i], 'debug');
                                    images[[files[i]]] = data;
                                } else {
                                    log('ignoring '+files[i], 'debug');
                                }
        
                                i++;
                                loadNext();
                            }
                        });
                    }
                })();
            }
        });
    }

    fs.readdir('./icons', (err, files) => {
        if(err) {
            log('Failed to load icons directory', 'fatal');
            log(err, 'fatal');
            shutdownHandler(2);
        } else {
            var i = 0;
            (function loadNext() {
                if(i === files.length) {
                    s2();
                } else {
                    fs.readFile('./icons/'+files[i], (err, data) => {
                        if (err) {
                            if(err.code !== 'EISDIR') {
                                log('Failed to load icon: '+err.stack, 'error');
                            };
    
                            i++;
                            loadNext();
                        } else {
                            if(!files[i].startsWith('.')) {
                                log('adding '+files[i], 'debug');
                                icons[[files[i]]] = data;
                            } else {
                                log('ignoring '+files[i], 'debug');
                            }
    
                            i++;
                            loadNext();
                        }
                    });
                }
            })();
        }
    });

    /*
    fs.readdirSync('./icons/').forEach(function(file) {
        fs.readFile('./icons/'+file, (err, data) => {
            if (err) {
                if(err.code !== 'EISDIR') {
                    log('Failed to load icon: '+err.stack, 'error');
                };
            } else { 
                icons[[file]] = data;
            }
        });
    });

    fs.readdirSync('./images/').forEach(function(file) {
        fs.readFile('./images/'+file, (err, data) => {
            if (err) {
                if(err.code !== 'EISDIR') {
                    log('Failed to load image: '+err.stack, 'error');
                }
            } else {
                images[[file]] = data;
            }
        });
    });*/
}

function deletable(m, msg) {
    if(m.channel.type === 'dm') return;

    msg.react('❌').catch(err => log('Failed to react to message: '+err.stack, 'error'));

    var now = new Date().getTime();

    var cacheData = {
        time: now,
        guild: msg.guild.id,
        channel: msg.channel.id,
        message: msg.id,
        user: m.author.id
    };
    updateCache('add', cacheData);
    deletionCollector(msg, m.author.id, cacheData);
}

function deletionCollector(m, userid, cacheData) {
    var filter = (reaction, user) => reaction.emoji.name === '❌' && user.id === userid;
    var collector = m.createReactionCollector(filter);

    const cb_collect = (r) => {
        if(!shutdown) {
            m.delete();
            log('Message (id# '+cacheData.message+') deleted at user request.', 'warn');

            updateCache('remove', cacheData);

            bot.setTimeout(function () {
                collector.stop();
            }, 500)
        }
    }

    const cb_limit = (cacheData_remove) => {
        if(cacheData.message === cacheData_remove.message) {
            collector.stop('limit');
        }
    }

    const cb_end = (c, r) => {
        try {
            limitRemove.removeListener('limit', cb_limit);
            collector.removeListener('collect', cb_collect).removeListener('end', cb_end);
        }
        catch (err) {
            log(err.stack, 'error')
        }
        
        if(!m.deleted && !shutdown) {
            if(m.reactions.get('❌') && m.reactions.get('❌').me) {
                m.reactions.get('❌').remove().then(() => {
                    if(r !== 'limit') {
                        updateCache('remove', cacheData);
                    }
    
                    log('Time expired for message deletion.', 'debug');
                });
            }
        }
    }

    collector.on('collect', cb_collect);

    try {
        limitRemove.on('limit', cb_limit);
    }
    catch (err) {
        log(err.stack, 'error')
    }

    collector.on('end', cb_end);
}

function updateCache(op, cacheData) {
    if(op === 'add') {
        log('adding to cache', 'debug');
        db.msg.insert(cacheData, (err) => {
            if(err) {
                log(err, 'error')
            } else {
                db.msg.find({}).sort({time: 1}).exec((err, docs) => {
                    if(err) {
                        log(err, 'error');
                    } else {
                        var docs_fixed = docs[0];
                        //log(docs_fixed);
                        if(docs.length > cfg.db.size) {
                            //log(JSON.stringify(docs[0]));
                            try {
                                limitRemove.emit('limit', docs[0]);
                            }
                            catch (err) {
                                log(err.stack, 'error')
                            }
                            db.msg.remove(docs_fixed);
                            log('reached cache limit, removing first element from cache.', 'debug');
                        }
                    }
                });
            }
        });
    } else
    if(op === 'remove') {
        log('removing from cache', 'debug');
        //log('removing: '+cache.indexOf(cacheData), 'debug');
        //log('result: '+JSON.stringify(cache.splice(cache.indexOf(cacheData))), 'debug');

        //cache = cache.filter(e => e !== cacheData);
        db.msg.remove(cacheData, (err) => {
            if(err) {
                log(err,'error');
            }
        })
    }
}

function errorHandler(m, err, errorOnly) {
    var embed = new discord.RichEmbed()
        .attachFile(new discord.Attachment(icons['opti_err.png'], "err.png"))
        .setAuthor('Error', 'attachment://err.png')
        .setColor(cfg.vs.embed.error);


    if(err){
        log(err.stack, 'error');
        if(errorOnly) {
            embed.setDescription(err);
        } else {
            embed.setFooter(err)
            .setDescription('Something went wrong while doing that. Oops. \n\nIf this continues, try contacting <@181214529340833792>, and give him this error message:');
        }
    } else {
        embed.setDescription('Something went wrong while doing that. If this continues, try contacting <@181214529340833792>.');
    }

    if(m) {
        typer(m, false);
        m.channel.send({embed: embed})
    }
}

function typer(m, state) {
    if(cfg.vs.processIndicator) {
        if(state){
            log('started typing', 'debug');
            m.channel.startTyping();
        } else {
            log('stopped typing', 'debug');
            m.channel.stopTyping();
            setTimeout(() => {
                m.channel.stopTyping();
            }, 2000)
        }
    }
}

function shutdownHandler(code) {
    bot.destroy();
    process.title = 'OptiBot ' + pkg.version;
    setTimeout(function(){
        process.exit(code);
    },1000)
}

function activityHandler(type) {
    if(type === 'ready' || type === 'cooldownEnd') {
        if(debugMode) {
            let status = 'dnd';
            let gamePrefix = 'PLAYING';
            let game = 'with code';

            bot.user.setStatus(status);
            bot.user.setActivity(game, {type: gamePrefix});
            activity = status;
            activityLabel = [game, gamePrefix];
        } else {
            let status = 'online';
            let gamePrefix = 'WATCHING';
            let game = 'for !dr';

            bot.user.setStatus(status);
            bot.user.setActivity(game, {type: gamePrefix});
            activity = status;
            activityLabel = [game, gamePrefix];
        }
    } else
    if(type === 'cooldownStart') {
        let status = 'idle';

        bot.user.setStatus(status);
        bot.user.setActivity(null);
        activity = status;
        activityLabel = [];
    } else
    if(type === 'shutdown') {
        let status = 'dnd';

        bot.user.setStatus(status);
        bot.user.setActivity(null);
        activity = status;
        activityLabel = [];
    } else
    if(type === 'booting') {
        let status = 'dnd';
        let gamePrefix = 'STREAMING'
        let game = 'assets';

        bot.user.setStatus(status);
        bot.user.setActivity(game, {url: 'https://www.twitch.tv/optifinebot', type: gamePrefix});
        activity = status;
        activityLabel = [game, gamePrefix];
    }
}

function autoresponse(m) {
    var embed = new discord.RichEmbed()
    .setColor(cfg.vs.embed.default)
    .attachFile(new discord.Attachment(icons['opti_fine.png'], "thumbnail.png"))
    .setAuthor("OptiFine 1.14", 'attachment://thumbnail.png')
    .setDescription("It sounds like you're asking about the next version of OptiFine. Please refer to the <#531622838881484800> and <#531622141393764352> for this information. In addition, you can [check for progress updates through this Reddit post.](https://www.reddit.com/r/Optifine/comments/bh7o49/optifine_114_progress/)")

    typer(m, false);
    m.channel.send({embed: embed}).then(msg => { deletable(m, msg) });
}

function cooldownHandler(m, isAdmin) {
    if(isAdmin) return;
    if(CD_active) return;

    CD_threshold++;
    log('CD: command issued', 'debug');
    log('CD_threshold === '+CD_threshold, 'debug');

    if(CD_timer && CD_threshold > cfg.cd.ol_threshold) {
        activityHandler('cooldownStart');
        log('COOLDOWN MODE ACTIVATED', 'warn');
        CD_threshold = 0;
        CD_timer = false;
        log('CD_timer === '+CD_timer, 'debug');
        CD_active = true;

        var timeout = new Number(cfg.cd.timer_min * CD_mult);

        bot.setTimeout(() => {
            var embed = new discord.RichEmbed()
            .setColor(cfg.vs.embed.default)
            .attachFile(new discord.Attachment(icons['opti_timer.png'], 'timeout.png'))
            .setAuthor("OptiBot is in cooldown mode!", 'attachment://timeout.png')
            .setDescription("Please wait "+timeout+" seconds.") 

            typer(m, false);
            m.channel.send("_ _", {embed: embed}).then(msg => {
                var CD_interval = 0;
                var countdown = bot.setInterval(() => {
                    timeout--;

                    if(timeout <= 0) {
                        CD_active = false;

                        log('COOLDOWN MODE DEACTIVATED');
                        activityHandler('cooldownEnd');
                        
                        msg.delete();
                        bot.clearInterval(countdown);

                        var newMult = CD_mult + cfg.cd.post_timer_mult;
                        if(CD_mult === 1) {
                            CD_mult = newMult-1;
                        } else {
                            (newMult > cfg.cd.timer_max) ? (CD_mult = cfg.cd.timer_max) : (CD_mult = newMult);
                        }

                        var extendTimer = bot.setInterval(() => {
                            if(CD_mult === 1 || CD_active) {
                                bot.clearInterval(extendTimer);
                            } else {
                                CD_mult--;
                            }
                        }, cfg.cd.post_timer * 1000);
                    } else 
                    if (cfg.cd.show_countdown){
                        CD_interval++;
                        if(CD_interval === cfg.cd.countdown_interval) {
                            CD_interval = 0;
                            
                            embed.description = "Please wait "+timeout+" seconds.";
                            msg.edit("_ _", {embed: embed});
                        }
                    }
                }, 1000);
            });
        }, 300);
    } else {
        CD_timer = true;
        log('CD_timer === '+CD_timer, 'debug');
        bot.setTimeout(() => {
            if(!CD_active) {
                CD_timer = false;
                log('CD_timer === '+CD_timer, 'debug');
            }
        }, cfg.cd.ol_timer*1000);
    }
}
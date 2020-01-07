/**
 * OptiBot NX - Main Program
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Written by Kyle Edwards <wingedasterisk@gmail.com>, January 2020
 */

if(!process.send) throw new Error(`Cannot run standalone. Please use the "init.bat" file.`);


const util = require(`util`);
const fs = require(`fs`);
const callerId = require('caller-id');
const wink = require('jaro-winkler');
const djs = require(`discord.js`);
const OptiBot = require(`./core/optibot.js`);

const log = (message, level, lineNum) => {
    let cid = callerId.getData();
    let path = (cid.evalFlag) ? 'eval()' : cid.filePath;
    let filename = path.substring(path.lastIndexOf('\\')+1);
    let line = cid.lineNumber;

    process.send({
        type: 'log',
        message: message,
        level: level,
        misc: filename+`:`+((lineNum) ? lineNum : line) 
    });
}

const bot = new OptiBot({}, {debug: Boolean(process.argv[2])}, log);

bot.login(bot.keys.discord).catch(err => {
    log(err, 'fatal');
});

bot.on('ready', () => {
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

        log(`╭${'─'.repeat(width)}╮`, `info`); 
        log(centerText(`  `, width), `info`);
        log(centerText(`OptiBot ${bot.memory.version}`, width), `info`);
        log(centerText(`(c) Kyle Edwards <wingedasterisk@gmail.com>, 2020`, width), `info`);
        log(centerText(`  `, width), `info`);
        log(centerText(`Finished initialization in ${process.uptime().toFixed(3)} seconds.`, width), `info`);
        log(centerText(`Assets loaded in ${time / 1000} seconds.`, width), `info`);
        log(centerText(`  `, width), `info`);
        log(`╰${'─'.repeat(width)}╯`, `info`);

        process.title = `OptiBot ${bot.memory.version}`;
    }).catch(err => {
        log(err.stack, 'fatal');
        bot.exit(1);
    });
});

bot.on('message', (m) => {
    if (m.author.bot || m.author.system) return;

    let fl = m.content.trim().split("\n", 1)[0]; // first line of the message
    let input = {
        valid: fl.match(new RegExp(`^\\${bot.trigger}(?![^a-zA-Z0-9])[a-zA-Z0-9]+(?=\\s|$)`)), // checks if the input starts with the trigger, immediately followed by valid characters.
        cmd: fl.toLowerCase().split(" ")[0].substr(1),
        args: fl.split(" ").slice(1).filter(function (e) { return e.length != 0 })
    }

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

                    m.channel.send({embed: embed});
                }

                let checkMisuse = (msg) => {
                    let embed = new djs.RichEmbed()
                    .setAuthor(msg, bot.icons.find('ICO_error'))
                    .setColor(bot.cfg.embed.error)

                    if(cmd.metadata.tags['DELETE_ON_MISUSE']) embed.setDescription('This message will self-destruct in 10 seconds.');

                    m.channel.send({embed: embed}).then(msg => {
                        if(cmd.metadata.tags['DELETE_ON_MISUSE']) msg.delete(10000);
                        
                    });
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
                if(cmd.metadata.tags['BOT_CHANNEL_ONLY'] && m.channel.type !== 'dm' && m.channel.id !== '626843115650547743' && (authlvl === 0 || cmd.metadata.tags['STRICT'])) {
                    checkMisuse('This command can only be used in DMs OR the #optibot channel.');
                } else
                if(cmd.metadata.tags['MOD_CHANNEL_ONLY'] && m.channel.type !== 'dm' && m.channel.parentID !== '626864678198575114' && (authlvl < 4 || cmd.metadata.tags['STRICT'])) {
                    checkMisuse('This command can only be used in moderator-only channels.');
                } else {
                    if(!cmd.metadata.tags['INSTANT']) m.channel.startTyping();
                    cmd.exec(m, input.args, {member, authlvl, input, cmd});
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
        }

        if (m.isMentioned(bot.user)) {
            m.react(bot.guilds.get(bot.cfg.guilds.optifine).emojis.get('663409134644887572'));
        }
    }
});
/**
 * OptiBot NX - Main Program
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Written by Kyle Edwards <wingedasterisk@gmail.com>, December 2019
 */

if(!process.send) {
    throw new Error(`Cannot run standalone. Please use the "init.bat" file.`);
}


const util = require(`util`);
const fs = require(`fs`);
const callerId = require('caller-id');
const OptiBot = require(`./core/optibot.js`);

const bot = new OptiBot();

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

bot.login(bot.keys.discord).then(() => {
    process.title = `Loading...`;
    log('Successfully connected to Discord API.', 'info');
});

bot.on('ready', () => {
    let commands = fs.readdirSync(`./cmd`);

    commands.forEach((cmd) => {
        bot.commands.register(new (require(`./cmd/${cmd}`))(bot)).then((reg) => {
            log(`Command registered: ${reg.metadata.name}`, `debug`);
        }).catch(err => {
            log(err);
        });
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
        bot.guilds.get(bot.cfg.guilds.optifine).fetchMember(m.author.id).then(member => {
            let isMod = member.permissions.has("KICK_MEMBERS", true) || member.roles.has(cfg.roles.jrmod);

            if(!isMod) return;

            bot.commands.find(input.cmd).then(cmd => {
                cmd.exec(m, input.args, {member});
            }).catch(err => {
                if(err) {
                    log(util.inspect(err));
                } else {
                    m.reply('Command not found.');
                }
            })
        }).catch(err => {
            if (err.code === 10007) {
                m.reply('Sorry, you must be a member of the OptiFine Discord server to use this bot.');
            } else {
                throw (err);
            }
        });
    }
});
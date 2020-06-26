const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const timeago = require("timeago.js");
const { Command } = require(`../core/OptiBot.js`);

const setup = (bot) => { 
    return new Command(bot, {
        name: path.parse(__filename).name,
        aliases: ['targetuser', 'targettest'],
        short_desc: `Test OptiBot's targeting utility.`,
        long_desc: `Gives the raw output of OptiBot's targeting utility.`,
        args: [
            `0 <discord member>`,
            `1 <discord message>`
        ],
        authlvl: 1,
        flags: ['DM_OPTIONAL', 'NO_TYPER'],
        run: func
    });
}

const func = (m, args, data) => {
    const bot = data.bot;
    const log = data.log;

    if(!args[1]) {
        data.cmd.noArgs(m);
    } else 
    if(!Number.isInteger(parseInt(args[0]))) {
        data.cmd.noArgs(m);
    } else {
        bot.util.target(m, args[1], bot, {type: parseInt(args[0]), member: data.member}).then((result) => {
            let text = util.inspect(result);

            if (text.length > 1950) {
                m.channel.send(new djs.MessageAttachment(Buffer.from(util.inspect(result)), 'target.txt')).then(bm => bot.util.responder(m.author.id, bm, bot))
            } else {
                m.channel.send(`\`\`\`javascript\n${util.inspect(result)}\`\`\``).then(bm => bot.util.responder(m.author.id, bm, bot))
            }

            
        }).catch(err => bot.util.err(err, bot, {m:m}));
    }
}

module.exports = setup;
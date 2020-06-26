const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const timeago = require("timeago.js");
const { Command } = require(`../core/OptiBot.js`);

const setup = (bot) => { 
    return new Command(bot, {
        name: path.parse(__filename).name,
        aliases: ['timetest'],
        short_desc: `Test OptiBot's time parser utility.`,
        long_desc: `Gives the raw output of OptiBot's time parser utility.`,
        args: `<time>`,
        authlvl: 1,
        flags: ['DM_OPTIONAL', 'NO_TYPER'],
        run: func
    });
}

const func = (m, args, data) => {
    const bot = data.bot;
    const log = data.log;

    if(!args[0]) {
        data.cmd.noArgs(m);
    } else {
        let time = bot.util.time(args[0]);
        m.channel.send(`\`\`\`javascript\n${util.inspect(time)}\`\`\``).then(bm => bot.util.responder(m.author.id, bm, bot))
    }
}

module.exports = setup;
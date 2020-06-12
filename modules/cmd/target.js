const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const timeago = require("timeago.js");
const Command = require(path.resolve(`./modules/core/command.js`));

const setup = (bot) => { 
    return new Command(bot, {
        name: path.parse(__filename).name,
        aliases: ['targetuser'],
        args: `<type> <discord member | discord message>`,
        authlvl: 5,
        flags: ['DM_OPTIONAL', 'NO_TYPER'],
        run: func
    });
}

const func = (m, args, data) => {
    const bot = data.bot;
    const log = data.log;

    if(!args[1]) {
        data.cmd.noArgs(m);
    } else {
        bot.util.target(m, args[1], bot, {type: parseInt(args[0]), member: data.member}).then((result) => {
            m.channel.stopTyping(true);
            m.channel.send(`\`\`\`javascript\n${util.inspect(result)}\`\`\``)
        }).catch(err => bot.util.err(err, bot, {m:m}));
    }
}

module.exports = setup;
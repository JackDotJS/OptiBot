const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const timeago = require("timeago.js");
const { Command } = require(`../core/OptiBot.js`);

const setup = (bot) => { 
    return new Command(bot, {
        name: path.parse(__filename).name,
        aliases: ['authlevel'],
        short_desc: `Test OptiBot member auth levels.`,
        long_desc: `Gives the auth level of a given member, as well as listing your own to compare.`,
        args: `<discord member>`,
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
        bot.util.target(m, args[0], bot, {type: 0, member: data.member}).then(result => {
            if (!result) {
                bot.util.err('You must specify a valid user.', bot, {m:m})
            } else 
            if (result.type === 'notfound') {
                bot.util.err('Unable to find a user.', bot, {m:m})
            } else {
                let targetAuth = bot.getAuthlvl(result.target);

                m.channel.send(`\`\`\`Your Authlvl: ${data.authlvl}\nTarget Authlvl: ${targetAuth}\`\`\``).then(bm => bot.util.responder(m.author.id, bm, bot))
            }
        }).catch(err => bot.util.err(err, bot, {m:m}));
    }
}

module.exports = setup;
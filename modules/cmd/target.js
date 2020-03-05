const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const timeago = require("timeago.js");
const Command = require(path.resolve(`./modules/core/command.js`));
const erm = require(path.resolve(`./modules/util/simpleError.js`));
const targetUser = require(path.resolve(`./modules/util/targetUser.js`));
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    aliases: ['targetuser'],
    usage: `<discord user>`,
    authlevel: 4,
    tags: ['DM_OPTIONAL', 'INSTANT'],

    run: (m, args, data) => {
        if(!args[0]) {
            data.cmd.noArgs(m);
        } else {
            targetUser(m, args[0], bot, data).then((result) => {
                m.channel.stopTyping(true);
                m.channel.send(`\`\`\`javascript\n${util.inspect(result)}\`\`\``)
            }).catch(err => erm(err, bot, {m:m}));
        }
    }
})}
const path = require(`path`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    aliases: ['owo'],
    short_desc: `UwU`,
    long_desc: `UwU OwO UwU`,
    args: `<text | discord message>`,
    authlvl: 1,
    flags: ['DM_OPTIONAL', 'NO_TYPER'],

    run: (m, args, data) => {
        if (!args[0]) {
            data.cmd.noArgs(m);
        } else {
            function translate(message) {
                m.channel.send(bot.util.uwu(message)).then(bm => bot.util.responder(m.author.id, bm, bot));
            }

            bot.util.target(m, args[0], bot, {type: 1, member: data.member}).then(result => {
                if(result && result.type === 'message') {
                    translate(result.target.cleanContent);
                } else {
                    translate(m.cleanContent.substring(`${bot.prefix}${data.input.cmd} `.length));
                }
            }).catch(err => {
                bot.util.err(err, bot, {m:m});
            });
        }
    }
})}
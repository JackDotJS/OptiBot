const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const { Command } = require(`../core/OptiBot.js`);

const setup = (bot) => { 
    return new Command(bot, {
        name: path.parse(__filename).name,
        short_desc: `Short description. Shows in \`${bot.prefix}list\``,
        long_desc: `Long description. Shows in \`${bot.prefix}help\` and tooltips in \`${bot.prefix}list\``,
        args: `<discord message>`,
        authlvl: 2,
        flags: ['DM_OPTIONAL'],
        run: func
    });
}

const func = (m, args, data) => {
    const bot = data.bot;
    const log = data.log;

    if(!args[0]) {
        data.cmd.noArgs(m);
    } else {
        bot.util.target(m, args[0], bot, {type: 1, member: data.member}).then(result => {
            if(result && result.type === 'message') {
                if(!result.target.pinned) {
                    bot.util.err('That message is not pinned.', bot, {m:m})
                } else {
                    result.target.unpin().then(() => {
                        result.target.pin().then(() => {
                            let embed = new djs.MessageEmbed()
                            .setAuthor(`Pinned message successfully moved.`, bot.icons.find('ICO_okay'))
                            .setColor(bot.cfg.embed.okay);
    
                            m.channel.send({embed: embed}).then(msg => { bot.util.responder(m.author.id, msg, bot) });
                        }).catch(err => {
                            bot.util.err(err, bot, {m:m});
                        });
                    }).catch(err => {
                        bot.util.err(err, bot, {m:m});
                    });
                }
            } else {
                bot.util.err('You must specify a valid message.', bot, {m:m})
            }
        }).catch(err => {
            bot.util.err(err, bot, {m:m});
        });
    }
}

module.exports = setup;
const path = require(`path`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));

const setup = (bot) => { 
    return new Command(bot, {
        name: path.parse(__filename).name,
        short_desc: `Ban a given user.`,
        long_desc: `Bans a given user... and that's it. This command only really exists to allow moderators to ban users outside of the server. **Note that this will NOT delete any existing messages for the sake of preserving history.**`,
        args: `<discord member> <reason>`,
        authlvl: 3,
        flags: ['NO_DM'],
        run: func
    });
}

const func = (m, args, data) => {
    const bot = data.bot;
    const log = data.log;

    if(!args[1]) {
        data.cmd.noArgs(m);
    } else {
        let reason = m.content.substring( `${bot.prefix}${path.parse(__filename).name} ${args[0]} `.length);

        bot.util.target(m, args[0], bot, {type: 0, member: data.member}).then((result) => {
            if(result && !['user', 'member', 'id'].includes(result.type)) {
                bot.util.err(`You must specify a valid user.`, bot, {m:m});
            } else {
                let id = null;
                let username = null;

                if (result.type === 'user') {
                    id = result.target.id;
                    username = result.target.tag;
                } else
                if (result.type === 'member') {
                    id = result.target.user.id;
                    username = result.target.user.tag;
                } else {
                    id = result.target;
                    username = `<${result.target}>`
                }

                bot.mainGuild.fetchBan(id).then(() => {
                    bot.util.err(`${username} has already been banned.`, bot, {m:m});
                }).catch(err => {
                    if(err.stack.match(/unknown ban/i)) {
                        let embed = new djs.MessageEmbed()
                        .setAuthor('Are you sure?', bot.icons.find('ICO_warn'))
                        .setColor(bot.cfg.embed.default)
                        .setDescription(`The following user will be banned from the server: \n> ${username} (${id})`)
                        .addField(`Reason`, reason);

                        m.channel.stopTyping(true);
                        m.channel.send('_ _', {embed: embed}).then(msg => {
                            bot.util.confirm(m, msg, bot).then(res => {
                                if(res === 1) {
                                    bot.memory.rban[id] = m.author;

                                    bot.mainGuild.members.ban(result.target, { reason: reason}).then(() => {
                                        let update = new djs.MessageEmbed()
                                        .setColor(bot.cfg.embed.okay)
                                        .setAuthor(`Successfully banned user`, bot.icons.find('ICO_okay'))
                                        .setDescription(`${(result.type === 'id') ? `\`${result.target}\`` : result.target.toString()} has been banned.`)
                                        .addField(`Reason`, reason);
                    
                                        msg.edit({embed: update}).then(msg => bot.util.responder(m.author.id, msg, bot));
                                    }).catch(err => bot.util.err(err, bot, {m:m}));
                                } else
                                if(res === 0) {
                                    let update = new djs.MessageEmbed()
                                    .setAuthor('Cancelled', bot.icons.find('ICO_load'))
                                    .setColor(bot.cfg.embed.default)
                                    .setDescription('User has not been banned.')

                                    msg.edit({embed: update}).then(msg => { bot.util.responder(m.author.id, msg, bot); });
                                } else {
                                    let update = new djs.MessageEmbed()
                                    .setAuthor('Timed out', bot.icons.find('ICO_load'))
                                    .setColor(bot.cfg.embed.default)
                                    .setDescription(`Sorry, you didn't respond in time. Please try again.`)

                                    msg.edit({embed: update}).then(msg => { bot.util.responder(m.author.id, msg, bot); });
                                }
                            }).catch(err => {
                                bot.util.err(err, bot, {m:m});
                            })
                        });
                    } else {
                        bot.util.err(err, bot, {m:m});
                    }
                })
            }
        });
    }
}

module.exports = setup;

const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));

const setup = (bot) => { 
    return new Command(bot, {
        name: path.parse(__filename).name,
        short_desc: `Start a vote to ban a user. (very real command\\™️)`,
        long_desc: `Starts a vote to ban a given user. \n\n__**THIS IS A JOKE COMMAND. THIS WILL NOT ACTUALLY BAN ANYONE.**__`,
        args: `<discord user> [reason]`,
        image: 'IMG_banhammer.png',
        authlvl: 1,
        flags: ['DM_OPTIONAL', 'NO_TYPER', 'HIDDEN'],
        run: func
    });
}

const func = (m, args, data) => {
    const bot = data.bot;
    const log = data.log;

    let target = (args[0] || `*Someone(TM)*`);
    let reason = (args[1]) ? m.content.substring( `${bot.prefix}${path.parse(__filename).name} ${args[0]} `.length ) : null;

    if(!reason) {
        someReason = [
            `<no reason>`,
            `Oh, no reason...`,
            `who cares lmao`,
            `used 1996 Ford F-150 for $9k`,
            `they called optibot stinky`,
            `7`,
        ]

        reason = someReason[Math.floor(Math.random() * someReason.length)];
    }

    bot.util.target(m, target, bot, {type: 0, member: data.member}).then((result) => {
        if(result && result.type === 'user') {
            if(result.target.id === bot.user.id) {
                m.channel.send('fuck you');
            } else {
                target = result.target.toString();
            }
        }

        let embed = new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .setAuthor(`Vote Ban`, bot.icons.find('ICO_unban'))
        .setTitle(`Vote started.`)
        .setDescription(`Banning: ${target} \nWaiting for ${bot.mainGuild.memberCount.toLocaleString()} votes...`)
        .addField(`Reason`, reason)

        m.channel.send(`_ _`, {embed: embed}).then(bm => (
            bm.react(bot.guilds.cache.get(bot.cfg.guilds.optibot).emojis.cache.get(bot.cfg.emoji.confirm)).then(() => {
                bot.setTimeout(() => {
                    let total = bm.reactions.cache.get(bot.cfg.emoji.confirm);
                    embed = new djs.MessageEmbed()
                    .setColor(bot.cfg.embed.error)
                    .setAuthor(`Vote Ban`, bot.icons.find('ICO_ban'))
                    .setTitle(`Vote ended.`)
                    .addField(`Reason`, reason)

                    if(total.count) {
                        embed.setDescription([
                            `Received ${total.count}/${bot.mainGuild.memberCount.toLocaleString()} votes.`,
                            `(${+parseFloat(total.count / bot.mainGuild.memberCount).toFixed(8)}%)`,
                            ``,
                            ``,
                            `Meh, close enough.`,
                            `${target} has been banned. Probably.`
                        ].join('\n'));
                    } else {
                        embed.setDescription([
                            `Received [whatever]/${bot.mainGuild.memberCount.toLocaleString()} votes.`,
                            `(blahblahblah%)`,
                            ``,
                            ``,
                            `Meh, close enough.`,
                            `${target} has been banned. Probably.`
                        ].join('\n'));
                    }

                    bm.edit(`_ _`, {embed:embed}).then(bm2 => {
                        bm2.reactions.removeAll().then(() => {
                            bot.util.responder(m.author.id, bm2, bot);
                        })
                    })

                }, 1000 * 30);
            })
        ));
    });
}

module.exports = setup;
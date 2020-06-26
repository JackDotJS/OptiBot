const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const { Command } = require(`../core/OptiBot.js`);

const setup = (bot) => { 
    return new Command(bot, {
        name: path.parse(__filename).name,
        short_desc: `Warn a user.`,
        long_desc: `Gives a warning to a user. All warnings are saved to the users record, but otherwise do nothing.`,
        args: `<discord member> [reason]`,
        authlvl: 2,
        flags: ['NO_DM', 'STRICT', 'LITE'],
        run: func
    });
}

const func = (m, args, data) => {
    const bot = data.bot;
    const log = data.log;

    if(!args[0]) {
        data.cmd.noArgs(m);
    } else {
        bot.util.target(m, args[0], bot, {type: 0, member:data.member}).then((result) => {
            if (!result) {
                bot.util.err('You must specify a valid user.', bot, {m:m})
            } else
            if (result.type === 'notfound') {
                bot.util.err('Unable to find a user.', bot, {m:m})
            } else
            if (result.id === m.author.id) {
                bot.util.err('Nice try.', bot, {m:m})
            } else
            if (result.id === bot.user.id) {
                bot.util.err(':(', bot, {m:m})
            } else 
            if (bot.getAuthlvl(result.target) > data.authlvl) {
                bot.util.err(`That user is too powerful to be warned.`, bot, {m:m})
            } else {
                bot.getProfile(result.id, true).then(profile => {
                    if(!profile.data.essential.record) profile.data.essential.record = [];
                    let reason = m.content.substring( `${bot.prefix}${path.parse(__filename).name} ${args[0]} `.length )

                    let entry = new bot.util.RecordEntry()
                    .setMod(m.author.id)
                    .setURL(m.url)
                    .setAction('warn')
                    .setActionType('add')
                    .setReason((args[1]) ? reason : `No reason provided.`)

                    profile.data.essential.record.push(entry.data);

                    bot.updateProfile(result.id, profile).then(() => {
                        let logEntry = new bot.util.LogEntry(bot, {channel: "moderation"})
                        .setColor(bot.cfg.embed.default)
                        .setIcon(bot.icons.find('ICO_warn'))
                        .setTitle(`Member Warned`, `Member Warning Report`)
                        .addSection(`Member`, result.target)
                        .addSection(`Moderator Responsible`, m.author)
                        .addSection(`Command Location`, m)

                        if(result.type !== 'id') {
                            logEntry.setThumbnail(((result.type === "user") ? result.target : result.target.user).displayAvatarURL({format:'png'}))
                        }

                        let embed = new djs.MessageEmbed()
                        .setAuthor(`User warned`, bot.icons.find('ICO_warn'))
                        .setColor(bot.cfg.embed.default)
                        .setDescription(`${result.mention} has been warned.`)

                        if(args[1]) {
                            embed.addField('Reason', reason)
                            logEntry.setHeader(`Reason: ${reason}`)
                        } else {
                            embed.addField(`Reason`, `No reason provided. \n(Please use the \`${bot.prefix}addnote\` command.)`)
                            logEntry.setHeader(`No reason provided.`)
                        }
                        
                        m.channel.send({embed: embed}).then(bm => bot.util.responder(m.author.id, bm, bot));
                        logEntry.submit();
                    }).catch(err => bot.util.err(err, bot, {m:m}));
                }).catch(err => bot.util.err(err, bot, {m:m}));
            }
        }).catch(err => bot.util.err(err, bot, {m:m}));
    }
}

module.exports = setup;
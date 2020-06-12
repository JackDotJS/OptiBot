const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    aliases: ['addrecord', 'addrecords'],
    short_desc: `Add a note to someone's record.`,
    long_desc: `Adds a note to someone's record. These notes can be edited with the \`${bot.prefix}editrecord\` command, and removed at any time by using the \`${bot.prefix}rmnote\` command.`,
    args: `<discord member> <text>`,
    authlvl: 2,
    flags: ['NO_DM', 'STRICT', 'NO_TYPER'],

    run: (m, args, data) => {
        if(!args[1]) {
            data.cmd.noArgs(m);
        } else {
            let now = new Date().getTime();
            bot.util.target(m, args[0], bot, {type: 0, member:data.member}).then((result) => {
                if (!result) {
                    bot.util.err('You must specify a valid user.', bot, {m:m})
                } else
                if (result.type === 'notfound') {
                    bot.util.err('Unable to find a user.', bot, {m:m})
                } else
                if (result.target.user.id === m.author.id || result.target.user.id === bot.user.id) {
                    bot.util.err('Nice try.', bot, {m:m})
                } else
                if (bot.getAuthlvl(result.target) > data.authlvl) {
                    bot.util.err(`You are not strong enough to add notes to this user.`, bot, {m:m})
                } else {
                    bot.getProfile(result.target.user.id, true).then(profile => {
                        if(!profile.data.essential.record) profile.data.essential.record = [];
                        let reason = m.content.substring( `${bot.prefix}${data.input.cmd} ${args[0]} `.length )

                        // todo: ensure message length does not exceed 750 characters.

                        let entry = new bot.util.RecordEntry()
                        .setMod(m.author.id)
                        .setURL(m.url)
                        .setAction('note')
                        .setActionType('add')
                        .setReason(reason)

                        profile.data.essential.record.push(entry.data);

                        bot.updateProfile(result.target.user.id, profile).then(() => {
                            let embed = new djs.MessageEmbed()
                            .setAuthor(`Note added.`, bot.icons.find('ICO_okay'))
                            .setColor(bot.cfg.embed.okay)
                            .setDescription(`${result.target}'s record has been updated.`)

                            if(args[1]) embed.addField('Note details', reason)

                            m.channel.send({embed: embed}).then(bm => bot.util.responder(m.author.id, bm, bot));
                        }).catch(err => bot.util.err(err, bot, {m:m}));
                    }).catch(err => bot.util.err(err, bot, {m:m}));
                }
            }).catch(err => bot.util.err(err, bot, {m:m}));
        } 
    }
})}
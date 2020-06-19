const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));

const setup = (bot) => { 
    return new Command(bot, {
        name: path.parse(__filename).name,
        aliases: ['addrecord', 'addrecords'],
        short_desc: `Add a note to someone's record.`,
        long_desc: `Adds a note to someone's record. These notes can be edited with the \`${bot.prefix}editrecord\` command, and removed at any time by using the \`${bot.prefix}rmnote\` command.`,
        args: `<discord member> <text>`,
        authlvl: 2,
        flags: ['NO_DM', 'STRICT', 'NO_TYPER'],
        run: func
    });
}

const func = (m, args, data) => {
    const bot = data.bot;
    const log = data.log;

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
            if (bot.getAuthlvl(result.target) > data.authlvl) {
                bot.util.err(`You are not strong enough to add notes to this user.`, bot, {m:m})
            } else {
                let userid = result.target; // ID only
                let username = userid;
                let mention = userid;

                if (result.type === 'user') { // partial user
                    userid = result.target.id; 
                    username = result.target.tag; 
                    mention = result.target.toString();
                } else 
                if (result.type === 'member') { // member
                    userid = result.target.user.id; 
                    username = result.target.user.tag;
                    mention = result.target.user.toString();
                }

                if (userid === m.author.id || userid === bot.user.id) {
                    bot.util.err('Nice try.', bot, {m:m});
                    return;
                }

                bot.getProfile(userid, true).then(profile => {
                    if(!profile.data.essential.record) profile.data.essential.record = [];
                    let reason = m.content.substring( `${bot.prefix}${data.input.cmd} ${args[0]} `.length )

                    if(reason.length > 750) {
                        bot.util.err(`Note cannot exceed 750 characters in length.`, bot, {m:m})
                        return;
                    }

                    let entry = new bot.util.RecordEntry()
                    .setMod(m.author.id)
                    .setURL(m.url)
                    .setAction('note')
                    .setActionType('add')
                    .setReason(reason)

                    profile.data.essential.record.push(entry.data);

                    bot.updateProfile(userid, profile).then(() => {
                        let logEntry = new bot.util.LogEntry(bot, {channel: "moderation"})
                        .setColor(bot.cfg.embed.default)
                        .setIcon(bot.icons.find('ICO_docs'))
                        .setTitle(`Member Note Created`, `Moderation Note Report`)
                        .addSection(`Member`, result.target)
                        .addSection(`Note Author`, m.author)
                        .addSection(`Note Contents`, reason)
                        .submit()

                        let embed = new djs.MessageEmbed()
                        .setAuthor(`Note added.`, bot.icons.find('ICO_okay'))
                        .setColor(bot.cfg.embed.okay)
                        .setDescription(`User record has been updated.`)
                        .addField(`Member`, `${mention} | ${username}\n\`\`\`yaml\nID: ${userid}\`\`\``)
                        .addField('Note', reason)

                        m.channel.send({embed: embed}).then(bm => bot.util.responder(m.author.id, bm, bot));
                    }).catch(err => bot.util.err(err, bot, {m:m}));
                }).catch(err => bot.util.err(err, bot, {m:m}));
            }
        }).catch(err => bot.util.err(err, bot, {m:m}));
    } 
}

module.exports = setup;
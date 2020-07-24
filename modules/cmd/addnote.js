const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    aliases: ['addrecord', 'addrecords'],
    short_desc: `Add a note to someone's record.`,
    long_desc: `Adds a note to someone's record. These notes can be edited with the \`${bot.prefix}editrecord\` command, and removed at any time by using the \`${bot.prefix}rmnote\` command.`,
    args: `<discord member> <text>`,
    authlvl: 2,
    flags: ['NO_DM', 'STRICT', 'NO_TYPER'],
    run: null
}

metadata.run = (m, args, data) => {
    if(!args[1]) {
        OBUtil.missingArgs(m, metadata);
    } else {
        let now = new Date().getTime();
        OBUtil.parseTarget(m, 0, args[0], data.member).then((result) => {
            if (!result) {
                OBUtil.err('You must specify a valid user.', {m:m})
            } else 
            if (result.type === 'notfound') {
                OBUtil.err('Unable to find a user.', {m:m})
            } else
            if (OBUtil.getAuthlvl(result.target) > data.authlvl) {
                OBUtil.err(`You are not strong enough to add notes to this user.`, {m:m})
            } else 
            if (result.id === m.author.id || result.id === bot.user.id) {
                OBUtil.err('Nice try.', {m:m});
            } else {
                let reason = m.content.substring( `${bot.prefix}${metadata.name} ${args[0]} `.length )
                if(reason.length > 1000) {
                    return OBUtil.err(`Note cannot exceed 1000 characters in length.`, {m:m});
                }

                OBUtil.getProfile(result.id, true).then(profile => {
                    if(!profile.edata.record) profile.edata.record = [];

                    let entry = new RecordEntry()
                    .setMod(m.author.id)
                    .setURL(m.url)
                    .setAction('note')
                    .setActionType('add')
                    .setReason(m.author, reason)

                    profile.edata.record.push(entry.raw);

                    OBUtil.updateProfile(profile).then(() => {
                        let logEntry = new LogEntry({channel: "moderation"})
                        .setColor(bot.cfg.embed.default)
                        .setIcon(Assets.getEmoji('ICO_docs').url)
                        .setTitle(`Moderation Note Created`, `Moderation Note Report`)
                        .addSection(`Member`, result.target)
                        .addSection(`Note Author`, m.author)
                        .addSection(`Note Contents`, reason)
                        .submit()

                        let embed = new djs.MessageEmbed()
                        .setAuthor(`Note added.`, Assets.getEmoji('ICO_okay').url)
                        .setColor(bot.cfg.embed.okay)
                        .setDescription(`User record has been updated.`)
                        .addField(`Member`, `${result.mention} | ${result.tag}\n\`\`\`yaml\nID: ${result.id}\`\`\``)
                        .addField('Note', reason)

                        m.channel.stopTyping(true);

                        m.channel.send({embed: embed})//.then(bm => OBUtil.afterSend(bm, m.author.id));
                    }).catch(err => OBUtil.err(err, {m:m}));
                }).catch(err => OBUtil.err(err, {m:m}));
            }
        }).catch(err => OBUtil.err(err, {m:m}));
    } 
}

module.exports = new Command(metadata);
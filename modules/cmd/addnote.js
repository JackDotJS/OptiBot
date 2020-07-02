const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const { Command, OBUtil, Memory, RecordEntry, LogEntry } = require(`../core/OptiBot.js`);

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
                    OBUtil.err('Nice try.', {m:m});
                    return;
                }

                OBUtil.getProfile(userid, true).then(profile => {
                    if(!profile.edata.record) profile.edata.record = [];
                    let reason = m.content.substring( `${bot.prefix}${metadata.name} ${args[0]} `.length )

                    if(reason.length > 750) {
                        OBUtil.err(`Note cannot exceed 750 characters in length.`, {m:m})
                        return;
                    }

                    let entry = new RecordEntry()
                    .setMod(m.author.id)
                    .setURL(m.url)
                    .setAction('note')
                    .setActionType('add')
                    .setReason(reason)

                    profile.edata.record.push(entry.data);

                    OBUtil.updateProfile(profile).then(() => {
                        let logEntry = new LogEntry({channel: "moderation"})
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

                        m.channel.send({embed: embed})//.then(bm => OBUtil.afterSend(bm, m.author.id));
                    }).catch(err => OBUtil.err(err, {m:m}));
                }).catch(err => OBUtil.err(err, {m:m}));
            }
        }).catch(err => OBUtil.err(err, {m:m}));
    } 
}

module.exports = new Command(metadata);
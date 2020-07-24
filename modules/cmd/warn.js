const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    short_desc: `Warn a user.`,
    long_desc: `Gives a warning to a user. All warnings are saved to the users record, but otherwise do nothing.`,
    args: `<discord member> [reason]`,
    authlvl: 2,
    flags: ['NO_DM', 'STRICT', 'LITE'],
    run: null
}

metadata.run = (m, args, data) => {
    if(!args[0]) {
        OBUtil.missingArgs(m, metadata);
    } else {
        OBUtil.parseTarget(m, 0, args[0], data.member).then((result) => {
            if (!result) {
                OBUtil.err('You must specify a valid user.', {m:m})
            } else
            if (result.type === 'notfound') {
                OBUtil.err('Unable to find a user.', {m:m})
            } else
            if (result.id === m.author.id) {
                OBUtil.err('Nice try.', {m:m})
            } else
            if (result.id === bot.user.id) {
                OBUtil.err(':(', {m:m})
            } else 
            if (OBUtil.getAuthlvl(result.target) > data.authlvl) {
                OBUtil.err(`That user is too powerful to be warned.`, {m:m})
            } else {
                OBUtil.getProfile(result.id, true).then(profile => {
                    if(!profile.edata.record) profile.edata.record = [];
                    let reason = m.content.substring( `${bot.prefix}${data.input.cmd} ${args[0]} `.length )

                    let entry = new RecordEntry()
                    .setMod(m.author.id)
                    .setURL(m.url)
                    .setAction('warn')
                    .setActionType('add')
                    .setReason(m.author, (args[1]) ? reason : `No reason provided.`)

                    profile.edata.record.push(entry.raw);

                    OBUtil.updateProfile(profile).then(() => {
                        let logEntry = new LogEntry({channel: "moderation"})
                        .setColor(bot.cfg.embed.default)
                        .setIcon(Assets.getEmoji('ICO_warn').url)
                        .setTitle(`Member Warned`, `Member Warning Report`)
                        .addSection(`Member`, result.target)
                        .addSection(`Moderator Responsible`, m.author)
                        .addSection(`Command Location`, m)

                        if(result.type !== 'id') {
                            logEntry.setThumbnail(((result.type === "user") ? result.target : result.target.user).displayAvatarURL({format:'png'}))
                        }

                        let embed = new djs.MessageEmbed()
                        .setAuthor(`User warned`, Assets.getEmoji('ICO_warn').url)
                        .setColor(bot.cfg.embed.default)
                        .setDescription(`${result.mention} has been warned.`)

                        if(args[1]) {
                            embed.addField('Reason', reason)
                            logEntry.setHeader(`Reason: ${reason}`)
                        } else {
                            embed.addField(`Reason`, `No reason provided. \n(Please use the \`${bot.prefix}editrecord\` command.)`)
                            logEntry.setHeader(`No reason provided.`)
                        }

                        m.channel.stopTyping(true);
                        
                        m.channel.send({embed: embed})//.then(bm => OBUtil.afterSend(bm, m.author.id));
                        logEntry.submit();
                    }).catch(err => OBUtil.err(err, {m:m}));
                }).catch(err => OBUtil.err(err, {m:m}));
            }
        }).catch(err => OBUtil.err(err, {m:m}));
    }
}

module.exports = new Command(metadata);
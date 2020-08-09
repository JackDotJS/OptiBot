const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    short_desc: `Pardon a record entry.`,
    long_desc: `Dismisses a given record entry. Note that this will only pardon a single record entry. If needed, any linked entries must also be pardoned separately.`,
    args: `<discord member> <case ID> <reason>`,
    authlvl: 4,
    flags: ['NO_TYPER', 'NO_DM', 'STRICT', 'STRICT_AUTH'],
    run: null
}

metadata.run = (m, args, data) => {
    if(!args[2]) {
        OBUtil.missingArgs(m, metadata);
    } else {
        let caseid = parseInt(args[1], 36);

        log(caseid);
        log(!isNaN(caseid));
        log(caseid > 1420070400000);
        log(caseid < new Date().getTime())

        if(isNaN(caseid) || caseid < 1420070400000 || caseid > new Date().getTime()) {
            return OBUtil.err('Invalid case ID.', {m:m});
        }

        OBUtil.parseTarget(m, 0, args[0], data.member).then((result) => {
            if (!result) {
                OBUtil.err('You must specify a valid user.', {m:m})
            } else
            if (result.type === 'notfound') {
                OBUtil.err('Unable to find a user.', {m:m})
            } else
            if (result.id === m.author.id || result.id === bot.user.id) {
                OBUtil.err('Nice try.', {m:m})
            } else {
                OBUtil.getProfile(result.id, false).then(profile => {
                    if(!profile || (profile && !profile.edata.record)) {
                        OBUtil.err(`${target.tag} has no record.`, {m:m});
                    } else {
                        profile.getRecord(caseid).then(entry => {
                            if(!entry) {
                                OBUtil.err('Unable to find the given case ID.', {m:m})
                                return;
                            }

                            log(util.inspect(entry))

                            let reason = m.content.substring( `${bot.prefix}${metadata.name} ${args[0]} ${args[1]} `.length );

                            switch(entry.action) {
                                case 0: 
                                    OBUtil.err(`Notes cannot be pardoned.`, {m:m});
                                    break;
                                case 3:
                                    OBUtil.err(`Kicks cannot be pardoned.`, {m:m});
                                    break;
                                case 4:
                                    OBUtil.err(`Bans cannot be pardoned.`, {m:m});
                                    break;
                            }

                            if(entry.actionType === -1) {
                                OBUtil.err(`Removal-type entries cannot be pardoned.`, {m:m});
                            }
                            

                            let embed = new djs.MessageEmbed()
                            .setAuthor('Are you sure?', Assets.getEmoji('ICO_warn').url)
                            .setColor(bot.cfg.embed.default)
                            .addField(`The following record entry will be dismissed:`, `${entry.display.icon} ${entry.display.action}\n> ${entry.reason.split('\n').join('\n> ')}`)
                            .addField(`Pardon Reason`, reason);
            
                            m.channel.send('_ _', {embed: embed}).then(msg => {
                                OBUtil.confirm(m, msg).then(res => {
                                    if(res === 1) {
                                        entry.setPardon(m, reason)

                                        profile.updateRecord(entry).then(() => {
                                            OBUtil.updateProfile(profile).then(() => {
                                                let logEntry = new LogEntry({channel: "moderation"})
                                                .setColor(bot.cfg.embed.default)
                                                .setIcon(Assets.getEmoji('ICO_unban').url)
                                                .setTitle(`Record Entry Pardoned`, `Record Entry Pardon Report`)
                                                .addSection(`Member`, result.target)
                                                .addSection(`Case`, entry)
                                                .addSection(`Administrator Responsible`, m.author)
                                                .addSection(`Command Location`, m)
                                                .addSection(`Pardon Reason`, reason)
                                                .submit().then(() => {
                                                    let update = new djs.MessageEmbed()
                                                    .setAuthor(`Success`, Assets.getEmoji('ICO_okay').url)
                                                    .setColor(bot.cfg.embed.okay)
                                                    .setDescription(`Case ID ${entry.date} has been marked as pardoned.`)
                                                    .addField('Pardon Reason', reason);
                                
                                                    msg.edit({embed: update})//.then(msg => { OBUtil.afterSend(msg, m.author.id); });
                                                });
                                            });
                                        });
                                    } else
                                    if(res === 0) {
                                        let update = new djs.MessageEmbed()
                                        .setAuthor('Cancelled', Assets.getEmoji('ICO_load').url)
                                        .setColor(bot.cfg.embed.default)
                                        .setDescription('Record entry has not been changed.')
            
                                        msg.edit({embed: update}).then(msg => { OBUtil.afterSend(msg, m.author.id); });
                                    } else {
                                        let update = new djs.MessageEmbed()
                                        .setAuthor('Timed out', Assets.getEmoji('ICO_load').url)
                                        .setColor(bot.cfg.embed.default)
                                        .setDescription(`Sorry, you didn't respond in time. Please try again.`)
            
                                        msg.edit({embed: update}).then(msg => { OBUtil.afterSend(msg, m.author.id); });
                                    }
                                }).catch(err => {
                                    OBUtil.err(err, {m:m});
                                })
                            });
                        });
                    }
                }).catch(err => OBUtil.err(err, {m:m}));
            }
        }).catch(err => OBUtil.err(err, {m:m}));
    }
}

module.exports = new Command(metadata);
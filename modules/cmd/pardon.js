const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const { Command, OBUtil, Memory } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    short_desc: `Pardon a record entry.`,
    long_desc: `Dismisses a given record entry. Note that this will only pardon a single record entry. If needed, any linked entries must also be pardoned separately.`,
    args: `<discord member> <case ID> <reason>`,
    authlvl: 4,
    flags: ['NO_TYPER'],
    run: null
}


metadata.run = (m, args, data) => {
    if(!args[2]) {
        OBUtil.missingArgs(m, metadata);
    } else 
    if(!Number.isInteger(parseInt(args[1]))) {
        OBUtil.err('Invalid case ID.', {m:m})
    } else {
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
                        profile.getRecord(parseInt(args[1])).then(entry => {
                            if(!entry) {
                                OBUtil.err('Unable to find the given case ID.', {m:m})
                                return;
                            }

                            let reason = m.content.substring( `${bot.prefix}${metadata.name} ${args[0]} ${args[1]} `.length );

                            if(entry.action === 0) {
                                OBUtil.err(`Notes cannot be pardoned.`, {m:m});
                            } else
                            if(entry.action === 3) {
                                OBUtil.err(`Kicks cannot be pardoned.`, {m:m});
                            } else
                            if(entry.action === 4) {
                                OBUtil.err(`Bans cannot be pardoned.`, {m:m});
                            } else
                            if(entry.actionType === -1) {
                                OBUtil.err(`Removals cannot be pardoned.`, {m:m});
                            }

                            let embed = new djs.MessageEmbed()
                            .setAuthor('Are you sure?', OBUtil.getEmoji('ICO_warn').url)
                            .setColor(bot.cfg.embed.default)
                            .setDescription(`The following record entry will be dismissed: \n\n${entry.display.icon} ${entry.display.action}\n> ${entry.reason.split('\n').join('\n> ')}`)
                            .addField(`Reason`, reason);
            
                            m.channel.send('_ _', {embed: embed}).then(msg => {
                                OBUtil.confirm(m, msg).then(res => {
                                    if(res === 1) {
                                        entry.pardon(m.author, reason)

                                        profile.updateRecord(entry).then(() => {
                                            OBUtil.updateProfile(profile).then(() => {
                                                let update = new djs.MessageEmbed()
                                                .setAuthor(`Success`, OBUtil.getEmoji('ICO_okay').url)
                                                .setColor(bot.cfg.embed.okay)
                                                .setDescription(`Case ID ${entry.date} has been marked as pardoned.`)
                                                .addField('Reason', reason);
                            
                                                msg.edit({embed: update})//.then(msg => { OBUtil.afterSend(msg, m.author.id); });
                                            });
                                        });
                                    } else
                                    if(res === 0) {
                                        let update = new djs.MessageEmbed()
                                        .setAuthor('Cancelled', OBUtil.getEmoji('ICO_load').url)
                                        .setColor(bot.cfg.embed.default)
                                        .setDescription('Record entry has not been changed.')
            
                                        msg.edit({embed: update}).then(msg => { OBUtil.afterSend(msg, m.author.id); });
                                    } else {
                                        let update = new djs.MessageEmbed()
                                        .setAuthor('Timed out', OBUtil.getEmoji('ICO_load').url)
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
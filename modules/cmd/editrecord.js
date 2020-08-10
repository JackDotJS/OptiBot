const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    aliases: ['editrec', 'updaterecord'],
    short_desc: `Edit an existing record entry.`,
    long_desc: [
        `Edits an existing record entry. With the exception of Administrators, records can only be modified by the same moderator who's responsible for its creation.`,
        ``,
        `Valid properties include:`,
        `**\`reason\`** - The reason for this action.`,
        `**\`details\`** - The details of the case.`,
        `**\`parent\`** - The parent case ID.`,
        `**\`pardon\`** - (Administrators only) The reason for pardoning this action.`,
    ].join('\n'),
    args: `<discord member> <case ID> <property> [new value]`,
    authlvl: 2,
    flags: ['NO_DM', 'STRICT', 'NO_TYPER'],
    run: null
}

metadata.run = (m, args, data) => {
    if(!args[2]) {
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
                OBUtil.err(`You are not strong enough to modify this user's record.`, {m:m})
            } else 
            if (result.id === m.author.id || result.id === bot.user.id) {
                OBUtil.err('Nice try.', {m:m});
            } else 
            if(!['reason','details','parent','pardon'].includes(args[2].toLowerCase())) {
                OBUtil.err(`Invalid property: \`${args[2]}\``, {m:m});
            } else {
                let value = m.content.substring( `${bot.prefix}${metadata.name} ${args[0]} ${args[1]} ${args[2]} `.length ).trim();

                if(value.length > 1000) {
                    OBUtil.err(`New value cannot exceed 1000 characters in length.`, {m:m})
                    return;
                }

                OBUtil.getProfile(result.id, false).then(profile => {
                    if(!profile.edata.record) {
                        return OBUtil.err(`This user does not have a record that can be modified.`, {m:m})
                    }

                    profile.getRecord(args[1]).then(entry => {
                        if(!entry) {
                            return OBUtil.err(`Unable to find case ID "${args[1]}".`, {m:m});
                        }
                        if(entry.moderator.id !== m.author.id && ob.OBUtil.getAuthlvl(member, true) !== 4) {
                            return OBUtil.err(`You do not have permission to modify this entry.`, {m:m});
                        }

                        log(util.inspect(entry))
                        log(typeof entry.date);

                        let property = args[2].toLowerCase();
                        let propertyName = null;
                        let oldValue = null;
                        let newValue = value;

                        if(value.length === 0) newValue = null;

                        switch(property) {
                            case 'reason': 
                                if(entry.action === 0) return OBUtil.err(`Cannot change "reason" property of notes.`, {m:m});
                                propertyName = 'Reason';
                                oldValue = entry.reason;

                                if(!newValue) {
                                    newValue = 'No reason provided.';
                                } else {
                                    newValue = value;
                                }
                                break;
                            case 'details':
                                if(entry.action === 0) {
                                    propertyName = 'Note Contents';
                                    property = 'reason';
                                    oldValue = entry.reason;
                                } else {
                                    propertyName = 'Case Details';
                                    oldValue = entry.details;
                                }
                                
                                if(!newValue) {
                                    switch(entry.action) {
                                        case 0:
                                            return OBUtil.err(`Cannot remove note contents.`, {m:m});
                                        case 2:
                                        case 5:
                                            newValue = oldValue.split('\n')[0];
                                            break;
                                    }
                                } else {
                                    switch(entry.action) {
                                        case 2:
                                        case 5:
                                            newValue = `${oldValue.split('\n')[0]}\n${value}`;
                                            break;
                                    }
                                }
                                break;
                            case 'parent':
                                propertyName = 'Parent Case ID';
                                oldValue = entry.parent;

                                let target = newValue;

                                if(!Number.isInteger(parseInt(target))) {
                                    target = parseInt(target, 36);
                                }

                                if(isNaN(target) || target < 1420070400000 || target > new Date().getTime()) {
                                    return OBUtil.err(`Invalid case ID.`, {m:m});
                                } else
                                if(target === entry.date) {
                                    return OBUtil.err(`Nice try.`, {m:m});
                                }

                                break;
                            case 'pardon':
                                if(data.authlvl < 4) {
                                    return OBUtil.err(`You do not have permission to modify this value.`, {m:m});
                                } else 
                                if(!entry.pardon) {
                                    return OBUtil.err(`This entry has not been pardoned.`, {m:m});
                                } else 
                                if(!newValue) {
                                    return OBUtil.err(`Cannot remove pardon reason.`, {m:m});
                                } else {
                                    propertyName = 'Pardon Reason';
                                    oldValue = entry.pardon.reason;
                                }
                                break;
                        }

                        if(oldValue === newValue) {
                            return OBUtil.err(`New value cannot be the same as the old value.`, {m:m});
                        }

                        const cont = () => {
                            let embed = new djs.MessageEmbed()
                            .setAuthor('Are you sure?', Assets.getEmoji('ICO_warn').url)
                            .setColor(bot.cfg.embed.default)
                            .setDescription([
                                `The following record entry will be updated:${Assets.getEmoji('ICO_space')}`,
                                `${entry.display.icon} ${entry.display.action}`,
                                `\`\`\`yaml\nID: ${entry.display.id}\`\`\``
                            ].join('\n'))
                            .addField(`Old ${propertyName}`, (oldValue) ? oldValue : "<none>")
                            .addField(`New ${propertyName}`, (newValue) ? newValue : "<none>")
                            .setFooter(`This action CANNOT be undone.`)

                            m.channel.send('_ _', {embed: embed}).then(msg => {
                                OBUtil.confirm(m, msg).then(res => {
                                    if(res === 1) {
                                        switch(property) {
                                            case 'reason': 
                                                entry.setReason(m.author, newValue);
                                                break;
                                            case 'details':
                                                entry.setDetails(m.author, newValue);
                                                break;
                                            case 'parent':
                                                entry.setParent(m.author, newValue);
                                                break;
                                            case 'pardon':
                                                entry.setPardon(m, newValue);
                                                break;
                                        }

                                        profile.updateRecord(entry).then(() => {
                                            OBUtil.updateProfile(profile).then(() => {
                                                let logEntry = new LogEntry({channel: "moderation"})
                                                .setColor(bot.cfg.embed.default)
                                                .setIcon(Assets.getEmoji('ICO_docs').url)
                                                .setTitle(`Record Entry Edited`, `Record Entry Edit Report`)
                                                .addSection(`Member`, result.target)
                                                .addSection(`Record Entry`, entry)
                                                .addSection(`Editor`, m.author)
                                                .addSection(`Old ${propertyName}`, (oldValue) ? oldValue : "<none>")
                                                .addSection(`New ${propertyName}`, (newValue) ? newValue : "<none>")
                                                .submit().then(() => {
                                                    let embed = new djs.MessageEmbed()
                                                    .setAuthor(`Record Entry Updated.`, Assets.getEmoji('ICO_okay').url)
                                                    .setColor(bot.cfg.embed.okay)
                                                    .addField(`Record Entry`, [
                                                        `${entry.display.icon} ${entry.display.action}`,
                                                        `\`\`\`yaml\nID: ${entry.display.id}\`\`\``
                                                    ].join('\n'))
                                                    .addField(`Old ${propertyName}`, (oldValue) ? oldValue : "<none>")
                                                    .addField(`New ${propertyName}`, (newValue) ? newValue : "<none>")

                                                    msg.edit({embed: embed})//.then(bm => OBUtil.afterSend(bm, m.author.id));
                                                });
                                            }).catch(err => OBUtil.err(err, {m:m}));
                                        });
                                    } else
                                    if(res === 0) {
                                        let update = new djs.MessageEmbed()
                                        .setAuthor('Cancelled', Assets.getEmoji('ICO_load').url)
                                        .setColor(bot.cfg.embed.default)
                                        .setDescription(`${result.mention}'s profile has not been changed.`)

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
                        }

                        if(property === 'parent') {
                            profile.getRecord(newValue).then(entry => {
                                if(entry) {
                                    cont();
                                } else {
                                    OBUtil.err(`New parent case ID does not exist.`, {m:m});
                                }
                            });
                        } else {
                            cont();
                        }
                    });
                }).catch(err => OBUtil.err(err, {m:m}));
            }
        }).catch(err => OBUtil.err(err, {m:m}));
    } 
}

module.exports = new Command(metadata);
const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const timeago = require("timeago.js");
const { Command, OBUtil, Memory } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    aliases: ['record', 'history'],
    short_desc: `View a user's record.`,
    long_desc: `View a user's violation history.`,
    args: [
        `<discord member> [page #] ["full"]`,
        `<discord member> ["full"] [page #]`,
        `<discord member> [case ID]`
    ],
    authlvl: 1,
    flags: ['DM_OPTIONAL', 'MOD_CHANNEL_ONLY', 'LITE'],
    run: null
}

metadata.run = (m, args, data) => {
    if(!args[0]) {
        OBUtil.missingArgs(m, metadata);
    } else {
        let selectPage = 1;
        let viewAll = false;

        if ((args[1] && isNaN(args[1]) && args[1].toLowerCase() === 'full') || (args[2] && isNaN(args[2]) && args[2].toLowerCase() === 'full')) {
            viewAll = true;
        }

        if(args[1] && !isNaN(args[1])) {
            selectPage = parseInt(args[1]);
        } else
        if(args[2] && !isNaN(args[2])) {
            selectPage = parseInt(args[2]);
        }
        
        OBUtil.parseTarget(m, 0, args[0], data.member).then((result) => {
            if (!result) {
                OBUtil.err('You must specify a valid user.', {m:m})
            } else
            if (result.type === 'notfound') {
                OBUtil.err('Unable to find a user.', {m:m})
            } else
            if (result.id === bot.user.id) {
                OBUtil.err('Nice try.', {m:m})
            } else {
                OBUtil.getProfile(result.id, false).then(profile => {
                    let embed = new djs.MessageEmbed()
                    .setColor(bot.cfg.embed.default)
                    .setTitle(result.tag)
                    .setFooter(`Note that existing violations before October 30, 2019 will not show here. \nAdditionally, all records before [X], 2020 may be missing information.`);

                    let title = `Member Records`;
                    
                    if(!profile || !profile.edata.record) {
                        embed.setAuthor(title, bot.icons.find('ICO_docs'))
                        .setDescription(`This user has no known record.`)

                        m.channel.send({embed: embed}).then(bm => OBUtil.afterSend(bm, m.author.id));
                    } else
                    if(selectPage > 1420070400000) {
                        // INDIVIDUAL ENTRY

                        profile.getRecord(selectPage).then(entry => {
                            if(!entry) {
                                OBUtil.err(`Unable to find case ID ${selectPage}.`, {m:m})
                            } else {
                                let mod = `${entry.moderator} | ${entry.moderator.tag}\n\`\`\`yaml\nID: ${entry.moderator.id}\`\`\``;

                                function isEdited(key) {
                                    if(entry.edits && entry.edits.original[key]) {
                                        return '*';
                                    } else {
                                        return '';
                                    }
                                }

                                embed = new djs.MessageEmbed()
                                .setColor(bot.cfg.embed.default)
                                .setAuthor(title+' | Single Entry', bot.icons.find('ICO_docs'))
                                .setTitle(result.tag)
                                .setDescription(`Case ID: ${entry.date} ${(entry.pardon !== null) ? '**(Pardoned)**' : ''}`)
                                .addField(`Action`, `${entry.display.icon} ${entry.display.action}`)
                                .addField(`${isEdited('reason')}Reason`, (!entry.reason) ? `No reason provided.` : entry.reason)
                                .addField(`Date & Time (UTC)`, `${new Date(entry.date).toUTCString()} \n(${timeago.format(entry.date)})`)
                                .addField(`Moderator Responsible`, mod)
                                .addField(`Command Location`, (entry.url !== null) ? `[Direct URL](${entry.url})`: `Unavailable`)

                                if(entry.edits) {
                                    let lastEdit = entry.edits.history[entry.edits.history.length-1];
                                    embed.setFooter(`Edited sections prefixed with an asterisk (*)\nLast updated on ${new Date(lastEdit.date)} \n(${timeago.format(lastEdit.date)})`)
                                }

                                if(entry.details) embed.addField(`${isEdited('details')}Additional Information`, entry.details)

                                if(entry.pardon) {
                                    let adm = `${entry.pardon.admin} | ${entry.pardon.admin.tag}\n\`\`\`yaml\nID: ${entry.pardon.admin.id}\`\`\``;

                                    embed.addField('(Pardon) Administrator Responsible', adm)
                                    .addField(`(Pardon) Date & Time (UTC)`, `${new Date(entry.pardon.date).toUTCString()} \n(${timeago.format(entry.pardon.date)})`)
                                    .addField(`(Pardon) ${isEdited('pardon')}Reason`, entry.pardon.reason)
                                }

                                if(entry.parent) embed.addField(`${isEdited('parent')}Parent Case ID`, entry.parent)

                                if(entry.children.length > 0) embed.addField(`Linked Case ID(s)`, entry.children.join('\n'))
                                
                                m.channel.send({embed: embed}).then(bm => OBUtil.afterSend(bm, m.author.id));
                            }
                        });
                    } else {

                        // ALL ENTRIES

                        let record = profile.edata.record;
                        let pageNum = selectPage;
                        let perPage = 5;
                        let pageLimit = Math.ceil(record.length / perPage);
                        if (selectPage < 0 || selectPage > pageLimit) {
                            pageNum = 1;
                        }

                        record.reverse();

                        title += ` | Page ${pageNum}/${pageLimit}`;

                        let desc = [
                            `<@${result.id}> has a total of ${record.length} ${(record.length === 1) ? 'entry' : 'entries'} on record`,
                        ]

                        let pardonedCount = 0;

                        for(let entry of record) {
                            if(entry.pardon.state) {
                                pardonedCount++;
                            }
                        }

                        if(pardonedCount > 0) {
                            desc[0] += `, ${pardonedCount} of which ${(pardonedCount === 1) ? "has" : "have"} been pardoned.`;
                        } else {
                            desc[0] += `.`;
                        }

                        let i = (pageNum > 1) ? (perPage * (pageNum - 1)) : 0;
                        let added = 0;
                        let hidden = 0;
                        (function addEntry() {
                            let entry = record[i];
                            let details;

                            if(entry.pardon.state) {
                                if(!viewAll) {
                                    hidden++;
                                    i++;
                                    addEntry();
                                    return;
                                }

                                let reason = `> ${entry.pardon.reason.split('\n').join('\n> ')}`;

                                details = [
                                    `${entry.display.icon} ~~${entry.display.action}~~`,
                                    `**Pardoned By:** <@${entry.pardon.admin}>`,
                                    `**When:** ${timeago.format(entry.pardon.date)}`
                                ]

                                if(entry.pardon.reason.length > 128) {
                                    details.push(reason.substring(0, 128).trim()+'...');
                                } else {
                                    details.push(reason);
                                }
                            } else {
                                let reason = `> ${entry.reason.split('\n').join('\n> ')}`;

                                details = [
                                    `${entry.display.icon} ~~${entry.display.action}~~`,
                                    `**Moderator:** <@${entry.moderator}>`,
                                    `**When:** ${timeago.format(entry.date)}`
                                ]

                                if(entry.reason.length > 128) {
                                    details.push(reason.substring(0, 128).trim()+'...');
                                } else {
                                    details.push(reason);
                                }
                            }

                            embed.addField(`Case ID: ${entry.date}`, details.join('\n'));

                            added++;

                            if(added >= perPage || i+1 >= record.length) {
                                if(hidden > 0) {
                                    desc.push(`**${hidden} pardoned ${(hidden === 1) ? "entry on this page has" : "entries on this page have"} been hidden.** (Use the "full" argument to unhide)`)
                                }

                                embed.setAuthor(title, bot.icons.find('ICO_docs'))
                                .setDescription(desc.join('\n\n'));

                                m.channel.send({embed: embed}).then(bm => OBUtil.afterSend(bm, m.author.id));
                            } else {
                                i++;
                                addEntry();
                            }
                        })();
                    }
                }).catch(err => OBUtil.err(err, {m:m}));
            }
        }).catch(err => OBUtil.err(err, {m:m}));
    } 
}

module.exports = new Command(metadata);
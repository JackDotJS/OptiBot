const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const timeago = require("timeago.js");
const Command = require(path.resolve(`./modules/core/command.js`));

const setup = (bot) => { 
    return new Command(bot, {
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
        run: func
    });
}

const func = (m, args, data) => {
    const bot = data.bot;
    const log = data.log;

    if(!args[0]) {
        data.cmd.noArgs(m);
    } else {
        function entryDef(entry) {
            let action = '';
            let type = '';
            let data = {
                action: null,
                icon: '<:ICO_default:657533390073102363>'
            }

            switch(entry.action) {
                case 0:
                    data.icon = `<:ICO_docs:657535756746620948>`;
                    action = `Note`;
                    break;
                case 1:
                    data.icon = `<:ICO_warn:672291115369627678>`;
                    action = `Warning`;
                    break;
                case 2:
                    data.icon = `<:ICO_mute:671593152221544450>`;
                    action = `Mute`;
                    break;
                case 3:
                    data.icon = `<:ICO_kick:671964834988032001>`;
                    action = `Kick`;
                    break;
                case 4:
                    data.icon = `<:ICO_ban:671964834887106562>`;
                    action = `Ban`;
                    break;
            }

            switch(entry.actionType) {
                case -1:
                    type = `Remove`;
                    break;
                case 0:
                    type = `Update`;
                    break;
                case 1:
                    if ([3, 4].indexOf(entry.action) < 0) type = `Add`;
                    break;
            }

            data.action = `${type} ${action}`.trim();
            return data;
        }

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
        
        bot.util.target(m, args[0], bot, {type: 0, member:data.member}).then((result) => {
            if (!result) {
                bot.util.err('You must specify a valid user.', bot, {m:m})
            } else
            if (result.type === 'notfound') {
                bot.util.err('Unable to find a user.', bot, {m:m})
            } else
            if (result.id === bot.user.id) {
                bot.util.err('Nice try.', bot, {m:m})
            } else {
                bot.getProfile(result.id, false).then(profile => {
                    let record = profile.data.essential.record;
                    let embed = new djs.MessageEmbed()
                    .setColor(bot.cfg.embed.default)
                    .setTitle(result.tag)
                    .setFooter(`Note that existing violations before October 30, 2019 will not show here. \nAdditionally, all records before [X], 2020 may be missing information.`);

                    let title = `Member Records`;
                    
                    if(!profile || !record) {
                        embed.setAuthor(title, bot.icons.find('ICO_docs'))
                        .setDescription(`This user has no known record.`)

                        m.channel.send({embed: embed}).then(bm => bot.util.responder(m.author.id, bm, bot));
                    } else
                    if(selectPage > 1420070400000) {

                        // INDIVIDUAL ENTRY

                        let children = [];
                        let foundEntry = null;

                        for(let i = 0; i < record.length; i++) {
                            let entry = record[i]

                            if(entry.parent === selectPage) {
                                children.push(entry.date);
                            } else
                            if(entry.date === selectPage) {
                                foundEntry = entry;
                                // not using break here because we still need to find any children of this entry
                            }
                            if(i+1 >= record.length) {
                                if(foundEntry === null) {
                                    bot.util.err('Unable to find record entry.', bot, {m:m})
                                } else {
                                    bot.guilds.cache.get(bot.cfg.guilds.optifine).members.fetch(foundEntry.moderator).then(mem => {
                                        if(foundEntry.pardon.state) {
                                            bot.guilds.cache.get(bot.cfg.guilds.optifine).members.fetch(foundEntry.pardon.admin).then(admin => {
                                                finalCase(foundEntry, mem, admin);
                                            }).catch(err => {
                                                bot.util.err(err, bot);
                                                finalCase(foundEntry, mem);
                                            });
                                        } else {
                                            finalCase(foundEntry, mem);
                                        }
                                    }).catch(err => {
                                        bot.util.err(err, bot);
                                        finalCase(foundEntry);
                                    });
                                }
                            }
                        }

                        function finalCase(entry, mem, admin) {
                            let mod = `Unknown (${entry.moderator})`;
                            let adm = `Unknown`;

                            if(mem) {
                                mod = `<@${entry.moderator}> | ${mem.user.tag}\n\`\`\`yaml\n${entry.moderator}\`\`\``;
                            }

                            if(admin) {
                                adm = `<@${entry.pardon.admin}> | ${admin.user.tag}\n\`\`\`yaml\n${entry.pardon.admin}\`\`\``;
                            } else
                            if(entry.pardon.state) {
                                adm = `Unknown (${entry.pardon.admin})`
                            }

                            let def = entryDef(entry);

                            embed = new djs.MessageEmbed()
                            .setColor(bot.cfg.embed.default)
                            .setAuthor(title+' | Single Entry', bot.icons.find('ICO_docs'))
                            .setTitle(result.tag)
                            .setDescription(`Case ID: ${entry.date} ${(entry.pardon.state) ? '**(Pardoned)**' : ''}`)
                            .addField(`Action`, `${def.icon} ${def.action}`)
                            .addField(`Reason`, (!entry.reason || entry.reason.length === 0) ? `No reason provided.` : entry.reason)
                            .addField(`Date & Time (UTC)`, `${new Date(entry.date).toUTCString()} \n(${timeago.format(entry.date)})`)
                            .addField(`Moderator Responsible`, mod)
                            .addField(`Command Location`, (entry.url !== null) ? `[Direct URL](${entry.url})`: `Unavailable`)

                            if(entry.details !== null) embed.addField(`Additional Information`, entry.details)

                            if(entry.pardon.state) {
                                embed.addField('(Pardon) Administrator Responsible', adm)
                                .addField(`(Pardon) Date & Time (UTC)`, `${new Date(entry.pardon.date).toUTCString()} \n(${timeago.format(entry.pardon.date)})`)
                                .addField(`(Pardon) Reason`, entry.pardon.reason)
                            }

                            if(entry.parent !== null) embed.addField(`Parent Case ID`, entry.parent)

                            if(children.length > 0) embed.addField(`Linked Case ID(s)`, children.join('\n'))
                            
                            m.channel.send({embed: embed}).then(bm => bot.util.responder(m.author.id, bm, bot));
                        }
                    } else {

                        // ALL ENTRIES

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
                            let def = entryDef(entry);
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
                                    `${def.icon} ~~${def.action}~~`,
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
                                    `${def.icon} ${def.action}`,
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

                                m.channel.send({embed: embed}).then(bm => bot.util.responder(m.author.id, bm, bot));
                            } else {
                                i++;
                                addEntry();
                            }
                        })();
                    }
                }).catch(err => bot.util.err(err, bot, {m:m}));
            }
        }).catch(err => bot.util.err(err, bot, {m:m}));
    } 
}

module.exports = setup;
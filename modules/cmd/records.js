const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const timeago = require("timeago.js");
const { Command, OBUtil, Memory, RecordEntry } = require(`../core/OptiBot.js`);

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
        let caseid = (args[1]) ? parseInt(args[1], 36) : 0;
        let viewAll = false;

        if ((args[1] && args[1].toLowerCase() === 'full') || (args[2] && args[2].toLowerCase() === 'full')) {
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
                    let footer = [
                        `Note that existing violations before October 30, 2019 will not show here.`,
                        `All records before [TODO], 2020 may be missing information.`
                    ]

                    let embed = new djs.MessageEmbed()
                    .setColor(bot.cfg.embed.default)
                    .setTitle(result.tag)

                    if(result.type !== 'id') {
                        embed.setDescription([
                            `Mention: ${result.mention}`,
                            `\`\`\`yaml\nID: ${result.id}\`\`\``
                        ].join('\n'))
                    }

                    if(result.type !== 'id') {
                        embed.setThumbnail(((result.type === "user") ? result.target : result.target.user).displayAvatarURL({format:'png'}))
                    }

                    let title = `Member Records`;
                    
                    if(!profile || !profile.edata.record) {
                        embed.setAuthor(title, OBUtil.getEmoji('ICO_docs').url)
                        .addField(`Record Statistics`, `This user has no known record.`)
                        .setFooter(footer.join('\n'))

                        m.channel.send({embed: embed}).then(bm => OBUtil.afterSend(bm, m.author.id));
                    } else
                    if(!isNaN(caseid) && caseid > 1420070400000 && caseid < new Date().getTime()) {
                        // INDIVIDUAL ENTRY

                        log(`lookup case id: ${caseid}`);

                        profile.getRecord(caseid).then(entry => {
                            if(!entry) {
                                OBUtil.err(`Unable to find case ID "${caseid}".`, {m:m})
                            } else {
                                log(util.inspect(entry));

                                let mod = `${entry.moderator} | ${entry.moderator.tag}\n\`\`\`yaml\nID: ${entry.moderator.id}\`\`\``;

                                function isEdited(key) {
                                    if(entry.edits && entry.edits.original[key]) {
                                        return '*';
                                    } else {
                                        return '';
                                    }
                                }

                                footer.shift();

                                embed = new djs.MessageEmbed()
                                .setColor(bot.cfg.embed.default)
                                .setAuthor(title+' | Single Entry', OBUtil.getEmoji('ICO_docs').url)
                                .setTitle(`Case ID: ${entry.display.id} ${(entry.pardon) ? '(PARDONED)' : ''}`)
                                .setDescription(`${new Date(entry.date).toUTCString()} \n(${timeago.format(entry.date)})`)
                                .addField(`Member`, [
                                    `${result.mention} | ${result.tag}`,
                                    `\`\`\`yaml\nID: ${result.id}\`\`\``
                                ].join('\n'))
                                .addField(`Moderator Responsible`, mod)
                                .addField(`Command Location`, (entry.url !== null) ? `[Direct URL](${entry.url})`: `Unavailable.`)
                                .addField(`Action`, `${entry.display.icon} ${entry.display.action}`)
                                .addField(`${isEdited('reason')}${(entry.action !== 0) ? "Reason" : "Note Contents"}`, (!entry.reason) ? `No reason provided.` : entry.reason)

                                if(result.type !== 'id') {
                                    embed.setThumbnail(((result.type === "user") ? result.target : result.target.user).displayAvatarURL({format:'png'}))
                                }

                                if(entry.edits) {
                                    let lastEdit = entry.edits.history[entry.edits.history.length-1];
                                    footer.push(
                                        ``,
                                        `Edited sections prefixed with an asterisk (*)`,
                                        `Last updated on ${new Date(lastEdit.date)} \n(${timeago.format(lastEdit.date)})`
                                    );
                                }

                                if(entry.details) embed.addField(`${isEdited('details')}Additional Information`, entry.details)

                                if(entry.pardon) {
                                    let adm = `${entry.pardon.admin} | ${entry.pardon.admin.tag}\n\`\`\`yaml\nID: ${entry.pardon.admin.id}\`\`\``;

                                    embed.addField('(Pardon) Administrator Responsible', adm)
                                    .addField(`(Pardon) Command Location`, (entry.pardon.url !== null) ? `[Direct URL](${entry.pardon.url})`: `Unavailable.`)
                                    .addField(`(Pardon) Date & Time (UTC)`, `${new Date(entry.pardon.date).toUTCString()} \n(${timeago.format(entry.pardon.date)})`)
                                    .addField(`(Pardon) ${isEdited('pardon')}Reason`, entry.pardon.reason)
                                }

                                if(entry.parent) embed.addField(`${isEdited('parent')}Parent Case ID`, entry.display.parent)

                                if(entry.children.length > 0) embed.addField(`Linked Case ID(s)`, entry.display.children.join('\n'))

                                embed.setFooter(footer.join(`\n`));
                                
                                m.channel.send({embed: embed}).then(bm => OBUtil.afterSend(bm, m.author.id));
                            }
                        });
                    } else {

                        // ALL ENTRIES

                        let record = profile.edata.record;
                        let pageNum = selectPage;
                        let perPage = 4;
                        let pageLimit = Math.ceil(record.length / perPage);
                        if (selectPage < 0 || selectPage > pageLimit) {
                            pageNum = 1;
                        }

                        record.reverse();

                        title += ` | Page ${pageNum}/${pageLimit}`;

                        let stats = [
                            `**Total Record Size**: ${record.length.toLocaleString()}`
                        ];

                        

                        let pardonedCount = 0;
                        let points = 0;

                        for(let entry of record) {
                            if(entry.pardon) {
                                pardonedCount++;
                            } else
                            if(entry.action === 5) {
                                points += parseInt(entry.details.match(/(?<=\[)\d+(?=\])/));
                            }
                        }

                        stats.push(
                            `**Pardoned Entries**: ${pardonedCount.toLocaleString()}`,
                            `**Violation Points**: ${points.toLocaleString()}/${bot.cfg.points.userMax.toLocaleString()} ${(points > bot.cfg.points.userMax) ? OBUtil.getEmoji('ICO_warn').toString() : ""}`
                        );

                        let i = (pageNum > 1) ? (perPage * (pageNum - 1)) : 0;
                        let added = 0;
                        let hidden = 0;
                        (function addEntry() {
                            let entry = new RecordEntry(record[i]);
                            let details = [
                                `**Case ID: [${entry.display.id}](${m.url.replace(/\/\d+$/, '')})**`
                            ]

                            function next() {
                                if(added >= perPage || i+1 >= record.length) {
                                    if(hidden > 0) {
                                        stats[1] += ` (${hidden} on this page)`
                                    }

                                    if(pardonedCount === record.length) {
                                        stats.push(
                                            `**[NOTICE: All of this user's record entries have been pardoned.](${m.url.replace(/\/\d+$/, '')})**`
                                        )
                                    }
    
                                    embed.setAuthor(title, OBUtil.getEmoji('ICO_docs').url)
                                    .setFooter(footer.join('\n'))
                                    .fields.unshift({
                                        name: `Record Information`,
                                        value: stats.join(`${OBUtil.getEmoji('ICO_space')}\n`)+`${OBUtil.getEmoji('ICO_space')}`
                                    });
    
                                    m.channel.send({embed: embed}).then(bm => OBUtil.afterSend(bm, m.author.id));
                                } else {
                                    i++;
                                    addEntry();
                                }
                            }

                            if(entry.edits && footer.length < 3) {
                                let lastEdit = entry.edits.history[entry.edits.history.length-1];
                                footer.push(
                                    ``,
                                    `Edited entries prefixed with an asterisk (*)`,
                                )
                            }

                            if(entry.pardon) {
                                if(!viewAll) {
                                    if((added + hidden) < perPage) {
                                        hidden++;
                                    }
                                    return next();
                                }

                                let reason = `> **${(entry.action !== 0) ? "Reason" : "Note Contents"}:**${OBUtil.getEmoji('ICO_space')}\n> ${entry.pardon.reason.split('\n').join('\n> ')}`;

                                details.push(
                                    `**Pardoned By:** <@${entry.pardon.admin}>`,
                                    `**When:** ${timeago.format(entry.pardon.date)}`
                                )

                                if(entry.pardon.reason.length > 128) {
                                    details.push(reason.substring(0, 128).trim()+'...');
                                } else {
                                    details.push(reason);
                                }
                            } else {
                                let reason = `> **${(entry.action !== 0) ? "Reason" : "Note Contents"}:**${OBUtil.getEmoji('ICO_space')}\n> ${entry.reason.split('\n').join('\n> ')}`;

                                details.push(
                                    `**Moderator:** <@${entry.moderator}>`,
                                    `**When:** ${timeago.format(entry.date)}`
                                )

                                if(entry.action === 5) {
                                    // todo: get point decay from profile class
                                    details.push(`**Amount:** ${parseInt(entry.details.match(/(?<=\[)\d+(?=\])/)).toLocaleString()}`)
                                }

                                if(entry.reason.length > 128) {
                                    details.push(reason.substring(0, 128).trim()+'...');
                                } else {
                                    details.push(reason);
                                }
                            }

                            embed.addField(`${entry.display.icon} ${(entry.edits) ? "*\\*" : ""}${entry.display.action}${(entry.edits) ? "*" : ""} ${entry.pardon ? "**(PARDONED)**" : ""}`, details.join(`${OBUtil.getEmoji('ICO_space')}\n`));

                            added++;

                            next();
                        })();
                    }
                }).catch(err => OBUtil.err(err, {m:m}));
            }
        }).catch(err => OBUtil.err(err, {m:m}));
    } 
}

module.exports = new Command(metadata);
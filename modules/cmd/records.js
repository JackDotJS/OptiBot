const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const timeago = require("timeago.js");
const Command = require(path.resolve(`./modules/core/command.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    aliases: ['record', 'history'],
    short_desc: `View a user's record.`,
    long_desc: `View a user's violation history.`,
    usage: `<target:member> [num:page | num:case ID]`,
    authlvl: 1,
    tags: ['DM_OPTIONAL', 'MOD_CHANNEL_ONLY', 'LITE'],

    run: (m, args, data) => {
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
                        type = `Edit`;
                        break;
                    case 1:
                        if ([3, 4].indexOf(entry.action) < 0) type = `Add`;
                        break;
                }

                data.action = `${type} ${action}`.trim();
                return data;
            }
            
            bot.util.target(m, args[0], bot, {type: 0, member:data.member}).then((result) => {
                if (!result) {
                    bot.util.err('You must specify a valid user.', bot, {m:m})
                } else
                if (result.type === 'notfound') {
                    bot.util.err('Unable to find a user.', bot, {m:m})
                } else {
                    let userid = (result.type === "user") ? result.target.user.id : result.target;

                    if (userid === bot.user.id) {
                        bot.util.err('Nice try.', bot, {m:m})
                    } else {
                        bot.getProfile(userid, false).then(profile => {
                            let embed = new djs.MessageEmbed()
                            .setColor(bot.cfg.embed.default)
                            .setTitle((result.type === "user") ? result.target.user.tag : `\`${result.target.id}\``)
                            .setFooter(`Note that existing violations before October 30, 2019 will not show here. Additionally, all records before [X], 2020 may be missing additional information.`);

                            let title = `Member Records`;
                            
                            if(!profile || !profile.data.essential.record) {
                                embed.setAuthor(title, bot.icons.find('ICO_docs'))
                                .setDescription(`This user has no known record.`)

                                m.channel.send({embed: embed}).then(bm => bot.util.responder(m.author.id, bm, bot));
                            } else
                            if(args[1] && !isNaN(args[1]) && parseInt(args[1]) > 946684800000) {

                                // INDIVIDUAL ENTRY

                                let children = [];
                                let foundEntry = null;

                                for(let i = 0; i < profile.data.essential.record.length; i++) {
                                    let entry = profile.data.essential.record[i]

                                    if(entry.parent === parseInt(args[1])) {
                                        children.push(entry.date);
                                    } else
                                    if(entry.date === parseInt(args[1])) {
                                        foundEntry = entry;
                                    }
                                    if(i+1 >= profile.data.essential.record.length) {
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
                                    .setTitle((result.type === "user") ? result.target.user.tag : `\`${result.target.id}\``)
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

                                // todo: show risk factor if available

                                let pageNum = 1
                                let perPage = 5;
                                let pageLimit = Math.ceil(profile.data.essential.record.length / perPage);
                                if (args[1] && parseInt(args[1]) > 0 && parseInt(args[1]) <= pageLimit) {
                                    pageNum = parseInt(args[1]);
                                }

                                profile.data.essential.record.reverse();

                                title += ` | Page ${pageNum}/${pageLimit}`;
                                embed.setAuthor(title, bot.icons.find('ICO_docs'))
                                .setDescription(`<@${userid}> has a total of ${profile.data.essential.record.length} ${(profile.data.essential.record.length === 1) ? 'entry' : 'entries'} on record. \nType \`${bot.prefix}${data.input.cmd} <member> <case ID>\` for more information on a specifc entry.`);

                                let i = (pageNum > 1) ? (perPage * (pageNum - 1)) : 0;
                                let added = 0;
                                (function addEntry() {
                                    let entry = profile.data.essential.record[i];
                                    let def = entryDef(entry);
                                    let details;

                                    if(entry.pardon.state) {
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

                                    if(added >= perPage || i+1 >= profile.data.essential.record.length) {
                                        m.channel.send({embed: embed}).then(bm => bot.util.responder(m.author.id, bm, bot));
                                    } else {
                                        i++;
                                        addEntry();
                                    }
                                })();
                            }
                        }).catch(err => bot.util.err(err, bot, {m:m}));
                    }
                }
            }).catch(err => bot.util.err(err, bot, {m:m}));
        } 
    }
})}
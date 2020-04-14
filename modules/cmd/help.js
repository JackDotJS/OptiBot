const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    short_desc: `Getting started with OptiBot.`,
    long_desc: `temp`,
    usage: `[text:command name]`,
    authlvl: 0,
    tags: ['DM_OPTIONAL', 'INSTANT'],

    run: (m, args, data) => {
        if (!args[0]) {
            // default help page
            let embed = new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setAuthor('Getting Started', bot.icons.find('ICO_info'))
            .setDescription(`OptiBot is a Discord bot primarily designed for utility. Whether it's moderation tools, or something to help you make a resource pack, you can probably find it here. (see \`${bot.prefix}about\` for more info about OptiBot itself)`)
            .setThumbnail(bot.user.displayAvatarURL)
            .addField('Commands List', `\`\`\`${bot.prefix}list\`\`\``)
            .addField('Tidbits & Other Features', `\`\`\`${bot.prefix}tidbits\`\`\``)

            m.channel.send({ embed: embed }).then(bm => bot.util.responder(m.author.id, bm, bot));
        } else {
            bot.commands.find(args[0]).then((cmd) => {
                if (!cmd || (cmd.metadata.tags['HIDDEN'] && data.authlvl < cmd.metadata.authlvl)) {
                    bot.util.err(`The "${args[0]}" command does not exist.`, bot, {m:m})
                } else
                if (data.authlvl < cmd.metadata.authlvl) {
                    bot.util.err(`You do not have permission to view the "${args[0]}" command.`, bot, {m:m})
                } else {
                    let md = cmd.metadata;
                    let files = [];
                    let embed = new djs.MessageEmbed()
                    .setColor(bot.cfg.embed.default)
                    .setAuthor('OptiBot Commands', bot.icons.find('ICO_info'))
                    .setTitle(`${bot.prefix}${md.name}`)
                    .setDescription(md.long_desc)
                    .addField('Usage', `\`\`\`${md.usage}\`\`\``)

                    if (md.aliases.length > 0) {
                        embed.addField('Alias(es)', `\`\`\`${bot.prefix}${md.aliases.join(`, ${bot.prefix}`)}\`\`\``)
                    }

                    if (data.authlvl >= 5 && (bot.cfg.channels.mod.indexOf(m.channel.id) > -1 || bot.cfg.channels.mod.indexOf(m.channel.parentID) > -1)) {
                        let taglist = [];

                        Object.keys(md.tags).forEach((tag) => {
                            if(md.tags[tag] === true) taglist.push(tag);
                        });

                        if(taglist.length === 0) taglist = 'This command has no active flags.'

                        embed.addField('(DEV) Permission Level', `\`\`\`javascript\n${md.authlvl}\`\`\``)
                        .addField('(DEV) Flags', `\`\`\`javascript\n${util.inspect(taglist)}\`\`\``)
                    }

                    if (md.image) {
                        embed.attachFile(new djs.MessageAttachment(bot.images.find(md.image), "thumbnail.png"))
                        .setThumbnail('attachment://thumbnail.png');
                    }

                    let restrictions = [];

                    if (md.tags['NO_DM']) {
                        if(md.tags['BOT_CHANNEL_ONLY']) {
                            restrictions.push(`<:error:642112426162126873> This command can *only* be used in the <#626843115650547743> channel.`);
                        } else {
                            restrictions.push(`<:warn:642112437218443297> This command can be used in any channel, but *not* in DMs (Direct Messages)`);
                        }
                    } else
                    if (md.tags['DM_ONLY']) {
                        restrictions.push(`<:error:642112426162126873> This command can *only* be used in DMs (Direct Messages)`);
                    } else
                    if (md.tags['BOT_CHANNEL_ONLY']) {
                        restrictions.push(`<:warn:642112437218443297> This command can *only* be used in DMs (Direct Messages) or the <#626843115650547743> channel.`);
                    } else
                    if (md.tags['MOD_CHANNEL_ONLY']) {
                        if(md.tags['NO_DM']) {
                            restrictions.push(`<:error:642112426162126873> This command can *only* be used in moderator-only channels.`);
                        } else {
                            restrictions.push(`<:error:642112426162126873> This command can *only* be used in DMs (Direct Messages) or any moderator-only channel.`);
                        }
                    } else {
                        restrictions.push(`<:okay:642112445997121536> This command can be used in any channel, including DMs (Direct Messages)`);
                    }

                    if(md.tags['STRICT']) {
                        restrictions.push('<:locked:642112455333511178> Restrictions apply to ALL members, regardless of roles or permissions.');
                    } else
                    if(md.tags['BOT_CHANNEL_ONLY']) {
                        restrictions.push(`<:unlocked:642112465240588338> Moderators exempt from some restrictions.`);
                    }

                    if (md.authlvl === 0) {
                        restrictions.push(`<:unlocked:642112465240588338> Available to all server members.`);
                    } else
                    if (md.authlvl === 1) {
                        restrictions.push('<:locked:642112455333511178> Advisors, Jr. Moderators, and higher.');
                    } else
                    if (md.authlvl === 2) {
                        restrictions.push('<:locked:642112455333511178> Jr. Moderators, Moderators, and higher.');
                    } else
                    if (md.authlvl === 3) {
                        restrictions.push('<:locked:642112455333511178> Moderators and Administrators only.');
                    } else
                    if (md.authlvl === 4) {
                        restrictions.push('<:locked:642112455333511178> Administrators only.');
                    } else
                    if (md.authlvl === 5) {
                        restrictions.push('<:locked:642112455333511178> OptiBot developers only.');
                    }

                    if(md.tags['HIDDEN']) {
                        restrictions.push(`<:warn:642112437218443297> This is a hidden command. OptiBot will act as if this command does not exist to any user who does not have required permissions.`);
                    }

                    embed.addField('Restrictions', restrictions.join('\n'));

                    m.channel.send({ embed: embed }).then(bm => bot.util.responder(m.author.id, bm, bot));
                }
            });
        }
    }
})}
const path = require('path');
const util = require('util');
const djs = require('discord.js');
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    short_desc: 'Getting started with OptiBot.',
    long_desc: 'Gives a brief introduction to OptiBot.',
    args: '[command]',
    authlvl: 0,
    flags: ['DM_OPTIONAL', 'NO_TYPER', 'BOT_CHANNEL_ONLY'],
    run: null
};

metadata.run = (m, args, data) => {
    if (!args[0]) {
        // default help page
        const desc = [
            `To use any command, simply type a prefix (\`${bot.prefixes.join('`, `')}\`) immediately followed by the name/alias of the command. Command arguments are separated by spaces, like so: \`${bot.prefix}command <arg1> <arg2> <arg3> ...\``,
            '',
            'Necessary arguments are listed in **<**angle brackets**>**, otherwise they\'re listed in **[**square brackets**]**. You can use shortcuts for arguments that require a Discord user/message, such as @mentions, user IDs, message URLs, and the "arrow" shortcut (`^`). Arguments that require a length of time can be specified as a number followed by a time format. Without the format, this will default to hours. For example, 24 hours could be written as "24" or "1d". Supported formats include (__s__)econds, (__m__)inutes, (__h__)ours, (__d__)ays, and (__w__)eeks.',
            '',
            `You can find detailed information about any command by typing \`${bot.prefix}help <command name>\`.`,
            `For more information about the OptiBot project, you can use the \`${bot.prefix}about\` command.`
        ];

        const embed = new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setAuthor('Getting Started', Assets.getEmoji('ICO_info').url)
            .setThumbnail(bot.user.displayAvatarURL({format: 'png', size:64}))
            .setDescription(desc.join('\n'))
            .addField('Commands List', `\`\`\`${bot.prefix}list\`\`\``)
            .addField('Other Features', `\`\`\`${bot.prefix}optibits\`\`\``);

        m.channel.send({ embed: embed }).then(bm => OBUtil.afterSend(bm, m.author.id));
    } else {
        Assets.fetchCommand(args[0]).then((cmd) => {
            if (!cmd || (cmd.metadata.flags['HIDDEN'] && data.authlvl < cmd.metadata.authlvl)) {
                OBUtil.err(`The "${args[0]}" command does not exist.`, {m:m});
            } else
            if (data.authlvl < cmd.metadata.authlvl) {
                OBUtil.err(`You do not have permission to view the "${args[0]}" command.`, bot, {m:m});
            } else {
                const md = cmd.metadata;
                const files = [];

                const embed = new djs.MessageEmbed()
                    .setColor(bot.cfg.embed.default)
                    .setAuthor('OptiBot Commands', Assets.getEmoji('ICO_info').url)
                    .setTitle(`${bot.prefix}${md.name}`)
                    .setDescription(md.long_desc)
                    .addField('Usage', md.args);

                if (md.aliases.length > 0) {
                    embed.addField('Alias(es)', `\`\`\`${bot.prefix}${md.aliases.join(`, ${bot.prefix}`)}\`\`\``);
                }

                if (data.authlvl >= 5 && (m.channel.type === 'dm' || [m.channel.id, m.channel.parentID].some(e => bot.cfg.channels.mod.includes(e)))) {
                    let taglist = [];

                    Object.keys(md.flags).forEach((tag) => {
                        if(md.flags[tag] === true) taglist.push(tag);
                    });

                    if(taglist.length === 0) taglist = 'This command has no active flags.';

                    embed.addField('(DEV) Permission Level', `\`\`\`javascript\n${md.authlvl}\`\`\``, true)
                        .addField('(DEV) Flags', `\`\`\`javascript\n${util.inspect(taglist)}\`\`\``, true);
                }

                if (md.image) {
                    embed.attachFiles([Assets.getImage(md.image).attachment])
                        .setThumbnail('attachment://image.png');
                }

                const restrictions = [];

                if (md.flags['NO_DM']) {
                    if(md.flags['BOT_CHANNEL_ONLY']) {
                        restrictions.push('<:error:642112426162126873> This command can *only* be used in the <#626843115650547743> channel.');
                    } else {
                        restrictions.push('<:warn:642112437218443297> This command can be used in any channel, but *not* in DMs (Direct Messages)');
                    }
                } else
                if (md.flags['DM_ONLY']) {
                    restrictions.push('<:error:642112426162126873> This command can *only* be used in DMs (Direct Messages)');
                } else
                if (md.flags['BOT_CHANNEL_ONLY']) {
                    restrictions.push('<:warn:642112437218443297> This command can *only* be used in DMs (Direct Messages) or the <#626843115650547743> channel.');
                } else
                if (md.flags['MOD_CHANNEL_ONLY']) {
                    if(md.flags['NO_DM']) {
                        restrictions.push('<:error:642112426162126873> This command can *only* be used in moderator-only channels.');
                    } else {
                        restrictions.push('<:error:642112426162126873> This command can *only* be used in DMs (Direct Messages) or any moderator-only channel.');
                    }
                } else {
                    restrictions.push('<:okay:642112445997121536> This command can be used in any channel, including DMs (Direct Messages)');
                }

                if(md.flags['STRICT']) {
                    restrictions.push('<:locked:642112455333511178> Restrictions apply to ALL members, regardless of roles or permissions.');
                } else
                if(md.flags['BOT_CHANNEL_ONLY']) {
                    restrictions.push('<:unlocked:642112465240588338> Moderators exempt from some restrictions.');
                }

                if (md.authlvl === 0) {
                    restrictions.push('<:unlocked:642112465240588338> Available to all server members.');
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

                if(md.flags['HIDDEN']) {
                    restrictions.push('<:warn:642112437218443297> This is a hidden command. OptiBot will act as if this command does not exist to any user who does not have required permissions.');
                }

                embed.addField('Restrictions', restrictions.join('\n'));

                m.channel.send({ embed: embed }).then(bm => OBUtil.afterSend(bm, m.author.id));
            }
        });
    }
};

module.exports = new Command(metadata);
const path = require('path');
const util = require('util');
const djs = require('discord.js');
const { Command, OBUtil, Memory, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  short_desc: 'Show command details and information.',
  long_desc: 'Gives detailed information about a given command.',
  args: '<command>',
  authlvl: 0,
  flags: ['DM_OPTIONAL', 'NO_TYPER', 'BOT_CHANNEL_ONLY'],
  run: null
};

metadata.run = (m, args, data) => {
  if (!args[0]) {
    OBUtil.err(`You must specify a command.`, { m });
  } else {
    Assets.fetchCommand(args[0]).then((cmd) => {
      if (!cmd || (cmd.metadata.flags['HIDDEN'] && data.authlvl < cmd.metadata.authlvl)) {
        OBUtil.err(`The "${args[0]}" command does not exist.`, { m });
      } else if (data.authlvl < cmd.metadata.authlvl) {
        OBUtil.err(`You do not have permission to view the "${args[0]}" command.`, { m });
      } else {
        const md = cmd.metadata;

        const advancedUsage = [
          `Required arguments are listed in <angle brackets>`,
          `Optional arguments are listed in [square brackets] in addition to being highlighted in blue.`,
          ``,
          `You can use "shortcuts" for arguments that require a Discord user or message. This includes @mentions, user IDs, message URLs, and the "arrow" shortcut (^) which refers to the user or message directly above yours.`,
          ``,
          `Arguments that require a length of time can be specified as a number followed by a time measurement. Without the measurement, this will default to hours. For example, 24 hours could be written as either "24" or "1d". Supported measurements include (s)econds, (m)inutes, (h)ours, (d)ays, and (w)eeks.`
        ].join('\n');

        const embed = new djs.MessageEmbed()
          .setColor(bot.cfg.embed.default)
          .setAuthor('OptiBot Commands', Assets.getEmoji('ICO_info').url)
          .setTitle(`${bot.prefix}${md.name}`)
          .setDescription(md.long_desc)
          .addField('Usage', `[(i)](${m.url.replace(/\/\d+$/, '')} "${advancedUsage}") ${md.args}`);

        if (md.aliases.length > 0) {
          embed.addField('Alias(es)', `\`\`\`${bot.prefix}${md.aliases.join(`, ${bot.prefix}`)}\`\`\``);
        }

        if (data.authlvl >= 5 && (m.channel.type === 'dm' || [m.channel.id, m.channel.parentID].some(e => bot.cfg.channels.mod.includes(e)))) {
          let taglist = [];

          Object.keys(md.flags).forEach((tag) => {
            if (md.flags[tag] === true) taglist.push(tag);
          });

          if (taglist.length === 0) taglist = 'This command has no active flags.';

          embed.addField('(DEV) Permission Level', `\`\`\`javascript\n${md.authlvl}\`\`\``, true)
            .addField('(DEV) Flags', `\`\`\`javascript\n${util.inspect(taglist)}\`\`\``, true);
        }

        if (md.image) {
          embed.attachFiles([Assets.getImage(md.image).attachment])
            .setThumbnail('attachment://image.png');
        }

        const restrictions = [];

        if (md.flags['NO_DM']) {
          if (md.flags['BOT_CHANNEL_ONLY']) {
            restrictions.push('<:error:642112426162126873> This command can *only* be used in the <#626843115650547743> channel.');
          } else {
            restrictions.push('<:warn:642112437218443297> This command can be used in any channel, but *not* in DMs (Direct Messages)');
          }
        } else if (md.flags['DM_ONLY']) {
          restrictions.push('<:error:642112426162126873> This command can *only* be used in DMs (Direct Messages)');
        } else if (md.flags['BOT_CHANNEL_ONLY']) {
          restrictions.push('<:warn:642112437218443297> This command can *only* be used in DMs (Direct Messages) or the <#626843115650547743> channel.');
        } else if (md.flags['MOD_CHANNEL_ONLY']) {
          if (md.flags['NO_DM']) {
            restrictions.push('<:error:642112426162126873> This command can *only* be used in staff-only channels.');
          } else {
            restrictions.push('<:error:642112426162126873> This command can *only* be used in DMs (Direct Messages) or any staff-only channel.');
          }
        } else {
          restrictions.push('<:okay:642112445997121536> This command can be used in any channel, including DMs (Direct Messages)');
        }

        if (!md.flags['STRICT']) {
          restrictions.push('<:unlocked:642112465240588338> Staff exempt from certain restrictions.');
        }

        switch(md.authlvl) {
          case 1: 
            restrictions.push('<:locked:642112455333511178> Retired Staff, Jr. Moderators, and higher.');
            break;
          case 2: 
            restrictions.push('<:locked:642112455333511178> Jr. Moderators, Moderators, and higher.');
            break;
          case 3: 
            restrictions.push('<:locked:642112455333511178> Moderators and Administrators only.');
            break;
          case 4: 
            restrictions.push('<:locked:642112455333511178> Administrators only.');
            break;
          case 5: 
            restrictions.push('<:locked:642112455333511178> OptiBot developers only.');
            break;
        }

        if (md.flags['HIDDEN']) {
          restrictions.push('<:warn:642112437218443297> **This is a hidden command.**');
        }

        if(restrictions.length > 0) {
          embed.addField('Important Notes', restrictions.join('\n'));
        } else {
          embed.addField('Important Notes', `None.`);
        }

        m.channel.send(embed).then(bm => OBUtil.afterSend(bm, m.author.id));
      }
    });
  }
};

module.exports = new Command(metadata);
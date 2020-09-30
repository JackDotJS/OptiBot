const ob = require('../modules/core/OptiBot.js');
const wink = require('jaro-winkler');
const djs = require('discord.js');
const util = require('util');
const cid = require('caller-id');

const log = (message, level, file, line) => {
  const call = cid.getData();
  if (!file) file = (call.evalFlag) ? 'eval()' : call.filePath.substring(call.filePath.lastIndexOf('\\') + 1);
  if (!line) line = call.lineNumber;

  try {
    process.send({
      type: 'log',
      message: message,
      level: level,
      misc: `${file}:${line}`
    });
  }
  catch (e) {
    try {
      process.send({
        type: 'log',
        message: util.inspect(message),
        level: level,
        misc: `${file}:${line}`
      });
    }
    catch (e2) {
      log(e);
      log(e2);
    }
  }


};

module.exports = (bot, m) => {
  if (bot.pause) return;
  if (m.author.bot || m.author.system || m.type !== 'DEFAULT' || m.system) return;

  if (ob.Memory.users.indexOf(m.author.id) === -1) {
    ob.Memory.users.push(m.author.id);
    ob.OBUtil.getProfile(m.author.id, false).then(profile => {
      if (profile) {
        profile.edata.lastSeen = new Date().getTime();

        ob.OBUtil.updateProfile(profile);
      }
    });
  }

  if (m.channel.type !== 'dm' && m.guild.id === bot.cfg.guilds.optifine) {
    // update moderator's last message for !modping
    for (const i in ob.Memory.mods) {
      if (ob.Memory.mods[i].id === m.author.id) {
        ob.Memory.mods[i].status = m.author.presence.status;
        ob.Memory.mods[i].last_message = m.createdTimestamp;
      }
    }
  }

  const input = ob.OBUtil.parseInput(m.content);

  bot.mainGuild.members.fetch({ user: m.author.id, cache: true }).then(member => {
    const authlvl = ob.OBUtil.getAuthlvl(member);

    if (authlvl < 4 && bot.mode === 0 && m.author.id !== '271760054691037184') return;
    if (authlvl < 1 && bot.mode === 1 && m.author.id !== '271760054691037184') return;

    if (input.valid) {
      /////////////////////////////////////////////////////////////
      // COMMAND HANDLER
      /////////////////////////////////////////////////////////////

      ob.Memory.li = new Date().getTime();

      log(authlvl);

      ob.Assets.fetchCommand(input.cmd).then(cmd => {
        const unknownCMD = () => {
          const ratings = [];

          ob.Memory.assets.commands.filter((thisCmd) => thisCmd.metadata.authlvl <= authlvl && !thisCmd.metadata.flags['HIDDEN'])
            .forEach((thisCmd) => {
              const rating = {
                command: thisCmd.metadata.name,
                alias: null,
                distance: wink(input.cmd, thisCmd.metadata.name)
              };

              for (const alias of thisCmd.metadata.aliases) {
                const adist = wink(input.cmd, alias);
                if (adist > rating.distance) {
                  rating.distance = adist;
                  rating.alias = alias;
                }
              }

              ratings.push(rating);
            });

          ratings.sort((a, b) => b.distance - a.distance);

          const closest = ratings[0];

          const embed = new djs.MessageEmbed()
            .setAuthor('Unknown command.', ob.Assets.getEmoji('ICO_info').url)
            .setColor(bot.cfg.embed.default);

          if (closest.distance > 0.8) {
            embed.setFooter(`${(closest.distance * 100).toFixed(1)}% match`);

            if (closest.alias !== null) {
              embed.setDescription(`Perhaps you meant \`${bot.prefix}${closest.alias}\`? (Alias of \`${bot.prefix}${closest.command}\`)`);
            } else {
              embed.setDescription(`Perhaps you meant \`${bot.prefix}${closest.command}\`?`);
            }
          } else {
            embed.setDescription(`Type \`${bot.prefix}list\` for a list of commands.`);
          }

          m.channel.send({ embed: embed }).then(bm => ob.OBUtil.afterSend(bm, m.author.id));
        };

        const checkMisuse = (msg, image) => {
          const embed = new djs.MessageEmbed()
            .setAuthor(msg, ob.Assets.getEmoji('ICO_error').url)
            .setColor(bot.cfg.embed.error);

          let content = '';

          if (image) {
            embed.attachFiles([image])
              .setImage('attachment://image.png');
          }

          if (cmd.metadata.flags['DELETE_ON_MISUSE']) {
            m.delete({ reason: `User misused "${bot.prefix}${cmd.metadata.name}" command.` }).catch(err => {
              ob.OBUtil.err(err);
            });
            content = m.author;
          }

          m.channel.send(content, { embed: embed }).then(bm => {
            ob.OBUtil.afterSend(bm, m.author.id);
          });
        };

        if (cmd) {
          let loc = `#${m.channel.name}`;
          const logargs = (cmd.metadata.flags['CONFIDENTIAL']) ? m.content.replace(/\S/gi, '*') : m.content;

          if (m.channel.type === 'dm') {
            loc = 'DM';
          } else if (m.guild.id === bot.cfg.guilds.optibot) {
            loc = `OB:#${m.channel.name}`;
          } else if (m.guild.id === bot.cfg.guilds.donator) {
            loc = `DR:#${m.channel.name}`;
          }

          log(`[${loc}] [L${authlvl}] ${m.author.tag} (${m.author.id}) Command issued: ${logargs}`, 'info');
        }

        if (!cmd) {
          unknownCMD();
        } else if (authlvl < cmd.metadata.authlvl || (cmd.metadata.flags['IGNORE_ELEVATED'] && ob.OBUtil.getAuthlvl(member, true) !== cmd.metadata.authlvl) || (cmd.metadata.flags['STRICT_AUTH'] && authlvl !== cmd.metadata.authlvl)) {
          if (cmd.metadata.flags['HIDDEN']) {
            unknownCMD();
          } else {
            checkMisuse('You do not have permission to use this command.');
          }
        } else if (cmd.metadata.flags['NO_DM'] && m.channel.type === 'dm' && (authlvl < 5 || cmd.metadata.flags['STRICT'])) {
          checkMisuse('This command cannot be used in DMs (Direct Messages).');
        } else if (cmd.metadata.flags['DM_ONLY'] && m.channel.type !== 'dm' && (authlvl < 5 || cmd.metadata.flags['STRICT'])) {
          checkMisuse('This command can only be used in DMs (Direct Messages).', ob.Assets.getImage('IMG_dm').attachment);
        } else if (cmd.metadata.flags['BOT_CHANNEL_ONLY'] && m.channel.type !== 'dm' && !bot.cfg.channels.bot.some(id => [m.channel.id, m.channel.parentID].includes(id)) && (authlvl === 0 || cmd.metadata.flags['STRICT'])) {
          checkMisuse('This command can only be used in DMs (Direct Messages) OR the #optibot channel.');
        } else if (cmd.metadata.flags['MOD_CHANNEL_ONLY'] && m.channel.type !== 'dm' && !bot.cfg.channels.mod.some(id => [m.channel.id, m.channel.parentID].includes(id)) && (authlvl < 5 || cmd.metadata.flags['STRICT'])) {
          checkMisuse('This command can only be used in moderator-only channels.');
        } else {
          if (!cmd.metadata.flags['NO_TYPER']) m.channel.startTyping();
          bot.setTimeout(() => {
            try {
              cmd.exec(m, input.args, { member, authlvl, input });
            }
            catch (err) {
              if (!cmd.metadata.flags['NO_TYPER']) m.channel.stopTyping();
              ob.OBUtil.err(err, { m: m });
            }
          }, (cmd.metadata.flags['NO_TYPER']) ? 10 : Math.round(bot.ws.ping) + 250);
        }

      }).catch(err => {
        ob.OBUtil.err(err, { m: m });
      });
    } else {
      /////////////////////////////////////////////////////////////
      // TIDBIT HANDLER
      /////////////////////////////////////////////////////////////

      const validbits = [];

      for (const optibit of ob.Memory.assets.optibits) {
        if (authlvl < optibit.metadata.authlvl) continue;
        if (optibit.metadata.flags['NO_DM'] && m.channel.type === 'dm') continue;
        if (optibit.metadata.flags['DM_ONLY'] && m.channel.type !== 'dm') continue;

        if (optibit.validate(m, member, authlvl)) {
          validbits.push(optibit);
        }
      }

      if (validbits.length > 0) {
        ob.Memory.li = new Date().getTime();

        validbits.sort((a, b) => { a.metadata.priority - b.metadata.priority; });
        validbits.reverse();

        log(util.inspect(validbits));

        for (const optibit of validbits) {
          if (validbits[0].metadata.concurrent && !optibit.metadata.concurrent) continue;

          try {
            let loc = `#${m.channel.name}`;

            if (m.channel.type === 'dm') {
              loc = 'DM';
            } else if (m.guild.id === bot.cfg.guilds.optibot) {
              loc = `OB:#${m.channel.name}`;
            } else if (m.guild.id === bot.cfg.guilds.donator) {
              loc = `DR:#${m.channel.name}`;
            }

            log(`[${loc}] [L${authlvl}] ${m.author.tag} (${m.author.id}) OptiBit Executed: "${optibit.metadata.name}"`, 'info');
            optibit.exec(m, member, authlvl);
          }
          catch (err) {
            ob.OBUtil.err(err, { m: m });
          }

          if (!validbits[0].metadata.concurrent) break;
        }
      }
    }
  }).catch(err => {
    if (err.message.match(/invalid or uncached|unknown member|unknown user/i) && input.valid) {
      ob.OBUtil.err('Sorry, you must be a member of the OptiFine Discord server to use this bot.', { m: m });
    } else {
      ob.OBUtil.err(err);
    }
  });
};
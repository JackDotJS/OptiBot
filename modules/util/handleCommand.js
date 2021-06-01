const wink = require(`jaro-winkler`);
const djs = require(`discord.js`);
const Assets = require(`../core/asset_manager.js`);
const memory = require(`../core/memory.js`);

module.exports = async (m, input, gcfg, perms) => {
  const bot = memory.core.client;
  const log = bot.log;

  const member = m.member;

  let allowRetry = true;

  const cmdinfo = (md) => {
    // performs various checks on the given command with the user and guildconfig and returns the results
    // this mainly exists to reduce repeating ourselves throughout the rest of this file
    // there's probably a better way to do this idk

    const permCheck = perms.has(`cmd.${md.name}`);
    const forceHiddenCheck = md.flags.includes(`FORCE_HIDDEN`);
    const devOnlyCheck = md.flags.includes(`DEVELOPER_ONLY`);
    const guildCheck = (md.guilds.length === 0 || m.guild != null && md.guilds.includes(m.guild.id));

    const gcfgHidden = gcfg.commands.hidden.includes(md.name);
    const gcfgHiddenCheck = (!gcfgHidden || gcfgHidden && perms.has(`bypassHidden`));
    const gcfgBotChannelCheck = gcfg.commands.bot_channel_only.includes(md.name);
    const gcfgDisabledCheck = gcfg.commands.disabled.includes(md.name);

    return {
      permCheck,
      forceHiddenCheck,
      devOnlyCheck,
      guildCheck,
      gcfgHiddenCheck,
      gcfgBotChannelCheck,
      gcfgDisabledCheck
    };
  };

  const tryCommand = async (name) => {
    const cmd = Assets.getCommand(name);
    const info = (cmd != null) ? cmdinfo(cmd.metadata) : null;

    const unknownCMD = async () => {
      const ratings = [];
  
      memory.assets.commands.filter((thisCmd) => {
        const infoThisCmd = cmdinfo(thisCmd.metadata);

        return infoThisCmd.permCheck && !infoThisCmd.forceHiddenCheck && !infoThisCmd.devOnlyCheck && infoThisCmd.guildCheck && infoThisCmd.gcfgHiddenCheck && !infoThisCmd.gcfgDisabledCheck;
      }).forEach((thisCmd) => {
        const rating = {
          command: thisCmd.metadata.name,
          alias: null,
          distance: wink(name, thisCmd.metadata.name)
        };

        for (const alias of thisCmd.metadata.aliases) {
          const adist = wink(name, alias);
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
        .setAuthor(`Unknown command.`, await Assets.getIcon(`ICO_info`, bot.cfg.colors.default))
        .setColor(bot.cfg.colors.default);
  
      if (ratings.length > 0 && closest.distance > 0.5) {
        embed.setFooter(`${(closest.distance * 100).toFixed(1)}% match`);
  
        if (closest.alias !== null) {
          embed.setDescription(`Perhaps you meant \`${gcfg.commands.prefixes[0]}${closest.alias}\`? (Alias of \`${gcfg.commands.prefixes[0]}${closest.command}\`)`);
        } else {
          embed.setDescription(`Perhaps you meant \`${gcfg.commands.prefixes[0]}${closest.command}\`?`);
        }
      } else {
        allowRetry = false;
        embed.setDescription(`Type \`${gcfg.commands.prefixes[0]}help\` for a list of commands.`);
      }
  
      const bm = await bot.send(m, { embed, delayControl: true });

      if (!allowRetry) {
        return bm.addControl();
      }

      allowRetry = false;

      const confirmation = await bot.util.confirm(m, bm.msg);

      log(confirmation);

      if (confirmation === `confirm`) {
        tryCommand(closest.command);
        bm.msg.delete();
      } else {
        bm.addControl();
      }
    };
  
    const checkMisuse = async (msg, image) => {
      const embed = await bot.util.err(msg);
  
      let content = ``;
  
      if (image) {
        embed.attachFiles([ new djs.MessageAttachment(image, `image.png`) ])
          .setImage(`attachment://image.png`);
      }
  
      if (cmd.metadata.flags.includes(`DELETE_ON_MISUSE`)) {
        m.delete({ reason: `User misused "${gcfg.commands.prefixes[0]}${cmd.metadata.name}" command.` }).catch(err => {
          bot.util.err(err);
        });

        content = m.author;
      }
  
      bot.send(m, content, { embed });
    };

    if (cmd == null || !cmd.metadata.flags.includes(`NO_LOGGING`)) {
      log([

        (() => {
          // get server name/id
          if (m.channel.type === `dm`) return `SVR: Direct Message`;
          return `SVR: #${m.guild.name} (${m.guild.id})`;
        })(),


        (() => {
          // get channel name/id
          if (m.channel.type === `dm`) return `LOC: Direct Message`;
          return `LOC: #${m.channel.name} (${m.channel.id})`;
        })(),


        `USR: ${m.author.tag} (${m.author.id})`,


        (() => {
          // get input
          if (cmd != null && cmd.metadata.flags.includes(`NO_LOGGING_ARGS`)) return `${gcfg.commands.prefixes[0]}${name} ${input.args.join(` `).replace(/\S/gi, `*`)}`;
    
          return `${gcfg.commands.prefixes[0]}${name} ${input.args.join(` `)}`;
        })()
      ].join(`\n`), `info`);
    }
  
    // command doesnt exist
    // command is not allowed to be used in this server
    if (cmd == null || !info.guildCheck) return unknownCMD();

    if (info.gcfgDisabledCheck) {
      return checkMisuse(`Sorry, this command has been disabled in this server.`);
    }

    if (!info.permCheck || info.devOnlyCheck && m.author.id !== bot.cfg.env.developer) {
      if (info.gcfgHidden) {
        return unknownCMD();
      } else {
        return checkMisuse(`You do not have permission to use this command.`);
      }
    }

    if (!cmd.metadata.dm && m.channel.type === `dm`) {
      return checkMisuse(`This command cannot be used in DMs (Direct Messages).`);
    }

    if (m.channel.type !== `dm`) {
      if (cmd.metadata.flags.includes(`DM_ONLY`)) {
        return checkMisuse(`This command can only be used in DMs (Direct Messages).`, Assets.getImage(`IMG_dm`));
      }
  
      if (info.gcfgBotChannelCheck) {
        // this command is listed in the guild config as bot_channel_only
        if (!perms.has(`bypassChannels`) || cmd.metadata.flags.includes(`STRICT`)) {
          // user does not have the bypasschannels permission
          // this command is strictly bot channel only
          if (!gcfg.channels.bot.some(id => [m.channel.id, m.channel.parentID].includes(id))) {
            // this channel is NOT one of this server's designated bot channels.
            if (cmd.metadata.dm) {
              checkMisuse(`This command can only be used in DMs (Direct Messages) OR bot command channels.`);
            } else {
              checkMisuse(`This command can only be used in bot command channels.`);
            }
  
            return;
          }
        }
      }
  
      if (cmd.metadata.flags.includes(`STAFF_CHANNEL_ONLY`)) {
        if (!perms.has(`*`) || cmd.metadata.flags.includes(`STRICT`)) {
          // user does not have admin or star permission
          // this command is strictly staff channel only
          if (!gcfg.channels.staff.some(id => [m.channel.id, m.channel.parentID].includes(id))) {
            // this channel is NOT one of this server's designated staff-only channels.
            return checkMisuse(`This command can only be used in staff-only channels.`);
          }
        }
      }
    }

    if (!cmd.metadata.flags.includes(`NO_TYPER`)) m.channel.startTyping();

    bot.setTimeout(() => {
      try {
        cmd.exec(m, input.args, { member, perms, input, gcfg });
      }
      catch (err) {
        m.channel.stopTyping();
        bot.util.err(err, { m });
      }
    }, Math.round(bot.ws.ping) + 100);
  };

  tryCommand(input.cmd);
};
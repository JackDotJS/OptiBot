const wink = require(`jaro-winkler`);
const djs = require(`discord.js`);
const Assets = require(`../core/asset_manager.js`);
const memory = require(`../core/memory.js`);

module.exports = async (m, input, gcfg, perms) => {
  const bot = memory.core.client;
  const log = bot.log;

  const member = bot.mainGuild.members.cache.get(m.author.id);

  if (bot.mode === 0 && !perms.has(`bypassCodeMode`)) return;
  if (bot.mode === 1 && !perms.has(`bypassLiteMode`)) return;

  let allowRetry = true;

  const tryCommand = async (name) => {
    const cmd = Assets.getCommand(name);

    const unknownCMD = async () => {
      const ratings = [];
  
      memory.assets.commands.filter((thisCmd) => perms.has(thisCmd.metadata.name) && !thisCmd.metadata.flags[`HIDDEN`] && (thisCmd.metadata.guilds.length === 0 || m.guild != null && thisCmd.metadata.guilds.includes(m.guild.id)))
        .forEach((thisCmd) => {
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
          embed.setDescription(`Perhaps you meant \`${bot.prefix}${closest.alias}\`? (Alias of \`${bot.prefix}${closest.command}\`)`);
        } else {
          embed.setDescription(`Perhaps you meant \`${bot.prefix}${closest.command}\`?`);
        }
      } else {
        allowRetry = false;
        embed.setDescription(`Type \`${bot.prefix}help\` for a list of commands.`);
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
  
      if (cmd.metadata.flags[`DELETE_ON_MISUSE`]) {
        m.delete({ reason: `User misused "${bot.prefix}${cmd.metadata.name}" command.` }).catch(err => {
          bot.util.err(err);
        });

        content = m.author;
      }
  
      bot.send(m, content, { embed });
    };

    if (cmd == null || !cmd.metadata.flags[`NO_LOGGING`]) {
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
          if (cmd != null && cmd.metadata.flags[`NO_LOGGING_ARGS`]) return `${bot.prefix}${name} ${input.args.join(` `).replace(/\S/gi, `*`)}`;
    
          return `${bot.prefix}${name} ${input.args.join(` `)}`;
        })()
      ].join(`\n`), `info`);
    }
  
    if (cmd == null) return unknownCMD();

    if (cmd.metadata.guilds.length > 0 && (m.guild == null || !cmd.metadata.guilds.includes(m.guild.id))) return unknownCMD();

    if ((cmd.metadata.flags[`PERMS_REQUIRED`] || cmd.metadata.flags[`HIDDEN`]) && !perms.has(cmd.metadata.name)) {
      if (cmd.metadata.flags[`HIDDEN`]) {
        return unknownCMD();
      } else {
        return checkMisuse(`You do not have permission to use this command.`);
      }
    }

    if (!cmd.metadata.dm && m.channel.type === `dm`) {
      return checkMisuse(`This command cannot be used in DMs (Direct Messages).`);
    }

    if (cmd.metadata.flags[`DM_ONLY`] && m.channel.type !== `dm`) {
      return checkMisuse(`This command can only be used in DMs (Direct Messages).`, Assets.getImage(`IMG_dm`));
    }

    if (cmd.metadata.flags[`BOT_CHANNEL_ONLY`] && !perms.has(`bypassChannels`)) {
      if (cmd.metadata.dm && m.channel.type !== `dm` && !bot.cfg.channels.bot.some(id => [m.channel.id, m.channel.parentID].includes(id))) {
        return checkMisuse(`This command can only be used in DMs (Direct Messages) OR the #optibot channel.`);
      }

      if (!cmd.metadata.dm && !bot.cfg.channels.bot.some(id => [m.channel.id, m.channel.parentID].includes(id))) {
        return checkMisuse(`This command can only be used in the #optibot channel.`);
      }
    }

    if (cmd.metadata.flags[`STAFF_CHANNEL_ONLY`] && !perms.has(`*`)) {
      if (cmd.metadata.dm && m.channel.type !== `dm` && !bot.cfg.channels.staff.some(id => [m.channel.id, m.channel.parentID].includes(id))) {
        return checkMisuse(`This command can only be used in DMs (Direct Messages) OR any staff-only channel.`);
      }

      if (!cmd.metadata.dm && !bot.cfg.channels.staff.some(id => [m.channel.id, m.channel.parentID].includes(id))) {
        return checkMisuse(`This command can only be used in staff-only channels.`);
      }
    }

    if (!cmd.metadata.flags[`NO_TYPER`]) m.channel.startTyping();

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
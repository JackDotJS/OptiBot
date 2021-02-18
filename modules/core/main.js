/**
 * OptiBot NX - Main Program
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Written by Kyle Edwards <wingedasterisk@gmail.com>, August 2020
 */

if (!process.send) throw new Error(`Cannot run standalone.`);

const util = require(`util`);
const djs = require(`discord.js`);
const ob = require(`./optibot.js`);

const log = ob.log;

const bot = new ob.Client({
  //fetchAllMembers: true,
  presence: {
    status: `idle`,
    activity: {
      type: `WATCHING`,
      name: `assets load 🔄`
    }
  },
  disableMentions: `everyone`
}, parseInt(process.argv[2]), log);

ob.memory.core.logfile = process.argv[3];

bot.util.setWindowTitle(`Connecting...`);

bot.login(bot.keys.discord).catch(err => {
  bot.util.setWindowTitle(`Connection Failed.`);
  log(err, `fatal`);
  process.exit(1);
});

const finalInit = () => {
  if (ob.memory.firstBoot) {
    ob.memory.firstBoot = false;
  } else return;

  bot.util.setWindowTitle(`Loading Assets...`);

  ob.Assets.load().then((time) => {
    const now = new Date();
    const width = 64; //inner width of box
    function centerText(text, totalWidth) {
      text = text.substring(0, totalWidth - 8);

      const leftMargin = Math.floor((totalWidth - (text.length)) / 2);
      const rightMargin = Math.ceil((totalWidth - (text.length)) / 2);

      return `│` + (` `.repeat(leftMargin)) + text + (` `.repeat(rightMargin)) + `│`;
    }

    let splash = ob.memory.assets.splash[~~(Math.random() * ob.memory.assets.splash.length)];

    if (splash.indexOf(`\n`) > -1) {
      splash = splash.substring(splash.lastIndexOf(`\n`) + 1).substring(0, width);
    }

    log(splash, `debug`);

    log([
      `╭${`─`.repeat(width)}╮`,
      centerText(`  `, width),
      centerText(`OptiBot ${bot.version}`, width),
      centerText(`(c) Kyle Edwards <wingedasterisk@gmail.com>, 2020`, width),
      centerText(`  `, width),
      centerText(splash, width),
      centerText(`  `, width),
      centerText(`Finished initialization in ${process.uptime().toFixed(3)} seconds.`, width),
      centerText(`Assets loaded in ${time / 1000} seconds.`, width),
      centerText(`  `, width),
      `╰${`─`.repeat(width)}╯`
    ].join(`\n`), `info`);

    new ob.LogEntry({ time: now, console: false })
      .setColor(bot.cfg.embed.default)
      .setIcon(ob.Assets.getEmoji(`ICO_info`).url)
      .setThumbnail(bot.user.displayAvatarURL({ format: `png` }))
      .setTitle(`OptiBot Initialized`, `OptiBot Initalization Time Report`)
      .setHeader(`Version: ${bot.version}`)
      .setDescription(`Boot Time: ${process.uptime().toFixed(3)} second(s)`)
      .addSection(`Next Scheduled Restart`, bot.exitTime)
      .addSection(`The following message was brought to you by Math.random()®`, {
        data: `\`\`\`${splash}\`\`\``,
        raw: splash
      })
      .submit(`misc`);

    process.send({
      t: `OB_READY`
    });

    bot.setBotStatus(1);
    bot.util.setWindowTitle(null);
  }).catch(err => {
    bot.util.err(err);
    bot.exit(1);
  });
};

////////////////////////////////////////
// Bot Ready
////////////////////////////////////////

bot.on(`ready`, () => {
  log(`Successfully connected to Discord.`, `info`);

  log(ob.memory.core);

  if (!bot.mainGuild.available) {
    bot.util.setWindowTitle(`Waiting for primary guild...`);
    return log(`Primary guild unavailable.\nAssets will be loaded once the guild is available again.`, `warn`);
  }

  finalInit();
});

////////////////////////////////////////
// Node.js Parent Node Message
////////////////////////////////////////

process.on(`message`, (data) => {
  if (data == null || data.constructor !== Object || data.t == null) {
    return log(util.inspect(data));
  }

  switch (data.t) {
    case `BM_CRASHLOG`:
      log(`got crash data`);

      const channel = bot.guilds.cache.get(bot.cfg.guilds.log).channels.cache.get(bot.cfg.channels.log.misc);

      channel.send(
        `<@&752056938753425488> ${(bot.cfg.envDeveloper != null) ? `<@${bot.cfg.envDeveloper}>` : ``} oops lmao`,
        new djs.MessageAttachment(Buffer.from(data.c), `optibot_crash_log.txt`)
      ).catch(err => {
        bot.util.err(err);

        channel.send([
          `<@&752056938753425488> ${(bot.cfg.envDeveloper != null) ? `<@${bot.cfg.envDeveloper}>` : ``} oops lmao`,
          ``,
          `Failed to send crash log:`,
          `\`\`\`\n${err.stack}\`\`\``
        ].join(`\n`));
      });
      break;
    case `BM_RESTART`:
      log(`got restart data`);
      bot.guilds.cache.get(data.c.guild).channels.cache.get(data.c.channel).messages.fetch(data.c.message).then(msg => {
        const embed = new djs.MessageEmbed()
          .setAuthor(`Restarted in ${((new Date().getTime() - msg.createdTimestamp) / 1000).toFixed(1)} seconds.`, ob.Assets.getEmoji(`ICO_okay`).url)
          .setColor(bot.cfg.embed.okay);

        msg.edit({ embed: embed }).then(msgF => {
          bot.util.afterSend(msgF, data.c.author);
        });
      }).catch(err => {
        bot.util.err(err);
      });
      break;
    case `BM_CLI_INPUT`:
      // todo
      break;
  }
});

////////////////////////////////////////
// Guild Unavailable
////////////////////////////////////////

bot.on(`guildUnavailable`, guild => log(`Guild Unavailable! \nUnable to connect to "${guild.name}" \nGuild ID: ${guild.id}`, `warn`));

////////////////////////////////////////
// Guild Update
////////////////////////////////////////

bot.on(`guildUpdate`, (oldg, newg) => {
  if (!oldg.available && newg.available) {
    log(`Guild available! \n"${newg.name}" has recovered. \nGuild ID: ${newg.id}`, `warn`);
    if (newg.id === bot.cfg.guilds.optifine) {
      finalInit();
    }
  }
});

////////////////////////////////////////
// DJS Logs
////////////////////////////////////////

bot.on(`warn`, info => log(info, `warn`));

bot.on(`debug`, info => log(info));

bot.on(`error`, err => log(err.stack || err, `error`));
if (!process.send) throw new Error(`Cannot run standalone.`);

const util = require(`util`);
const djs = require(`discord.js`);
const vb = require(`./modules.js`);

const log = vb.log;

const bot = new vb.Client({
  messageCacheLifetime: 3600,
  messageSweepInterval: 600,
  messageCacheMaxSize: 100,
  messageEditHistoryMaxSize: 3,
  presence: {
    status: `idle`,
    activity: {
      type: `WATCHING`,
      name: `assets load 🔄`
    }
  },
  disableMentions: `everyone`
}, {
  // vector bot options
  mode: parseInt(process.argv[2]),
  log
});

vb.memory.core.logfile = process.argv[3];

bot.util.setWindowTitle(`Connecting...`);

bot.login(bot.keys.discord).catch(err => {
  bot.util.setWindowTitle(`Connection Failed.`);
  log(err, `fatal`);

  log(`Failed to connect to Discord API. Shutting down in 5 minutes...`); // gives some time for the API to be restored

  setTimeout(() => {
    process.exit(1);
  }, (1000 * 60 * 5));
});

const finalInit = () => {
  if (!bot.firstBoot) return;

  bot.util.setWindowTitle(`Loading Assets...`);

  vb.Assets.load().then(async (time) => {
    bot.firstBoot = false;

    const width = 64; //inner width of box

    const mkbox = (text, totalWidth) => {
      const fstr = [];
      const normalized = [];

      for (const line of text.split(`\n`)) {
        if (line.length > (width - 4)) {
          normalized.push(
            ...line.match(new RegExp(`.{1,${(width - 4)}}`, `g`))
          );
        } else {
          normalized.push(line);
        }
      }

      fstr.push(`╭${`─`.repeat(width)}╮`);

      for (const line of normalized) {
        const leftMargin = Math.floor((totalWidth - (line.length)) / 2);
        const rightMargin = Math.ceil((totalWidth - (line.length)) / 2);

        fstr.push(`│${` `.repeat(leftMargin)}${line}${` `.repeat(rightMargin)}│`);
      }

      fstr.push(`╰${`─`.repeat(width)}╯`);

      return fstr.join(`\n`);
    };

    log(mkbox([
      `Vector ${bot.version}`,
      `https://github.com/JackDotJS/vector-bot`,
      ``,
      `Finished initialization in ~${process.uptime().toFixed(3)} seconds.`,
      `Assets loaded in ${time / 1000} seconds.`
    ].join(`\n`), width), `info`);

    /* new vb.LogEntry({ console: false })
      .setColor(bot.cfg.colors.default)
      .setIcon(await vb.Assets.getIcon(`ICO_info`, bot.cfg.colors.default))
      .setThumbnail(bot.user.displayAvatarURL({ format: `png` }))
      .setTitle(`Vector Initialized`, `Vector Initalization Time Report`)
      .setHeader(`Version: ${bot.version}`)
      .setDescription(`Boot Time: ${process.uptime().toFixed(3)} second(s)`)
      .addSection(`Next Scheduled Restart`, bot.exitTime)
      .submit(bot.cfg.env.logID); */

    process.send({
      t: `APP_READY`
    });

    bot.setStatus(`ONLINE`);
    bot.available = true;
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

      const channel = bot.channels.cache.get(bot.cfg.channels.log.misc);

      channel.send(
        `<@&752056938753425488> ${(bot.cfg.dev != null) ? `<@${bot.cfg.dev.devID}>` : ``} oops lmao`,
        new djs.MessageAttachment(Buffer.from(data.c), `vector_crash_log.txt`)
      ).catch(err => {
        bot.util.err(err);

        channel.send([
          `<@&752056938753425488> ${(bot.cfg.dev != null) ? `<@${bot.cfg.dev.devID}>` : ``} oops lmao`,
          ``,
          `Failed to send crash log:`,
          `\`\`\`\n${err.stack}\`\`\``
        ].join(`\n`));
      });
      break;
    case `BM_RESTART`:
      log(`got restart data`);
      bot.guilds.cache.get(data.c.guild).channels.cache.get(data.c.channel).messages.fetch(data.c.message).then(async msg => {
        const embed = new djs.MessageEmbed()
          .setAuthor(`Restarted in ${((new Date().getTime() - msg.createdTimestamp) / 1000).toFixed(1)} seconds.`, await vb.Assets.getIcon(`ICO_check`, bot.cfg.colors.okay))
          .setColor(bot.cfg.colors.okay);

        msg.edit({ embed: embed });
      }).catch(bot.util.err);
      break;
    case `BM_CLI_INPUT`:
      // todo
      break;
  }
});

////////////////////////////////////////
// Guild Unavailable
////////////////////////////////////////

bot.on(`guildUnavailable`, guild => {
  log(`Guild Unavailable! \nUnable to connect to "${guild.name}" \nGuild ID: ${guild.id}`, `warn`);

  if (guild.id === bot.mainGuild.id) {
    bot.util.setWindowTitle(`Waiting for primary guild...`);
    bot.available = false;
    bot.setStatus(`UNAVAILABLE`);
  }
});

////////////////////////////////////////
// Guild Update
////////////////////////////////////////

bot.on(`guildUpdate`, (oldg, newg) => {
  if (!oldg.available && newg.available) {
    log(`Guild available! \n"${newg.name}" has recovered. \nGuild ID: ${newg.id}`, `warn`);

    if (newg.id === bot.mainGuild.id) {
      if (bot.firstBoot) return finalInit();
      
      bot.available = true;
      bot.setStatus(`ONLINE`);
    }
  }
});

////////////////////////////////////////
// DJS Logs
////////////////////////////////////////

bot.on(`warn`, info => log(info, `warn`));

bot.on(`debug`, info => log(info));

bot.on(`error`, err => log(err.stack || err, `error`));
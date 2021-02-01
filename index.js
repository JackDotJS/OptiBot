/**
 * OptiBot NX - Main Program
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Written by Kyle Edwards <wingedasterisk@gmail.com>, August 2020
 */

if (!process.send) throw new Error('Cannot run standalone.');

const cid = require('caller-id');
const { readdirSync } = require('fs');
const util = require('util');
const djs = require('discord.js');
const ob = require('./modules/core/optibot.js');

const log = ob.log;

const bot = new ob.Client({
  //fetchAllMembers: true, // end my life
  presence: {
    status: 'idle',
    activity: {
      type: 'WATCHING',
      name: 'assets load 🔄'
    }
  },
  disableMentions: 'everyone'
}, parseInt(process.argv[2]), log);

ob.memory.core.logfile = process.argv[3];

bot.util.setWindowTitle('Connecting...');

bot.login(bot.keys.discord).catch(err => {
  bot.util.setWindowTitle('Connection Failed.');
  log(err, 'fatal');
  process.exit(1);
});

////////////////////////////////////////
// Bot Ready
////////////////////////////////////////

bot.on('ready', () => {
  log(`Successfully connected to Discord.`, `info`);

  if (ob.memory.firstBoot) {
    ob.memory.firstBoot = false;

    // Load all of the bot events

    log(`Loading event handlers...`);

    /* readdirSync('./modules/events/').forEach(async file => {
      const name = file.split('.')[0];
      const event = require(`./modules/events/${file}`);
      bot.on(name, event.bind(null, bot));
      log(`Loaded event handler: ${name}`);
    }); */
  }
});

////////////////////////////////////////
// Node.js Parent Node Message
////////////////////////////////////////

process.on('message', (m) => {
  if (m.crashlog) {
    log('got crash data');
    bot.guilds.cache.get(bot.cfg.guilds.log).channels.cache.get(bot.cfg.channels.log.misc)
      .send(`<@&752056938753425488> ${(bot.cfg.envDeveloper != null) ? `<@${bot.cfg.envDeveloper}>` : ''} oops lmao`, new djs.MessageAttachment(Buffer.from(m.crashlog), 'optibot_crash_log.txt'))
      .catch(err => {
        bot.util.err(err);
      });
  } else if (m.restart) {
    log('got restart data');
    bot.guilds.cache.get(m.restart.guild).channels.cache.get(m.restart.channel).messages.fetch(m.restart.message).then(msg => {
      const embed = new djs.MessageEmbed()
        .setAuthor(`Restarted in ${((new Date().getTime() - msg.createdTimestamp) / 1000).toFixed(1)} seconds.`, ob.Assets.getEmoji('ICO_okay').url)
        .setColor(bot.cfg.embed.okay);

      msg.edit({ embed: embed }).then(msgF => {
        bot.util.afterSend(msgF, m.author);
      });
    }).catch(err => {
      bot.util.err(err);
    });
  }
});

bot.on('guildUnavailable', guild => log(`Guild Unavailable! \nUnable to connect to "${guild.name}" \nGuild ID: ${guild.id}`, 'warn'));

bot.on('warn', info => log(info, 'warn'));

bot.on('debug', info => log(info, 'debug'));

bot.on('error', err => log(err.stack || err, 'error'));

////////////////////////////////////////
// Guild Member Chunk Received
////////////////////////////////////////

bot.on('guildMembersChunk', (members, guild) => log(`Guild member chunk received. \nSize: ${members.size}\nGuild: ${guild.name} (${guild.id})`, 'debug'));
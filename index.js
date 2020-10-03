/**
 * OptiBot NX - Main Program
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Written by Kyle Edwards <wingedasterisk@gmail.com>, August 2020
 */

if (!process.send) throw new Error('Cannot run standalone. Please use the "init.bat" file.');

const cid = require('caller-id');
const util = require('util');
const djs = require('discord.js');
const ob = require('./modules/core/OptiBot.js');

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

ob.Memory.core.logfile = process.argv[3];

ob.OBUtil.setWindowTitle('Connecting...');

bot.login(bot.keys.discord).catch(err => {
  ob.OBUtil.setWindowTitle('Connection Failed.');
  log(err, 'fatal');
  process.exit(1);
});

const { readdirSync } = require('fs');
// Load all of the bot events
const evtFiles = readdirSync('./events/');
log(`Loading a total of ${evtFiles.length} events.`);
evtFiles.forEach(async file => {
  const eventName = file.split('.')[0];
  const event = require(`./events/${file}`);
  bot.on(eventName, event.bind(null, bot));
  await log(`Loaded ${eventName} event`);
});

////////////////////////////////////////
// Node.js Parent Node Message
////////////////////////////////////////

process.on('message', (m) => {
  if (m.crashlog) {
    log('got crash data');
    bot.guilds.get(bot.cfg.guilds.log).channels.cache.get(bot.cfg.channels.log.misc)
      .send(`<@181214529340833792> **=== OptiBot Crash Recovery Report ===**`, new djs.MessageAttachment(`./logs/${m.crashlog}`))
      .catch(err => {
        ob.OBUtil.err(err);
      });
  } else if (m.restart) {
    log('got restart data');
    bot.guilds.cache.get(m.restart.guild).channels.cache.get(m.restart.channel).messages.fetch(m.restart.message).then(msg => {
      const embed = new djs.MessageEmbed()
        .setAuthor(`Restarted in ${((new Date().getTime() - msg.createdTimestamp) / 1000).toFixed(1)} seconds.`, ob.Assets.getEmoji('ICO_okay').url)
        .setColor(bot.cfg.embed.okay);

      msg.edit({ embed: embed }).then(msgF => {
        ob.OBUtil.afterSend(msgF, m.author);
      });
    }).catch(err => {
      ob.OBUtil.err(err);
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
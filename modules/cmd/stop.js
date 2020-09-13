const path = require('path');
const djs = require('discord.js');
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  short_desc: 'Shut down OptiBot.',
  authlvl: 4,
  flags: ['NO_DM', 'NO_TYPER'],
  run: null
};

metadata.run = (m, args, data) => {
  const logEntry = new LogEntry()
    .setColor(bot.cfg.embed.default)
    .setIcon(Assets.getEmoji('ICO_door').url)
    .setTitle('OptiBot is now shutting down...', 'OptiBot Exit Report')
    .addSection('Command Issuer', m.author)
    .submit().then(() => {
      const embed = new djs.MessageEmbed()
        .setAuthor('Shutting down. Goodbye!', Assets.getEmoji('ICO_door').url)
        .setColor(bot.cfg.embed.default);

      m.channel.send({embed: embed}).then(() => {
        bot.exit();
      });
    });
};

module.exports = new Command(metadata);
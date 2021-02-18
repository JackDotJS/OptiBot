const path = require('path');
const djs = require('discord.js');
const { Command, memory, LogEntry, Assets } = require('../core/optibot.js');

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  short_desc: 'Shut down OptiBot.',
  authlvl: 4,
  flags: ['NO_DM', 'NO_TYPER', 'LITE'],
  run: null
};

metadata.run = m => {
  new LogEntry()
    .setColor(bot.cfg.embed.default)
    .setIcon(Assets.getEmoji('ICO_door').url)
    .setTitle('OptiBot is now shutting down...', 'OptiBot Exit Report')
    .addSection('Command Issuer', m.author)
    .submit().then(() => {
      const embed = new djs.MessageEmbed()
        .setAuthor('Shutting down. Goodbye!', Assets.getEmoji('ICO_door').url)
        .setColor(bot.cfg.embed.default);

      m.channel.send(embed).then(() => {
        bot.exit();
      });
    });
};

module.exports = new Command(metadata);
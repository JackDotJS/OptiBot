const path = require('path');
const djs = require('discord.js');
const { Command, memory, LogEntry, Assets } = require('../core/optibot.js');

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  short_desc: 'Force update OptiBot',
  authlvl: 4,
  flags: ['NO_DM', 'NO_TYPER', 'IGNORE_ELEVATED', 'LITE'],
  run: null
};

metadata.run = (m) => {
  if (bot.mode === 0) {
    return bot.util.err('This command cannot be used in mode 0.', { m });
  }

  const embed = new djs.MessageEmbed()
    .setAuthor('Are you sure?', Assets.getEmoji('ICO_warn').url)
    .setColor(bot.cfg.embed.default)
    .setDescription('OptiBot will be forcefully updated to the latest version available on GitHub');

  m.channel.send(embed).then(msg => {
    bot.util.confirm(m, msg).then(res => {
      if (res === 1) {
        new LogEntry()
          .setColor(bot.cfg.embed.default)
          .setIcon(Assets.getEmoji('ICO_door').url)
          .setTitle('OptiBot is being updated...', 'OptiBot Force Update Report')
          .addSection('Command Issuer', m.author)
          .submit().then(() => {
            const embed = new djs.MessageEmbed()
              .setAuthor('Updating. See you soon!', Assets.getEmoji('ICO_door').url)
              .setColor(bot.cfg.embed.default);

            msg.edit({ embed: embed }).then(() => {
              bot.exit(17);
            });
          }).catch(err => {
            bot.util.err(err, { m });
          });
      } else if (res === 0) {
        const update = new djs.MessageEmbed()
          .setAuthor('Cancelled', Assets.getEmoji('ICO_load').url)
          .setColor(bot.cfg.embed.default)
          .setDescription('OptiBot has not been updated.');

        msg.edit({ embed: update }).then(msg => { bot.util.afterSend(msg, m.author.id); });
      } else {
        const update = new djs.MessageEmbed()
          .setAuthor('Timed out', Assets.getEmoji('ICO_load').url)
          .setColor(bot.cfg.embed.default)
          .setDescription('Sorry, you didn\'t respond in time. Please try again.');

        msg.edit({ embed: update }).then(msg => { bot.util.afterSend(msg, m.author.id); });
      }
    }).catch(err => {
      bot.util.err(err, { m });
    });
  });
};

module.exports = new Command(metadata);
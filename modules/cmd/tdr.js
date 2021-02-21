const path = require('path');
const djs = require('discord.js');
const { Command, memory, Assets } = require('../core/optibot.js');

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  aliases: ['togglecolor', 'dc'],
  short_desc: 'Toggle donator role color.',
  long_desc: `Toggles the donator role color. Useful if you have any special "creator" role.\n\n**You must already be a verified donator to use this command.** Type \`${bot.prefix}help dr\` for details.`,
  authlvl: 0,
  image: 'IMG_token',
  flags: ['DM_OPTIONAL', 'NO_TYPER', 'LITE', 'BOT_CHANNEL_ONLY'],
  run: null
};

metadata.run = (m, args, data) => {
  if (!data.member.roles.cache.has(bot.cfg.roles.donator)) return bot.util.err('You are not a verified donator.', { m });

  // has donator
  if (data.member.roles.cache.has(bot.cfg.roles.donatorColor)) {
    data.member.roles.remove(bot.cfg.roles.donatorColor, 'Color toggled by user.').then(() => {
      const embed = new djs.MessageEmbed()
        .setColor(bot.cfg.embed.okay)
        .setAuthor('Donator color disabled.', Assets.getEmoji('ICO_okay').url);

      bot.send(m, { embed });
    });
  } else {
    data.member.roles.add(bot.cfg.roles.donatorColor, 'Color toggled by user.').then(() => {
      const embed = new djs.MessageEmbed()
        .setColor(bot.cfg.embed.okay)
        .setAuthor('Donator color enabled.', Assets.getEmoji('ICO_okay').url);

      bot.send(m, { embed });
    });
  }

};

module.exports = new Command(metadata);
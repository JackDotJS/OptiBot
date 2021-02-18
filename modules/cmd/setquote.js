const path = require('path');
const djs = require('discord.js');
const { Command, memory, Assets } = require('../core/optibot.js');

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  short_desc: 'Update or add a quote to your profile.',
  args: '<text>',
  authlvl: 0,
  flags: ['DM_OPTIONAL', 'NO_TYPER', 'BOT_CHANNEL_ONLY'],
  run: null
};

metadata.run = (m, args, data) => {
  if (!args[0]) return bot.util.missingArgs(m, metadata);

  if (m.content.substring(`${bot.prefix}${data.input.cmd} `.length).length > 256) {
    bot.util.err('Message cannot exceed 256 characters in length.', { m });
  } else {
    bot.util.getProfile(m.author.id, true).then(profile => {
      const lines = m.content.substring(`${bot.prefix}${data.input.cmd} `.length).replace(/\>/g, '\\>').split('\n'); // eslint-disable-line no-useless-escape
      const quote = [];

      for (const line of lines) {
        quote.push(line.trim());
      }

      profile.ndata.quote = djs.Util.escapeCodeBlock(quote.join(' '));

      bot.util.updateProfile(profile).then(() => {
        const embed = new djs.MessageEmbed()
          .setAuthor('Your profile has been updated', Assets.getEmoji('ICO_okay').url)
          .setColor(bot.cfg.embed.okay);

        m.channel.send(embed).then(msg => { bot.util.afterSend(msg, m.author.id); });
      }).catch(err => {
        bot.util.err(err, { m });
      });
    }).catch(err => {
      bot.util.err(err, { m });
    });
  }
};

module.exports = new Command(metadata);
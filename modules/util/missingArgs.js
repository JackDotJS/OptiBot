const Memory = require('../core/OptiBotMemory.js');
const djs = require('discord.js');
const Assets = require('../core/OptiBotAssetsManager.js');
const Command = require('../core/OptiBotCommand.js');
const OptiBotUtilities = require('../core/OptiBotUtil');

const bot = Memory.core.client;

module.exports = (m, metadata) => {
  const embed = new djs.MessageEmbed()
    .setAuthor('Missing Arguments', Assets.getEmoji('ICO_warn').url)
    .setColor(bot.cfg.embed.default)
    .addField('Usage', Command.parseMetadata(metadata).args);

  m.channel.send(embed).then(bm => OptiBotUtilities.afterSend(bm, m.author.id));
};
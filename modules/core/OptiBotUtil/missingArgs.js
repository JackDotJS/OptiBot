const Memory = require('../OptiBotMemory.js');
const djs = require('discord.js');
const Assets = require('../OptiBotAssetsManager.js');
const Command = require('../OptiBotCommand.js');
const OptiBotUtilities = require('../OptiBotUtil');

module.exports = (m, metadata) => {
  const bot = Memory.core.client;

  const embed = new djs.MessageEmbed()
    .setAuthor('Missing Arguments', Assets.getEmoji('ICO_warn').url)
    .setColor(bot.cfg.embed.default)
    .addField('Usage', Command.parseMetadata(metadata).args);

  m.channel.send({ embed: embed }).then(bm => OptiBotUtilities.afterSend(bm, m.author.id));
};
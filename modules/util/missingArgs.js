const Memory = require('../core/OptiBotMemory.js');
const djs = require('discord.js');
const Assets = require('../core/OptiBotAssetsManager.js');
const Command = require('../core/OptiBotCommand.js');
const afterSend = require('./afterSend.js');

module.exports = (m, metadata) => {
  const bot = Memory.core.client;

  const md = Command.parseMetadata(metadata);

  const embed = new djs.MessageEmbed()
    .setAuthor('Missing Arguments', Assets.getEmoji('ICO_warn').url)
    .setColor(bot.cfg.embed.default)
    .addField('Usage', md.args)
    .setFooter(`For more information, use \`${bot.prefix}help ${md.name}\``);

  m.channel.send(embed).then(bm => afterSend(bm, m.author.id));
};
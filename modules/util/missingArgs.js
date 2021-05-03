const Memory = require(`../core/memory.js`);
const djs = require(`discord.js`);
const Assets = require(`../core/asset_manager.js`);
const Command = require(`../core/command.js`);

module.exports = (m, metadata) => {
  const bot = Memory.core.client;

  const md = Command.parseMetadata(metadata);

  const embed = new djs.MessageEmbed()
    .setAuthor(`Missing Arguments`, Assets.getEmoji(`ICO_warn`).url)
    .setColor(bot.cfg.colors.default)
    .addField(`Usage`, `${md.args} \nFor more information, use \`${bot.prefix}help ${md.name}\``);

  bot.send(m, { embed });
};
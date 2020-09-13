const path = require('path');
const util = require('util');
const djs = require('discord.js');
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  // aliases: ['aliases'],
  short_desc: `Short description. Shows in \`${bot.prefix}list\``,
  long_desc: `Long description. Shows in \`${bot.prefix}help\` and tooltips in \`${bot.prefix}list\``,
  args: '[args]',
  image: 'IMG_args',
  authlvl: 5,
  flags: ['DM_OPTIONAL', 'NO_TYPER', 'HIDDEN'],
  run: null
};

metadata.run = (m, args, data) => {
  const embed = new djs.MessageEmbed()
    .setAuthor('Example MessageEmbed')
    .setColor(bot.cfg.embed.default);

  m.channel.send({embed: embed}).then(bm => OBUtil.afterSend(bm, m.author.id));
};

module.exports = new Command(metadata);
/* eslint-disable */
// REMEMBER TO REMOVE THIS LINE WHEN COPYING THIS FILE
const path = require('path');
const util = require('util');
const djs = require('discord.js');
const { Command, memory, RecordEntry, LogEntry, Assets } = require('../core/optibot.js');

const bot = memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  // aliases: ['aliases'],
  short_desc: `Short description. Shows when viewed with \` ${bot.prefix}list \``,
  long_desc: `Long description. Shows when using \` ${bot.prefix}help ${path.parse(__filename).name} \` and tooltips in \` ${bot.prefix}list \``,
  args: '[args]',
  image: 'IMG_args',
  authlvl: 5,
  flags: ['DM_OPTIONAL', 'NO_TYPER', 'HIDDEN', 'LITE'],
  run: null
};

metadata.run = (m, args, data) => {
  const embed = new djs.MessageEmbed()
    .setAuthor('Example MessageEmbed')
    .setColor(bot.cfg.embed.default);

  m.channel.send({embed: embed}).then(bm => bot.util.afterSend(bm, m.author.id));
};

module.exports = new Command(metadata);
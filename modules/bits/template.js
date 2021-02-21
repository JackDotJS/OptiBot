/* eslint-disable */
// REMEMBER TO REMOVE THESE LINES WHEN COPYING FILE

const path = require('path');
const util = require('util');
const djs = require('discord.js');
const { OptiBit, memory, RecordEntry, LogEntry, Assets } = require('../core/optibot.js');

const bot = memory.core.client;
const log = bot.log;

const metadata = {
  name: 'Template',
  description: 'Description.',
  usage: 'Usage Example?',
  image: 'IMG_args',
  priority: -1,
  concurrent: false,
  authlvl: 1000,
  flags: ['DM_OPTIONAL', 'HIDDEN'],
  validator: null,
  executable: null
};

metadata.validator = (m, member, authlvl) => {
  return m.content.match(/examplebit/i);
};

metadata.executable = (m, member, authlvl) => {
  const embed = new djs.MessageEmbed()
    .setAuthor('Example MessageEmbed')
    .setColor(bot.cfg.embed.default);

  bot.send(m, { embed });
};

module.exports = new OptiBit(metadata);
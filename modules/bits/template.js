const path = require('path');
const util = require('util');
const djs = require('discord.js');
const { OptiBit, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
  name: 'Template',
  description: 'Description.',
  usage: 'Usage Example?',
  image: 'IMG_args',
  priority: -1,
  concurrent: false,
  authlvl: 999,
  flags: ['DM_OPTIONAL', 'HIDDEN'],
  validator: null,
  run: null
};

metadata.validator = (m, member, authlvl) => {
  return m.content.match(/examplebit/i);
};

metadata.executable = (m, member, authlvl) => {
  const embed = new djs.MessageEmbed()
    .setAuthor('Example MessageEmbed')
    .setColor(bot.cfg.embed.default);

  m.channel.send({ embed }).then(bm => OBUtil.afterSend(bm, m.author.id));
};

module.exports = new OptiBit(metadata);
const path = require('path');
const util = require('util');
const djs = require('discord.js');
const { OptiBit, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
  name: 'Bot Mention Reactor',
  description: 'Description.',
  priority: 0,
  concurrent: true,
  authlvl: 0,
  flags: ['DM_OPTIONAL', 'HIDDEN'],
  validator: null,
  run: null
};

metadata.validator = (m, member, authlvl) => {
  return m.mentions.has(bot.user);
};

metadata.executable = (m, member, authlvl) => {
  m.react(bot.mainGuild.emojis.cache.get('663409134644887572'));
};

module.exports = new OptiBit(metadata);
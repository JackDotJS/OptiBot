const path = require('path');
const util = require('util');
const djs = require('discord.js');
const { OptiBit, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
  name: 'F in the chat',
  description: 'Description.',
  usage: 'Self-explanatory.',
  priority: 0,
  concurrent: false,
  authlvl: 0,
  flags: ['DM_OPTIONAL', 'HIDDEN'],
  validator: null,
  run: null
};

metadata.validator = (m, member, authlvl) => {
  return (m.content.toLowerCase().trim() === 'f');
};

metadata.executable = (m, member, authlvl) => {
  m.react('🇫').catch((err) => {
    OBUtil.err(err);
  });
};

module.exports = new OptiBit(metadata);
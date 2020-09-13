const { OptiBit, Memory } = require('../core/OptiBot.js');

const bot = Memory.core.client;

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

metadata.validator = m => m.mentions.has(bot.user);

metadata.executable = m => m.react(bot.mainGuild.emojis.cache.get('663409134644887572'));

module.exports = new OptiBit(metadata);
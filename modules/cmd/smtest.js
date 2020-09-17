const path = require('path');
const { Command, Memory } = require('../core/OptiBot.js');

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  short_desc: `Short description. Shows in \`${bot.prefix}list\``,
  long_desc: `Long description. Shows in \`${bot.prefix}help\` and tooltips in \`${bot.prefix}list\``,
  args: '[args]',
  authlvl: 5,
  flags: ['DM_OPTIONAL', 'NO_TYPER', 'HIDDEN'],
  run: null
};

metadata.run = m => {
  const channels = [...bot.guilds.cache.get(bot.cfg.guilds.optifine).channels.cache.values()].filter((c) => c.type === 'text').sort((a, b) => a.rawPosition - b.rawPosition);
  const lines = [];

  for (const i in channels) {
    const channel = channels[i];

    let str = `#${channel.name} (${channel.id})`;

    if (bot.cfg.channels.bot.some(id => [channel.id, channel.parentID].includes(id))) {

      str += '\n- bot channel';
    }

    if (bot.cfg.channels.mod.some(id => [channel.id, channel.parentID].includes(id))) {
      str += '\n- mod channel';
    }

    if (bot.cfg.channels.blacklist.some(id => [channel.id, channel.parentID].includes(id))) {
      str += '\n- blacklisted';
    }

    if (bot.cfg.channels.nomodify.some(id => [channel.id, channel.parentID].includes(id))) {
      str += '\n- no modification';
    }

    if (str === `#${channel.name} (${channel.id})`) {
      str += '\n-';
    }

    str += '\n';

    lines.push(str);

    if (parseInt(i) + 1 >= channels.length) {
      log(lines.join('\n'), 'info');
      m.channel.send('channels perms calculated');
    }
  }
};

module.exports = new Command(metadata);
const path = require('path');
const util = require('util');
const djs = require('discord.js');
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  short_desc: `Short description. Shows in \`${bot.prefix}list\``,
  long_desc: `Long description. Shows in \`${bot.prefix}help\` and tooltips in \`${bot.prefix}list\``,
  args: '[args]',
  image: 'IMG_args',
  authlvl: 5,
  flags: ['DM_OPTIONAL', 'NO_TYPER', 'HIDDEN'],
  run: null
};

metadata.run = (m, args, data) => {
  const logEntry = new LogEntry()
    .setColor(bot.cfg.embed.default)
    .setIcon(Assets.getEmoji('ICO_load').url)
    .setTitle('Embed Title', 'Report Title')
    .setHeader('Embed Header', 'Plaintext Header')
    .setDescription('Embed Description', 'Plaintext Description')
    .addSection('Section 1 Title', {
      data: 'Section 1 Embed Content',
      raw: 'Section 1 Plaintext Content'
    })
    .addSection('Section 2 Title', {
      data: 'Section 2 Embed Content',
      raw: 'Section 2 Plaintext Content'
    })
    .submit();
};

module.exports = new Command(metadata);
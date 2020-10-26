const path = require('path');
const { Command, Memory } = require('../core/OptiBot.js');

const bot = Memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  short_desc: `Short description. Shows when viewed with \` ${bot.prefix}list \``,
  long_desc: `Long description. Shows when using \` ${bot.prefix}help ${path.parse(__filename).name} \` and tooltips in \` ${bot.prefix}list \``,
  args: '[args]',
  image: 'IMG_args',
  authlvl: 5,
  flags: ['DM_OPTIONAL', 'NO_TYPER', 'HIDDEN', 'LITE'],
  run: null
};

metadata.run = () => {
  process.exit(1); // big brain moment
};

module.exports = new Command(metadata);
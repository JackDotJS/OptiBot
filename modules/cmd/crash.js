const path = require('path');
const { Command } = require('../core/optibot.js');

const metadata = {
  name: path.parse(__filename).name,
  short_desc: `This kills the bot.`,
  authlvl: 5,
  flags: ['DM_OPTIONAL', 'NO_TYPER', 'HIDDEN', 'LITE'],
  run: null
};

metadata.run = () => {
  process.exit(1); // big brain moment
};

module.exports = new Command(metadata);
const path = require('path');
const { Command, OBUtil } = require('../core/OptiBot.js');

const metadata = {
  name: path.parse(__filename).name,
  //aliases: ['fixjar'],
  authlvl: 5,
  flags: ['DM_OPTIONAL', 'NO_TYPER'],
  run: null
};

metadata.run = (m, args) => m.channel.send(OBUtil.calculatePoints(parseInt(args[0]), parseInt(args[1])));

module.exports = new Command(metadata);
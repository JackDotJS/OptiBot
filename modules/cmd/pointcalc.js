const path = require('path');
const djs = require('discord.js');
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  //aliases: ['fixjar'],
  authlvl: 5,
  flags: ['DM_OPTIONAL', 'NO_TYPER'],
  run: null
};

metadata.run = (m, args, data) => {
  m.channel.send(OBUtil.calculatePoints(parseInt(args[0]), parseInt(args[1])));
};

module.exports = new Command(metadata);
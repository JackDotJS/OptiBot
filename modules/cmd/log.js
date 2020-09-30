const path = require('path');
const fs = require('fs');
const djs = require('discord.js');
const AZip = require('adm-zip');
const { Command, OBUtil, Memory } = require('../core/OptiBot.js');

const metadata = {
  name: path.parse(__filename).name,
  aliases: ['logs'],
  short_desc: 'Download OptiBot log(s).',
  long_desc: 'Downloads the latest log file(s) that OptiBot has generated. The "bulk" argument will default to loading 5 log files unless otherwise specified.',
  args: [
    '',
    'bulk [amount|all]'
  ],
  /* todo
  args: [
    '[amount]',
    'all'
  ], */
  authlvl: 5,
  flags: ['DM_OPTIONAL', 'MOD_CHANNEL_ONLY', 'LITE'],
  run: null
};

metadata.run = (m, args) => {
  if (args[0] && args[0] === 'bulk') {
    const logs = fs.readdirSync('./logs');
    logs.sort((a, b) => {
      // TODO: change this to normal stat.
      // statSync is blocking, i.e. when this command is run, nothing else on the bot is getting done.
      return fs.statSync('./logs/' + a).mtime.getTime() - fs.statSync('./logs/' + b).mtime.getTime();
    });
    logs.reverse();

    let count = 5;
    const zip = new AZip();

    if (args[1] && args[1] === 'all') {
      count = logs.length;
    } else if (Number.isInteger(parseInt(args[1])) && parseInt(args[1]) > 0) {
      count = parseInt(args[1]);
    }

    for (let i = 0; i < logs.length; i++) {
      const file = logs[i];
      zip.addLocalFile(`./logs/${file}`);

      if (i + 1 === count) break;
    }

    m.channel.send(new djs.MessageAttachment(zip.toBuffer(), 'logs.zip')).then(bm => OBUtil.afterSend(bm, m.author.id));
  } else {
    m.channel.send(new djs.MessageAttachment(`./logs/${Memory.core.logfile}.log`)).then(bm => OBUtil.afterSend(bm, m.author.id));
  }
};

module.exports = new Command(metadata);
const path = require('path');
const fs = require('fs');
const djs = require('discord.js');
const AZip = require('adm-zip');
const { Command, OBUtil, Memory } = require('../core/OptiBot.js');

const metadata = {
  name: path.parse(__filename).name,
  aliases: ['logs'],
  short_desc: 'Download OptiBot log(s).',
  long_desc: 'Downloads the latest log file(s) that OptiBot has generated. **Note that this cannot access archived log files.**',
  args: [
    '[amount]',
    'all',
    'crash'
  ],
  authlvl: 5,
  flags: ['DM_OPTIONAL', 'MOD_CHANNEL_ONLY', 'LITE'],
  run: null
};

metadata.run = (m, args) => {
  if (args[0]) {
    const logs = fs.readdirSync('./logs');
    logs.sort((a, b) => {
      // TODO: change this to normal stat.
      // statSync is blocking, i.e. when this command is run, nothing else on the bot is getting done.
      return fs.statSync('./logs/' + a).mtime.getTime() - fs.statSync('./logs/' + b).mtime.getTime();
    });
    logs.reverse();

    let count = 1;
    const zip = new AZip();

    if (args[0].toLowerCase() === 'all' || args[0].toLowerCase() === 'crash') {
      count = logs.length;
    } else if (Number.isInteger(parseInt(args[0])) && parseInt(args[0]) > 0) {
      count = parseInt(args[0]);
    }

    for (let i = 0; i < logs.length; i++) {
      const file = logs[i];
      
      if (args[0].toLowerCase() === 'crash') {
        if(file.includes('CRASH')) zip.addLocalFile(`./logs/${file}`);
      } else {
        zip.addLocalFile(`./logs/${file}`);
      }

      if (i + 1 >= count) break;
    }

    m.channel.send(new djs.MessageAttachment(zip.toBuffer(), 'logs.zip'))
      .then(bm => OBUtil.afterSend(bm, m.author.id))
      .catch(err => OBUtil.err(err));
  } else {
    m.channel.send(new djs.MessageAttachment(`./logs/${Memory.core.logfile}.log`))
      .then(bm => OBUtil.afterSend(bm, m.author.id))
      .catch(err => OBUtil.err(err));
  }
};

module.exports = new Command(metadata);
const path = require('path');
const util = require('util');
const { Command, OBUtil } = require('../core/OptiBot.js');

const metadata = {
  name: path.parse(__filename).name,
  aliases: ['timetest'],
  short_desc: 'Test OptiBot\'s time parser utility.',
  long_desc: 'Gives the raw output of OptiBot\'s time parser utility.',
  args: '<time>',
  authlvl: 1,
  flags: ['DM_OPTIONAL', 'NO_TYPER'],
  run: null
};

metadata.run = (m, args) => {
  if (!args[0]) {
    OBUtil.missingArgs(m, metadata);
  } else {
    const time = OBUtil.parseTime(args[0]);
    m.channel.send(`\`\`\`javascript\n${util.inspect(time)}\`\`\``).then(bm => OBUtil.afterSend(bm, m.author.id));
  }
};

module.exports = new Command(metadata);
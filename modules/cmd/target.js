const path = require('path');
const util = require('util');
const djs = require('discord.js');
const { Command, OBUtil } = require('../core/optibot.js');

const metadata = {
  name: path.parse(__filename).name,
  aliases: ['targetuser', 'targettest'],
  short_desc: 'Test OptiBot\'s targeting utility.',
  long_desc: 'Gives the raw output of OptiBot\'s targeting utility.',
  args: [
    '0 [discord member]',
    '1 [discord message]'
  ],
  authlvl: 1,
  flags: ['DM_OPTIONAL', 'NO_TYPER'],
  run: null
};

metadata.run = (m, args, data) => {
  if (!Number.isInteger(parseInt(args[0]))) {
    return bot.util.missingArgs(m, metadata);
  }

  bot.util.parseTarget(m, parseInt(args[0]), args[1], data.member).then((result) => {
    const text = util.inspect(result);

    if (text.length > 1950) {
      return m.channel.send(new djs.MessageAttachment(Buffer.from(util.inspect(result)), 'target.txt')).then(bm => bot.util.afterSend(bm, m.author.id));
    }

    m.channel.send(`\`\`\`javascript\n${util.inspect(result)}\`\`\``).then(bm => bot.util.afterSend(bm, m.author.id));
  }).catch(err => bot.util.err(err, { m }));
};

module.exports = new Command(metadata);
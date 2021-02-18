const path = require('path');
const { Command, memory } = require('../core/optibot.js');

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  aliases: ['owo'],
  short_desc: 'UwU',
  long_desc: 'UwU OwO UwU',
  args: '<text | discord message>',
  authlvl: 1,
  flags: ['DM_OPTIONAL', 'NO_TYPER'],
  run: null
};

metadata.run = (m, args, data) => {
  if (!args[0]) {
    bot.util.missingArgs(m, metadata);
  } else {
    // eslint-disable-next-line no-inner-declarations
    function translate(message) {
      m.channel.send(bot.util.uwu(message)).then(bm => bot.util.afterSend(bm, m.author.id));
    }

    bot.util.parseTarget(m, 1, args[0], data.member).then(result => {
      if(result && result.type === 'message') {
        translate(result.target.cleanContent);
      } else {
        translate(m.cleanContent.substring(`${bot.prefix}${metadata.name} `.length));
      }
    }).catch(err => {
      bot.util.err(err, {m:m});
    });
  }
};

module.exports = new Command(metadata);
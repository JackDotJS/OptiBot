const path = require('path');
const { Command, Assets } = require('../core/optibot.js');

const metadata = {
  name: path.parse(__filename).name,
  short_desc: 'die',
  long_desc: 'die',
  authlvl: 1,
  flags: ['DM_OPTIONAL', 'NO_TYPER', 'HIDDEN'],
  run: null
};

metadata.run = m => m.channel.send(Assets.getImage('IMG_marcelo_die').attachment).then(bm => bot.util.afterSend(bm, m.author.id));

module.exports = new Command(metadata);
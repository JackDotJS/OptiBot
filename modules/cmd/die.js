const path = require('path');
const { Command, OBUtil, Assets } = require('../core/OptiBot.js');

const metadata = {
  name: path.parse(__filename).name,
  short_desc: 'die',
  long_desc: 'die',
  authlvl: 1,
  flags: ['DM_OPTIONAL', 'NO_TYPER', 'HIDDEN'],
  run: null
};

metadata.run = m => m.channel.send(Assets.getImage('IMG_marcelo_die').attachment).then(bm => OBUtil.afterSend(bm, m.author.id));

module.exports = new Command(metadata);
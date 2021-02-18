const path = require('path');
const { Command, Assets } = require('../core/optibot.js');

const metadata = {
  name: path.parse(__filename).name,
  aliases: ['goodboi'],
  short_desc: 'Good boy!',
  authlvl: 1,
  flags: ['DM_OPTIONAL', 'NO_TYPER', 'LITE'],
  run: null
};

metadata.run = m => m.channel.send(Assets.getImage('IMG_goodboy').attachment).then(bm => bot.util.afterSend(bm, m.author.id));

module.exports = new Command(metadata);
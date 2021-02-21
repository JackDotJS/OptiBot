const path = require(`path`);
const { Command, memory, Assets } = require(`../core/optibot.js`);

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  aliases: [`goodboi`],
  short_desc: `Good boy!`,
  authlvl: 1,
  flags: [`DM_OPTIONAL`, `NO_TYPER`, `LITE`],
  run: null
};

metadata.run = m => bot.send(m, { files: [ Assets.getImage(`IMG_goodboy`).attachment ] });

module.exports = new Command(metadata);
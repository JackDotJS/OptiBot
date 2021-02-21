const path = require(`path`);
const { Command, memory, Assets } = require(`../core/optibot.js`);

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  short_desc: `die`,
  long_desc: `die`,
  authlvl: 1,
  flags: [`DM_OPTIONAL`, `NO_TYPER`, `HIDDEN`],
  run: null
};

metadata.run = m => bot.send(m, { files: [ Assets.getImage(`IMG_marcelo_die`).attachment ] });

module.exports = new Command(metadata);
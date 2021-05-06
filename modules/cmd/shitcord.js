const path = require(`path`);
const djs = require(`discord.js`);
const { Command, memory } = require(`../core/modules.js`);

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  description: {
    short: `discord moment`
  },
  dm: true,
  flags: [ `PERMS_REQUIRED` ],
  run: null
};

metadata.run = m => bot.send({ files: [ new djs.MessageAttachment(path.resolve(`./assets/img/IMG_shitcord.png`), `shitcord.png`) ] });

module.exports = new Command(metadata);
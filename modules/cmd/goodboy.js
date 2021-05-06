const path = require(`path`);
const { Command, memory, Assets } = require(`../core/modules.js`);

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  aliases: [`goodboi`],
  description: {
    short: `Good boy!`
  },
  dm: true,
  flags: [ `PERMS_REQUIRED`, `LITE` ],
  run: null
};

metadata.run = m => bot.send(m, { files: [ Assets.getImage(`IMG_goodboy`).attachment ] });

module.exports = new Command(metadata);
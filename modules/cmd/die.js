const path = require(`path`);
const { Command, memory, Assets } = require(`../core/modules.js`);

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  description: {
    short: `die`
  },
  dm: true,
  dperm: `SEND_MESSAGES`,
  run: null
};

metadata.run = m => bot.send(m, { files: [ Assets.getImage(`IMG_marcelo_die`).attachment ] });

module.exports = new Command(metadata);
const path = require(`path`);
const { Command } = require(`../core/modules.js`);

const metadata = {
  name: path.parse(__filename).name,
  description: {
    short: `This kills the bot.`
  },
  dm: false,
  flags: [ `HIDDEN`, `PERMS_REQUIRED`, `STAFF_CHANNEL_ONLY`, `STRICT`, `DELETE_ON_MISUSE`, `LITE` ],
  run: null
};

metadata.run = () => {
  process.exit(1); // big brain moment
};

module.exports = new Command(metadata);
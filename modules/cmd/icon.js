// REMEMBER TO REMOVE THIS LINE WHEN COPYING THIS FILE
const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const { Command, memory, RecordEntry, LogEntry, Assets } = require(`../core/optibot.js`);

const bot = memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  description: {
    short: `Display a Vector icon.`,
    long: `Displays a Vector embed icon, with optional custom colors and rotation.`
  },
  args: `<icon name> [color] [angle]`,
  dm: true,
  flags: [ `DEVELOPER`, `LITE` ],
  run: null
};

metadata.run = async (m, args, data) => {
  if (!args[0]) return bot.util.err(`No icon specified.`, { m });

  let color = bot.cfg.colors.default;
  let deg = 0;

  if (args[1] != null) {
    switch (args[1]) {
      case `okay`:
      case `green`:
        color = bot.cfg.colors.okay;
        break;
      case `warn`:
      case `yellow`:
        color = bot.cfg.colors.warn;
        break;
      case `err`:
      case `error`:
      case `red`:
        color = bot.cfg.colors.error;
        break;
      default:
        color = args[1];
    }
  }

  if (args[2] != null && !isNaN(args[2])) deg = parseInt(args[2]);

  log(args[2] != null && !isNaN(args[2]));
  log(deg);

  const embed = new djs.MessageEmbed()
    .setAuthor(`Example`, await Assets.getIcon(args[0], color, deg))
    .setColor(color);

  bot.send(m, { embed });
};

module.exports = new Command(metadata);
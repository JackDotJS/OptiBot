// REMEMBER TO REMOVE THIS LINE WHEN COPYING THIS FILE
const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const { Command, memory, RecordEntry, LogEntry, Assets } = require(`../core/optibot.js`);

const bot = memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  // aliases: ['aliases'],
  short_desc: `Short description. Shows when viewed with \` ${bot.prefix}list \``,
  long_desc: `Long description. Shows when using \` ${bot.prefix}help ${path.parse(__filename).name} \` and tooltips in \` ${bot.prefix}list \``,
  args: `<icon name> [color]`,
  image: `IMG_args`,
  authlvl: 5,
  flags: [`DM_OPTIONAL`, `NO_TYPER`, `HIDDEN`, `LITE`],
  run: null
};

metadata.run = async (m, args, data) => {
  if (!args[0]) return bot.util.err(`No icon specified.`, { m });

  let color = bot.cfg.embed.default;
  let deg = 0;

  if (args[1] != null) {
    switch (args[1]) {
      case `okay`:
      case `green`:
        color = bot.cfg.embed.okay;
        break;
      case `warn`:
      case `yellow`:
        color = bot.cfg.embed.warn;
        break;
      case `err`:
      case `error`:
      case `red`:
        color = bot.cfg.embed.error;
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
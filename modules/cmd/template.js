/* eslint-disable */
// REMEMBER TO REMOVE THIS LINE WHEN COPYING THIS FILE
const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const { Command, memory, RecordEntry, LogEntry, Assets } = require(`../core/modules.js`);

const bot = memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  // aliases: [ `aliases` ],
  description: {
    short: `Short description. Shows when viewed in the command list.`,
    long: `Long description. Shows when using \` ${bot.prefix}help ${path.parse(__filename).name} \``
  },
  args: `[args]`,
  guilds: [],
  image: `IMG_args.png`,
  dm: true,
  flags: [ `HIDDEN`, `LITE` ],
};

const exec = async (m, args, data) => {
  const embed = new djs.MessageEmbed()
    .setAuthor(`Example MessageEmbed`, await Assets.getIcon(`ICO_info`, bot.cfg.colors.default))
    .setColor(bot.cfg.colors.default);

  bot.send(m, { embed });
};

module.exports = new Command(metadata, exec);
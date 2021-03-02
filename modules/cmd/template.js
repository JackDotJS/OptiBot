/* eslint-disable */
// REMEMBER TO REMOVE THIS LINE WHEN COPYING THIS FILE
const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const { Command, memory, RecordEntry, LogEntry, Assets } = require(`../core/optibot.js`);

const bot = memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  // aliases: ['aliases'], // OPTIONAL
  description: {
    // BOTH OPTIONAL
    short: `Short description. Shows when viewed in the command list.`,
    long: `Long description. Shows when using \` ${bot.prefix}help ${path.parse(__filename).name} \``
  },
  args: `[args]`, // OPTIONAL
  image: `IMG_args.png`, // OPTIONAL
  dm: true, // OPTIONAL
  flags: [ `HIDDEN`, `LITE`], // OPTIONAL
  run: null
};

metadata.run = (m, args, data) => {
  const embed = new djs.MessageEmbed()
    .setAuthor(`Example MessageEmbed`)
    .setColor(bot.cfg.embed.default);

  bot.send(m, { embed });
};

module.exports = new Command(metadata);
const path = require(`path`);
const util = require(`util`);
const { Command, memory } = require(`../core/optibot.js`);

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  aliases: [`timetest`],
  short_desc: `Test OptiBot's time parser utility.`,
  long_desc: `Gives the raw output of OptiBot's time parser utility.`,
  args: `<time>`,
  authlvl: 1,
  flags: [`DM_OPTIONAL`, `NO_TYPER`],
  run: null
};

metadata.run = (m, args) => {
  if (!args[0]) {
    bot.util.missingArgs(m, metadata);
  } else {
    const time = bot.util.parseTime(args[0]);
    bot.send(m, `\`\`\`javascript\n${util.inspect(time)}\`\`\``);
  }
};

module.exports = new Command(metadata);
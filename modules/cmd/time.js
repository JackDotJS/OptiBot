const path = require(`path`);
const util = require(`util`);
const { Command, memory } = require(`../core/optibot.js`);

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  aliases: [`timetest`],
  description: {
    short: `Test OptiBot's time parser utility.`,
    long: `Gives the raw output of OptiBot's time parser utility.`
  },
  args: `<time>`,
  dm: true,
  flags: [ `PERMS_REQUIRED` ],
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
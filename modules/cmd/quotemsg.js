const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const { Command, memory, RecordEntry, LogEntry, Assets } = require(`../core/optibot.js`);

const bot = memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  description: {
    short: `Display a Discord message.`,
    long: `Fetches and displays message contents for a given Discord message URL. Only works for messages in channels and servers the bot has access to.`
  },
  args: `<discord message>`,
  dm: true,
  flags: [ `LITE` ],
};

const exec = async (m, args, data) => {
  if (!args[0]) {
    return bot.util.missingArgs(m, metadata);
  }

  bot.send(m, `todo`);
};

module.exports = new Command(metadata, exec);
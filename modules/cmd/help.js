const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const { Command, memory, Assets } = require(`../core/optibot.js`);

const bot = memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  short_desc: `Find or view OptiBot commands.`,
  long_desc: `Gives detailed information about a given command.`,
  args: `[command name|command alias|query]`,
  authlvl: 0,
  flags: [`DM_OPTIONAL`, `NO_TYPER`, `BOT_CHANNEL_ONLY`],
  run: null
};

metadata.run = async (m, args, data) => {
  let list;
  const query = m.cleanContent.substring(`${bot.prefix}${data.input.cmd} `.length).trim().exec(/((?<=").+?(?="))|([^"]+)/i);

  log(util.inspect(query));

};

module.exports = new Command(metadata);
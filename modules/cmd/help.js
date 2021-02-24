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
  let list = memory.assets.commands;
  let query;
  let strict = false;
  const parseQuery = (/((?<=").+?(?="))|([^"]+)/i).exec(m.cleanContent.substring(`${bot.prefix}${data.input.cmd} `.length));

  if (parseQuery != null) {
    if (parseQuery[1] != null) {
      strict = true;
      query = parseQuery[1];
    } else if (parseQuery[2] != null) {
      query = parseQuery[2];
    }
  }

  // todo: filter commands

  // todo: show commands

  // todo: fucking everything

  log(util.inspect(query));

};

module.exports = new Command(metadata);
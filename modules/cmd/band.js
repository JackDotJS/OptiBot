const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const { Command, memory, RecordEntry, LogEntry, Assets } = require(`../core/modules.js`);

const bot = memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  description: {
    short: `🎺 🎸 🥁 🎤`,
    long: `Adds the follow emoji to your message: 🎺 🎸 🥁 🎤 \n\n(This is an incredibly obscure inside joke)`
  },
  guilds: [ bot.cfg.guilds.optifine ],
  dm: false,
  flags: [ `HIDDEN`, `NO_TYPER` ],
};

const exec = async (m, args, data) => {
  Promise.all([
    await m.react(`🎺`),
    await m.react(`🎸`),
    await m.react(`🥁`),
    await m.react(`🎤`)
  ]).catch(bot.util.err);
};

module.exports = new Command(metadata, exec);
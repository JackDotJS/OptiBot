const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const { Command, memory, RecordEntry, LogEntry, Assets } = require(`../core/modules.js`);

const bot = memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  aliases: [ `config` ],
  description: {
    short: `Get or update bot settings for this server.`,
    long: `Long description. Shows when using \` ${bot.prefix}help ${path.parse(__filename).name} \``
  },
  args: `[file attachment]`,
  dm: false,
  flags: [ `LITE` ],
  dperm: `MANAGE_GUILD`,
  run: null
};

const exec = async (m, args, data) => {
  const embed = new djs.MessageEmbed()
    .setAuthor(`Example MessageEmbed`, await Assets.getIcon(`ICO_info`, bot.cfg.colors.default))
    .setColor(bot.cfg.colors.default);

  bot.send(m, { embed });
};

module.exports = new Command(metadata, exec);
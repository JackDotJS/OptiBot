const path = require(`path`);
const djs = require(`discord.js`);
const { Command, memory, Assets } = require(`../core/optibot.js`);

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  aliases: [`issues`, `git`, `issue`],
  description: {
    short: `Get a link to OptiFine's issue tracker.`,
    long: `Provides a link to OptiFine's issue tracker on GitHub.`
  },
  dm: true,
  flags: [ `LITE` ],
  run: null
};

metadata.run = m => {
  const embed = new djs.MessageEmbed()
    .setColor(bot.cfg.embed.default)
    .setAuthor(`OptiFine Issue Tracker`, Assets.getEmoji(`ICO_git`).url)
    .setTitle(`https://github.com/sp614x/optifine/issues`);

  bot.send(m, { embed });
};

module.exports = new Command(metadata);
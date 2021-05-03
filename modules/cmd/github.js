const path = require(`path`);
const djs = require(`discord.js`);
const { Command, memory, Assets } = require(`../core/optibot.js`);

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  aliases: [`issues`, `git`, `issue`],
  description: {
    short: `Get a link to our GitHub repository.`,
    long: `Provides links to GitHub repositories as specified by the managers of this server.`
  },
  args: [
    `[repository name]`,
    `[issue/pr #]`
  ],
  dm: false,
  flags: [ `LITE` ],
  run: null
};

metadata.run = m => {
  // todo: get issues from a repo (or repos) as specified by server config

  bot.send(m, `todo`);

  /* const embed = new djs.MessageEmbed()
    .setColor(bot.cfg.colors.default)
    .setAuthor(`OptiFine Issue Tracker`, Assets.getEmoji(`ICO_git`).url)
    .setTitle(`https://github.com/sp614x/optifine/issues`);

  bot.send(m, { embed }); */
};

module.exports = new Command(metadata);
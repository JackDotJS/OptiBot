const path = require(`path`);
const djs = require(`discord.js`);
const { Command, memory, Assets } = require(`../core/optibot.js`);

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  aliases: [`lighttheme`],
  description: {
    short: `Explain why people use light theme.`,
    long: `Gives an explanation of why people use light theme.`
  },
  dm: true,
  flags: [ `LITE` ],
  run: null
};

metadata.run = async (m) => {
  const embed = new djs.MessageEmbed()
    .setColor(bot.cfg.embed.default)
    .setAuthor(`Light Theme`, await Assets.getIcon(`ICO_info`, bot.cfg.embed.default))
    .setTitle(`Please be respectful to light theme users!`)
    .setDescription(`For many people, light themes are a necessary feature for accessibility purposes. This especially applies to those with Astigmatism or Dyslexia, as it can be harder to read text depending on the lighting in their surroundings, among other conditions. Even if a user does not have any accessibility concerns, it's still well within their rights to use a light theme, because it can simply be their preference.`)
    .setFooter(`Respect other people's needs and choices!`);

  bot.send(m, { embed });
};

module.exports = new Command(metadata);
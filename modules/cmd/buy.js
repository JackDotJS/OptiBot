const path = require(`path`);
const djs = require(`discord.js`);
const { Command, memory, Assets } = require(`../core/optibot.js`);

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  aliases: [`piracy`, `pirated`, `cracked`, `buygame`],
  description: {
    short: `Tells pirates to purchase Minecraft.`,
    long: `Tells people who have pirated the game to purchase it.`
  },
  guilds: [ bot.cfg.guilds.optifine ],
  dm: false,
  flags: [ `LITE` ],
  run: null
};

metadata.run = async (m) => {
  const embed = new djs.MessageEmbed()
    .setColor(bot.cfg.colors.default)
    .setAuthor(`Purchase Minecraft`, await Assets.getIcon(`ICO_info`, bot.cfg.colors.default))
    .setTitle(`https://minecraft.net`)
    .setDescription(`It seems like you have a pirated copy of the game, and as such, we will not provide support. Please consider purchasing the game, as we do not condone piracy.`);

  bot.send(m, { embed });
};

module.exports = new Command(metadata);
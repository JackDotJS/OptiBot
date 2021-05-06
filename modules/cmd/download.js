const path = require(`path`);
const djs = require(`discord.js`);
const { Command, memory, Assets } = require(`../core/modules.js`);

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  aliases: [`site`, `optisite`, `website`, `optifine`, `dl`],
  description: {
    short: `Get some links to download OptiFine`,
    long: `Provides various links to download OptiFine.`
  },
  guilds: [ bot.cfg.guilds.optifine ],
  dm: true,
  flags: [ `LITE` ],
  run: null
};

metadata.run = m => {
  const embed = new djs.MessageEmbed()
    .setColor(bot.cfg.colors.default)
    .setAuthor(`Download OptiFine`, Assets.getEmoji(`ICO_of`).url)
    .setTitle(`https://optifine.net/downloads`)
    .addField(`Alternative`, `https://optifined.net/downloads`)
    .addField(`Older Versions (B1.4 - 1.9)`, `[[Ridiculously long URL]](https://www.minecraftforum.net/forums/mapping-and-modding-java-edition/minecraft-mods/1286605-b1-4-1-9-optifine-history "https://www.minecraftforum.net/forums/mapping-and-modding-java-edition/minecraft-mods/1286605-b1-4-1-9-optifine-history")`);

  bot.send(m, { embed });
};

module.exports = new Command(metadata);
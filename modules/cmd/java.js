const path = require(`path`);
const djs = require(`discord.js`);
const { Command, memory, Assets } = require(`../core/modules.js`);

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  aliases: [`jdk`, `jre`, `ojdk`, `openjdk`],
  description: {
    short: `Get some links to download Java.`,
    long: `Provides various links to download Java.`
  },
  dm: true,
  flags: [ `LITE` ],
  run: null
};

metadata.run = m => {
  const embed = new djs.MessageEmbed()
    .setColor(bot.cfg.colors.default)
    .setAuthor(`Download Java`, Assets.getEmoji(`ICO_java`).url)
    .setTitle(`https://www.java.com`)
    .setDescription(`Looking for AdoptOpenJDK? **(Advanced users only!)**\nhttps://adoptopenjdk.net/`);

  bot.send(m, { embed });
};

module.exports = new Command(metadata);
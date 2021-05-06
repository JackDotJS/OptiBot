const path = require(`path`);
const djs = require(`discord.js`);
const { Command, memory, Assets } = require(`../core/modules.js`);

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  aliases: [`fixjar`],
  description: {
    short: `Get a link to download Jarfix.`,
    long: `Provides a link to download Jarfix.`
  },
  dm: true,
  flags: [ `LITE` ],
  run: null
};

metadata.run = m => {
  const embed = new djs.MessageEmbed()
    .setColor(bot.cfg.colors.default)
    .setAuthor(`Download Jarfix`, Assets.getEmoji(`ICO_jarfix`).url)
    .setTitle(`Jarfix is a program that will automatically set \`.jar\` files to open with Java.`)
    .addField(`Download Page`, `https://johann.loefflmann.net/jarfix`)
    .addField(`Direct Download`, `https://johann.loefflmann.net/downloads/jarfix.exe`)
    .setFooter(`Jarfix Copyright © 2002-${new Date().getUTCFullYear()} by Dipl.-Inf. (FH) Johann Nepomuk Löfflmann`);

  bot.send(m, { embed });
};

module.exports = new Command(metadata);

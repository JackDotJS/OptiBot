const path = require('path');
const djs = require('discord.js');
const { Command, memory, Assets } = require('../core/optibot.js');

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  aliases: ['site', 'optisite', 'website', 'optifine', 'dl'],
  short_desc: 'Get some links to download OptiFine',
  long_desc: 'Provides various links to download OptiFine.',
  authlvl: 0,
  flags: ['DM_OPTIONAL', 'NO_TYPER'],
  run: null
};

metadata.run = m => {
  const embed = new djs.MessageEmbed()
    .setColor(bot.cfg.embed.default)
    .setAuthor('Download OptiFine', Assets.getEmoji('ICO_of').url)
    .setTitle('https://optifine.net/downloads')
    .addField('Alternative', 'https://optifined.net/downloads')
    .addField('Older Versions (B1.4 - 1.9)', '[[Ridiculously long URL]](https://www.minecraftforum.net/forums/mapping-and-modding-java-edition/minecraft-mods/1286605-b1-4-1-9-optifine-history "https://www.minecraftforum.net/forums/mapping-and-modding-java-edition/minecraft-mods/1286605-b1-4-1-9-optifine-history")');

  bot.send(m, { embed });
};

module.exports = new Command(metadata);
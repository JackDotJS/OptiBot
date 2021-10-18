const path = require('path');
const djs = require('discord.js');
const { Command, OBUtil, Memory, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  aliases: ['jdk', 'jre', 'ojdk', 'openjdk'],
  short_desc: 'Get some links to download Java.',
  long_desc: 'Provides various links to download Java.',
  authlvl: 0,
  flags: ['DM_OPTIONAL', 'NO_TYPER'],
  run: null
};

metadata.run = m => {
  const embed = new djs.MessageEmbed()
    .setColor(bot.cfg.embed.default)
    .setAuthor('Download Java', Assets.getEmoji('ICO_java').url)
    .setTitle('https://www.java.com')
    .setDescription('[Looking for Adoptium?](https://adoptium.net/) (Previously known as AdoptOpenJDK)');

  m.channel.send(embed).then(bm => OBUtil.afterSend(bm, m.author.id));
};

module.exports = new Command(metadata);
const path = require('path');
const djs = require('discord.js');
const { Command, memory, Assets } = require('../core/optibot.js');

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  //aliases: ['fixjar'],
  short_desc: 'Get a link to download Jarfix.',
  long_desc: 'Provides a link to download Jarfix.',
  authlvl: 0,
  flags: ['DM_OPTIONAL', 'NO_TYPER'],
  run: null
};

metadata.run = m => {
  const embed = new djs.MessageEmbed()
    .setColor(bot.cfg.embed.default)
    .setAuthor('Download Jarfix', Assets.getEmoji('ICO_jarfix').url)
    .setTitle('Jarfix is a program that will automatically set ``.jar`` files to open with Java.')
    .addField('Download Page', 'https://johann.loefflmann.net/jarfix')
    .addField('Direct Download', 'https://johann.loefflmann.net/downloads/jarfix.exe')
    .setFooter(`Jarfix Copyright © 2002-${new Date().getUTCFullYear()} by Dipl.-Inf. (FH) Johann Nepomuk Löfflmann`);

  bot.send(m, { embed });
};

module.exports = new Command(metadata);

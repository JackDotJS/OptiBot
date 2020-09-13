const path = require('path');
const djs = require('discord.js');
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  //aliases: ['fixjar'],
  short_desc: 'Provides a link to download Jarfix.',
  authlvl: 0,
  flags: ['DM_OPTIONAL', 'NO_TYPER'],
  run: null
};

metadata.run = (m, args, data) => {
  const embed = new djs.MessageEmbed()
    .setColor(bot.cfg.embed.default)
    .setAuthor('Download Jarfix', Assets.getEmoji('ICO_jarfix').url)
    .setTitle('https://johann.loefflmann.net/jarfix')
    .addField('Direct Download', 'https://johann.loefflmann.net/downloads/jarfix.exe')
    .setFooter(`Jarfix Copyright © 2002-${new Date().getUTCFullYear()} by Dipl.-Inf. (FH) Johann Nepomuk Löfflmann`);

  m.channel.send({ embed: embed }).then(bm => OBUtil.afterSend(bm, m.author.id));
};

module.exports = new Command(metadata);
const path = require('path');
const djs = require('discord.js');
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  aliases: ['jdk', 'jre', 'ojdk', 'openjdk'],
  short_desc: 'Provides some links to download Java.',
  authlvl: 0,
  flags: ['DM_OPTIONAL', 'NO_TYPER'],
  run: null
};

metadata.run = (m, args, data) => {
  const embed = new djs.MessageEmbed()
    .setColor(bot.cfg.embed.default)
    .setAuthor('Download Java', Assets.getEmoji('ICO_java').url)
    .setTitle('https://www.java.com')
    .setDescription('Looking for AdoptOpenJDK? **(Advanced users only!)**\nhttps://adoptopenjdk.net/');

  m.channel.send({ embed: embed }).then(bm => OBUtil.afterSend(bm, m.author.id));
};

module.exports = new Command(metadata);
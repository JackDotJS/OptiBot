const path = require('path');
const djs = require('discord.js');
const { Command, OBUtil, Memory, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  aliases: ['issues', 'git', 'issue'],
  short_desc: 'Get a link to OptiFine\'s issue tracker.',
  long_desc: 'Provides a link to OptiFine\'s issue tracker on GitHub.',
  authlvl: 0,
  flags: ['DM_OPTIONAL', 'NO_TYPER'],
  run: null
};

metadata.run = m => {
  const embed = new djs.MessageEmbed()
    .setColor(bot.cfg.embed.default)
    .setAuthor('OptiFine Issue Tracker', Assets.getEmoji('ICO_git').url)
    .setTitle('https://github.com/sp614x/optifine/issues');

  m.channel.send(embed).then(bm => OBUtil.afterSend(bm, m.author.id));
};

module.exports = new Command(metadata);
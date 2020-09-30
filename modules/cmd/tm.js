const path = require('path');
const djs = require('discord.js');
const { Command, OBUtil, Memory, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  aliases: ['thanos', 'method', 'binarysplit'],
  short_desc: 'Show a quick guide for *The Thanos Method!™️*',
  long_desc: 'Provides a quick guide to find incompatible Minecraft mods.',
  authlvl: 0,
  flags: ['DM_OPTIONAL', 'NO_TYPER'],
  run: null
};

metadata.run = m => {
  const embed = new djs.MessageEmbed()
    .setColor(bot.cfg.embed.default)
    .setAuthor('The Thanos Method!™️', Assets.getEmoji('ICO_snap').url)
    .addField('What the heck is it?', '*The Thanos Method!™️* (more accurately known as a binary split) is a debugging technique used to find mods that are incompatible with OptiFine.')
    .addField('How does it work?', '*The Thanos Method!™️* is simple. To find conflicting mods, split your mods folder into 2 groups. Remove one group, and test in-game. Keep the group that has the problem, and repeat until no more mods can be removed without the issue disappearing. Thanks to *The Thanos Method!™️*, you can now report the incompatible mods on GitHub!')
    .setFooter('"The Thanos Method!" is not actually trademarked or even remotely considered an official name. \n\nplease don\'t sue me i just thought it was funny');

  m.channel.send(embed).then(bm => OBUtil.afterSend(bm, m.author.id));
};

module.exports = new Command(metadata);
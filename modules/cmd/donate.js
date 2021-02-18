const path = require('path');
const djs = require('discord.js');
const { Command, memory, Assets } = require('../core/optibot.js');

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  //aliases: [''],
  short_desc: 'Show OptiFine donation information.',
  long_desc: 'Shows information about OptiFine donations.',
  authlvl: 0,
  flags: ['DM_OPTIONAL', 'NO_TYPER'],
  run: null
};

metadata.run = m => {
  const now = new Date();
  const birthdate = new Date('April 8, 2011 12:00:00');
  let years = now.getUTCFullYear() - birthdate.getUTCFullYear();

  const month_now = now.getUTCMonth();
  const month_birth = birthdate.getUTCMonth();

  if (month_birth > month_now) {
    years--;
  } else
  if (month_birth === month_now && birthdate.getUTCDate() > now.getUTCDate()) {
    years--;
  }

  const embed = new djs.MessageEmbed()
    .setColor(bot.cfg.embed.default)
    .setAuthor('OptiFine Donations', Assets.getEmoji('ICO_heart').url)
    .setTitle('https://optifine.net/donate')
    .setDescription(`OptiFine has been created, developed, and maintained solely by <@202558206495555585> for ${years} whole years and counting. Please consider donating to support the mod's continued development!\n\nFor a one-time donation of $10 USD, you'll (optionally) receive a customizable in-game cape, visible to all other OptiFine players, all in recognition of your awesomeness!`)
    .setFooter('Thank you for your consideration!');

  m.channel.send(embed).then(bm => bot.util.afterSend(bm, m.author.id));
};

module.exports = new Command(metadata);
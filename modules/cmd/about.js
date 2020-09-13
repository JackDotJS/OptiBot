const path = require('path');
const djs = require('discord.js');
const { Command, OBUtil, Memory, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;
const contributors = require(path.resolve('./cfg/contributors.json'));
const donators = require(path.resolve('./cfg/donators.json'));

const metadata = {
  name: path.parse(__filename).name,
  short_desc: 'About OptiBot.',
  authlvl: 0,
  flags: ['DM_OPTIONAL', 'NO_TYPER', 'BOT_CHANNEL_ONLY'],
  run: null
};

metadata.run = (m) => {
  const embed = new djs.MessageEmbed()
    .setColor(bot.cfg.embed.default)
    .setAuthor('About', Assets.getEmoji('ICO_info').url)
    .setThumbnail(bot.user.displayAvatarURL({ format: 'png', size: 64 }))
    .setTitle('The official OptiFine Discord server bot. \n\n')
    .setDescription('Developed and maintained by <@181214529340833792>, <@251778569397600256>, and <@225738946661974017> out of love for a great community.')
    .addField('Version', bot.version, true)
    .addField('Session Uptime', uptime(process.uptime() * 1000), true)
    .addField('Contributors', contributors.join(' '))
    .addField('Ko-fi Supporters', donators.join(' '));


  // You can send a straight embed without the content. Discord.js will do the heavy lifting
  m.channel.send(embed).then(bm => OBUtil.afterSend(bm, m.author.id));
};

function uptime(ut) {
  const seconds = (ut / 1000).toFixed(1);
  const minutes = (ut / (1000 * 60)).toFixed(1);
  const hours = (ut / (1000 * 60 * 60)).toFixed(1);
  const days = (ut / (1000 * 60 * 60 * 24)).toFixed(1);

  if (seconds < 60) {
    return seconds + ' Seconds';
  } else if (minutes < 60) {
    return minutes + ' Minutes';
  } else if (hours < 24) {
    return hours + ' Hours';
  } else {
    return days + ' Days';
  }
}

module.exports = new Command(metadata);
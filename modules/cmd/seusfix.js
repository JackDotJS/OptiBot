const path = require('path');
const djs = require('discord.js');
const { Command, memory, Assets } = require('../core/optibot.js');

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  aliases: ['fixseus', 'seusrenewedfix'],
  short_desc: 'Fix SEUS Renewed on Intel Graphics.',
  authlvl: 0,
  flags: ['DM_OPTIONAL', 'NO_TYPER'],
  run: null
};

metadata.run = m => {
  const embed = new djs.MessageEmbed()
    .setColor(bot.cfg.embed.default)
    .setAuthor('SEUS Renewed Fix', Assets.getEmoji('ICO_sun').url)
    .setTitle('This is a quick fix specifically for Intel Integrated Graphics. If you have an NVIDIA or AMD graphics card, this will NOT help you. \n\nRemember: Never modify shaderpacks, unless you REALLY know what you\'re doing!')
    .setDescription([
      'Open the shader pack (likely needs to be unzipped or extracted first) and open the `shaders` folder. Now open the `Common.inc` file with a text editor of your choice. Find and remove the `const` that immediately precedes the floats `K_R` and `K_M`, and save. Done!',
      '',
      '[Thanks to <@264109085174005770> for this fix!](https://discordapp.com/channels/423430686880301056/423432970242752512/687537740312871055)'
    ].join('\n'))
    .addField('Before', [
      '```glsl',
      'const float K_R = 0.186 * rayleighAmount;',
      'const float K_M = 0.035 * mieAmount;',
      '```'
    ].join('\n'))
    .addField('After', [
      '```glsl',
      'float K_R = 0.186 * rayleighAmount;',
      'float K_M = 0.035 * mieAmount;',
      '```'
    ].join('\n'));

  m.channel.send(embed).then(bm => bot.util.afterSend(bm, m.author.id));
};

module.exports = new Command(metadata);
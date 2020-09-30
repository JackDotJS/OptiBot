const path = require('path');
const util = require('util');
const djs = require('discord.js');
const { Command, OBUtil, Memory, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  aliases: ['optibit', 'bits', 'bit'],
  short_desc: 'Show OptiBits.',
  long_desc: `Displays information for all OptiBits. (This will be moved to \`${bot.prefix}help\` and \`${bot.prefix}list\` in a future update.)`,
  args: '[page number]',
  authlvl: 0,
  flags: ['DM_OPTIONAL', 'BOT_CHANNEL_ONLY'],
  run: null
};

metadata.run = (m, args, data) => {
  const list = Memory.assets.optibits;

  let filtered = list;
  let ftext = '';
  const selectPage = parseInt(args[0]) || 0;
  const isModChannel = (m.channel.type === 'dm' || [m.channel.id, m.channel.parentID].some(e => bot.cfg.channels.mod.includes(e)));

  if (data.authlvl > 0) {
    if(isModChannel) {
      filtered = list.filter((bit) => (bit.metadata.authlvl <= data.authlvl));
    } else {
      filtered = list.filter((bit) => (bit.metadata.authlvl === 0 && bit.metadata.flags['HIDDEN'] === false));
      ftext = 'Note: Some OptiBits have been hidden because you\'re in a public channel.';
    }
  } else {
    filtered = list.filter((bit) => (bit.metadata.authlvl <= data.authlvl && bit.metadata.flags['HIDDEN'] === false));
  }

  let pageNum = 0;
  if (selectPage > 0 && selectPage <= filtered.length) {
    pageNum = selectPage - 1;
  }

  const bit = filtered[pageNum].metadata;

  const embed = new djs.MessageEmbed()
    .setColor(bot.cfg.embed.default)
    .setAuthor(`OptiBot Bits | Page ${pageNum + 1}/${filtered.length}`, Assets.getEmoji('ICO_docs').url)
    .setTitle(bit.name)
    .setDescription(bit.description);

  if (bit.usage != null) embed.addField('Usage', `${bit.usage}\n**\`\`\`fix\nRemember: OptiBits aren't commands! \nYou don't need any prefixes to use this!\`\`\`**`);

  if (ftext.length > 0) embed.setFooter(ftext);

  if (bit.image) {
    embed.attachFiles([Assets.getImage(bit.image).attachment])
      .setThumbnail('attachment://image.png'); // ?? -James
  }

  if (data.authlvl >= 5 && isModChannel) {
    let taglist = [];

    Object.keys(bit.flags).forEach((tag) => {
      if (bit.flags[tag] === true) taglist.push(tag);
    });

    if (taglist.length === 0) taglist = 'This OptiBit has no active flags.';

    embed.addField('(DEV) Permission Level', `\`\`\`javascript\n${bit.authlvl}\`\`\``, true)
      .addField('(DEV) Execution Priority', `\`\`\`javascript\n${bit.priority}\`\`\``, true)
      .addField('(DEV) Execute Concurrent', `\`\`\`javascript\n${bit.concurrent}\`\`\``, true)
      .addField('(DEV) Flags', `\`\`\`javascript\n${util.inspect(taglist)}\`\`\``, true);
  }

  const restrictions = [];

  if (bit.flags['NO_DM']) {
    if (bit.flags['BOT_CHANNEL_ONLY']) {
      restrictions.push(`${Assets.getEmoji('error')} This OptiBit can *only* be used in the <#626843115650547743> channel.`);
    } else {
      restrictions.push(`${Assets.getEmoji('warn')} This OptiBit can be used in any channel, but *not* in DMs (Direct Messages)`);
    }
  } else if (bit.flags['DM_ONLY']) {
    restrictions.push(`${Assets.getEmoji('error')} This OptiBit can *only* be used in DMs (Direct Messages)`);
  } else {
    restrictions.push(`${Assets.getEmoji('okay')} This OptiBit can be used in any channel, including DMs (Direct Messages)`);
  }

  switch (bit.authlvl) {
    case 1:
      restrictions.push(`${Assets.getEmoji('locked')} Advisors, Jr. Moderators, and higher.`);
      break;
    case 2:
      restrictions.push(`${Assets.getEmoji('locked')} Jr. Moderators, Moderators, and higher.`);
      break;
    case 3:
      restrictions.push(`${Assets.getEmoji('locked')} Moderators and Administrators only.`);
      break;
    case 4:
      restrictions.push(`${Assets.getEmoji('locked')} Administrators only.`);
      break;
    case 5:
      restrictions.push(`${Assets.getEmoji('locked')} OptiBot developers only.`);
      break;
    default:
      restrictions.push(`${Assets.getEmoji('unlocked')} Available to all server members.`);
      break;
  }

  embed.addField('Restrictions', restrictions.join('\n'));

  m.channel.send(embed).then(msg => OBUtil.afterSend(msg, m.author.id));

};

module.exports = new Command(metadata);
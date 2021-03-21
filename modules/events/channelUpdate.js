const djs = require(`discord.js`);
const ob = require(`../core/OptiBot.js`);

const bot = ob.memory.core.client;
const log = ob.log;

module.exports = (oldc, newc) => {
  const now = new Date();
  if (bot.pause) return;
  if (oldc.type !== `text`) return;
  if (oldc.guild.id !== bot.mainGuild.id) return;
  if (bot.cfg.channels.nolog.some(id => [oldc.id, oldc.parentID].includes(id))) return;

  if (oldc.topic === newc.topic && oldc.name === newc.name) return;

  const logEntry = new ob.LogEntry({ time: now, channel: `other` })
    .setColor(bot.cfg.embed.default)
    .setIcon(ob.Assets.getEmoji(`ICO_edit`).url)
    .setTitle(`Channel Updated`, `Channel Update Report`)
    .addSection(`Channel`, newc);

  const embed = new djs.MessageEmbed()
    .setColor(bot.cfg.embed.default)
    .setAuthor(`Channel Updated`, ob.Assets.getEmoji(`ICO_edit`).url);

  if (oldc.topic !== newc.topic) {
    logEntry.addSection(`Old Topic`, {
      data: (oldc.topic) ? oldc.topic : `\u200B`,
      raw: (oldc.topic) ? oldc.topic : ``
    });

    logEntry.addSection(`New Topic`, {
      data: (newc.topic) ? newc.topic : `\u200B`,
      raw: (newc.topic) ? newc.topic : ``
    });

    embed.addField(`Old Topic`, (oldc.topic) ? oldc.topic : `\u200B`);
    embed.addField(`New Topic`, (newc.topic) ? newc.topic : `\u200B`);
  }

  if (oldc.name !== newc.name) {
    logEntry.addSection(`Old Channel Name`, `\`\`\`#${oldc.name}\`\`\``);
    logEntry.addSection(`New Channel Name`, `\`\`\`#${newc.name}\`\`\``);

    embed.addField(`Old Channel Name`, `\`\`\`#${oldc.name}\`\`\``);
    embed.addField(`New Channel Name`, `\`\`\`#${newc.name}\`\`\``);
  }

  logEntry.submit();

  if (!([newc.id, newc.parentID].some(e => bot.cfg.channels.blacklist.includes(e)))) {
    newc.send(embed);
  }

};
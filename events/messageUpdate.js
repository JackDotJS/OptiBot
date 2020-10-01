const util = require('util');
const timeago = require('timeago.js');
const ob = require('../modules/core/OptiBot.js');

module.exports = (bot, m, mNew) => {
  const now = new Date();

  if (bot.pause) return;
  if (m.channel.type === 'dm') return;
  if (m.type !== 'DEFAULT' || m.system || m.author.system || m.author.bot) return;
  if (m.guild.id !== bot.cfg.guilds.optifine) return;
  if (ob.OBUtil.parseInput(mNew).cmd === 'dr') return;
  if (bot.cfg.channels.nolog.some(id => [m.channel.id, m.channel.parentID].includes(id))) return;

  const logEntry = new ob.LogEntry({ time: now, channel: 'edit' });

  const desc = [
    `Message originally posted on ${m.createdAt.toUTCString()}`,
    `(${timeago.format(m.createdAt)})`
  ];

  logEntry.setColor(bot.cfg.embed.default)
    .setIcon(ob.Assets.getEmoji('ICO_edit').url)
    .setTitle('Message Updated', 'Message Update Report')
    .setDescription(desc.join('\n'), desc.join(' '))
    .addSection('Author', m.author)
    .addSection('Message Location', m);

  /////////////////////////////
  // text content
  /////////////////////////////

  if (m.content !== mNew.content) {
    if (m.content.length !== 0) {
      logEntry.addSection('Old Message Contents', m.content);
    } else {
      logEntry.addSection('Old Message Contents', {
        data: '\u200B',
        raw: ''
      });
    }

    if (mNew.content.length !== 0) {
      logEntry.addSection('New Message Contents', mNew.content);
    } else {
      logEntry.addSection('New Message Contents', {
        data: '\u200B',
        raw: ''
      });
    }
  } else if (m.content.length !== 0) {
    logEntry.addSection('Message Contents', m.content);
  }

  /////////////////////////////
  // attachments
  /////////////////////////////

  const att = [];
  const att_raw = [];
  if (m.attachments.size > 0) {
    m.attachments.each(a => {
      att.push(`[${a.name || a.url.match(/[^\/]+$/)}](${a.url})`); // eslint-disable-line no-useless-escape
      att_raw.push(`${a.name || a.url.match(/[^\/]+$/)} (${a.url})`); // eslint-disable-line no-useless-escape
    });
  }

  if (att.length > 0) {
    logEntry.addSection('Message Attachments', {
      data: att.join('\n'),
      raw: att_raw.join('\n')
    });
  }

  /////////////////////////////
  // embeds
  /////////////////////////////

  let rawEmbeds = [];

  for (let i = 0; i < m.embeds.length; i++) {
    rawEmbeds.push(util.inspect(m.embeds[i], { showHidden: true, getters: true }));
    if (i + 1 < m.embeds.length) {
      rawEmbeds.push('');
    } else {
      rawEmbeds = rawEmbeds.join('\n');
    }
  }

  const embedsUpdated = JSON.stringify(m.embeds) !== JSON.stringify(mNew.embeds);

  if (embedsUpdated) {
    let rawEmbedsNew = [];

    for (let i = 0; i < mNew.embeds.length; i++) {
      rawEmbedsNew.push(util.inspect(mNew.embeds[i], { showHidden: true, getters: true }));
      if (i + 1 < mNew.embeds.length) {
        rawEmbedsNew.push('');
      } else {
        rawEmbedsNew = rawEmbedsNew.join('\n');
      }
    }

    logEntry.addSection('Old Message Embeds', {
      data: `[${m.embeds.length} Embed${(m.embeds.length !== 1) ? 's' : ''}]`,
      raw: rawEmbeds
    })
      .addSection('New Message Embeds', {
        data: `[${mNew.embeds.length} Embed${(mNew.embeds.length !== 1) ? 's' : ''}]`,
        raw: rawEmbedsNew
      });
  } else if (m.embeds.length > 0) {
    logEntry.addSection('Message Embeds', {
      data: `[${m.embeds.length} Embed${(m.embeds.length !== 1) ? 's' : ''}]`,
      raw: rawEmbeds
    });
  }

  logEntry.submit();
};
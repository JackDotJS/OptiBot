const djs = require(`discord.js`);
const util = require(`util`);
const timeago = require(`timeago.js`);
const ob = require(`../core/OptiBot.js`);

const bot = ob.memory.core.client;
const log = ob.log;

module.exports = async (m, mNew) => {
  if (bot.pause) return;
  if (m.type !== `DEFAULT` || m.system || m.author.system || m.author.bot) return;

  // handle command edits
  const input = bot.util.parseInput(mNew.content);
  const inputOld = bot.util.parseInput(m.content);

  if (input.valid) {
    const messages = await m.channel.messages.fetch({ amount: 2 });
    const sorted = messages.sort((a, b) => b.createdTimestamp - a.createdTimestamp).array();

    if (inputOld.valid && sorted[0].author.id === bot.user.id && sorted[1].id === mNew.id) {
      sorted[0].delete();
      bot.util.handleCommand(sorted[1], input);
    }

    if (sorted[0].id === mNew.id) {
      bot.util.handleCommand(sorted[0], input);
    }
  }

  if (input.cmd === `dr` || inputOld.cmd === `dr`) return;
  if (m.channel.type === `dm`) return;

  let postInChannel = false;
  const postInLogs = (m.guild.id !== bot.cfg.guilds.optifine && [...bot.cfg.channels.nolog, ...bot.cfg.channels.staff].some(id => [m.channel.id, m.channel.parentID].includes(id)));
  const embed = new djs.MessageEmbed();

  const now = new Date();
  const logEntry = new ob.LogEntry({ time: now, channel: `edit` });

  const desc = [
    `Message originally posted on ${m.createdAt.toUTCString()}`,
    `(${timeago.format(m.createdAt)})`
  ];

  logEntry.setColor(bot.cfg.embed.default)
    .setIcon(await ob.Assets.getIcon(`ICO_pencil`, bot.cfg.embed.default))
    .setTitle(`Message Updated`, `Message Update Report`)
    .setDescription(desc.join(`\n`), desc.join(` `))
    .addSection(`Author`, m.author)
    .addSection(`Message Location`, m);

  embed.setColor(bot.cfg.embed.warn)
    .setAuthor(`Pinned Message Updated`, await ob.Assets.getIcon(`ICO_pencil`, bot.cfg.embed.warn))
    .setTitle(`Message posted by ${m.author.tag}`)
    .setThumbnail(m.author.displayAvatarURL({ format: `png`, size: 64 }));

  /////////////////////////////
  // text content
  /////////////////////////////

  if (m.content !== mNew.content) {
    postInChannel = true;

    if (m.content.length !== 0) {
      logEntry.addSection(`Old Message Contents`, m.content);
    } else {
      logEntry.addSection(`Old Message Contents`, {
        data: `\u200B`,
        raw: ``
      });
    }

    if (mNew.content.length !== 0) {
      logEntry.addSection(`New Message Contents`, mNew.content);
      
      embed.setDescription(mNew.content);

    } else {
      logEntry.addSection(`New Message Contents`, {
        data: `\u200B`,
        raw: ``
      });

      embed.setDescription(`_ _`);
    }
  } else if (m.content.length !== 0) {
    logEntry.addSection(`Message Contents`, m.content);
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
    logEntry.addSection(`Message Attachments`, {
      data: att.join(`\n`),
      raw: att_raw.join(`\n`)
    });
    embed.addField(`Message Attachments`, att.join(`\n`));
  }

  /////////////////////////////
  // embeds
  /////////////////////////////

  let rawEmbeds = [];

  for (let i = 0; i < m.embeds.length; i++) {
    rawEmbeds.push(util.inspect(m.embeds[i], { showHidden: true, getters: true }));
    if (i + 1 < m.embeds.length) {
      rawEmbeds.push(``);
    } else {
      rawEmbeds = rawEmbeds.join(`\n`);
    }
  }

  const embedsUpdated = JSON.stringify(m.embeds) !== JSON.stringify(mNew.embeds);

  if (embedsUpdated) {
    let rawEmbedsNew = [];

    for (let i = 0; i < mNew.embeds.length; i++) {
      rawEmbedsNew.push(util.inspect(mNew.embeds[i], { showHidden: true, getters: true }));
      if (i + 1 < mNew.embeds.length) {
        rawEmbedsNew.push(``);
      } else {
        rawEmbedsNew = rawEmbedsNew.join(`\n`);
      }
    }

    logEntry.addSection(`Old Message Embeds`, {
      data: `[${m.embeds.length} Embed${(m.embeds.length !== 1) ? `s` : ``}]`,
      raw: rawEmbeds
    }).addSection(`New Message Embeds`, {
      data: `[${mNew.embeds.length} Embed${(mNew.embeds.length !== 1) ? `s` : ``}]`,
      raw: rawEmbedsNew
    });
  } else if (m.embeds.length > 0) {
    logEntry.addSection(`Message Embeds`, {
      data: `[${m.embeds.length} Embed${(m.embeds.length !== 1) ? `s` : ``}]`,
      raw: rawEmbeds
    });
  }

  logEntry.submit();

  embed.addField(`Message URL`, `[[link]](${m.url})`);

  if (postInChannel && m.pinned && mNew.pinned) bot.send(mNew, { embed, userDelete: false });
};
const util = require(`util`);
const timeago = require(`timeago.js`);
const ob = require(`../core/OptiBot.js`);

const bot = ob.memory.core.client;
const log = ob.log;

module.exports = (ms) => {
  const now = new Date();

  if (!bot.available) return;

  log(`messageDeleteBulk event fired`, `warn`); // testing #243

  bot.setTimeout(() => {
    const messages = [...ms.values()];

    log(`bulk message counts: ${ms.size}, ${messages.length} (${ms.size === messages.length})`, `warn`);

    let i = 0;
    (function postNext() {
      if (i >= messages.length) return;

      const m = messages[i];
      log(util.inspect(m));

      if (m.type !== `DEFAULT` || m.system || m.author.system || m.author.bot || m.author.id === bot.user.id || bot.cfg.channels.nolog.some(id => [m.channel.id, m.channel.parentID].includes(id))) {
        i++;
        return postNext();
      }

      const logEntry = new ob.LogEntry({ time: now, channel: `delete` });

      const desc = [
        `Message originally posted on ${m.createdAt.toUTCString()}`,
        `(${timeago.format(m.createdAt)})`
      ];

      logEntry.setColor(bot.cfg.colors.error)
        .setIcon(ob.Assets.getEmoji(`ICO_trash`).url)
        .setTitle(`(Bulk ${i + 1}/${messages.length}) Message Deleted`, `Bulk Message ${i + 1}-${messages.length} Deletion Report`)
        .setDescription(desc.join(`\n`), desc.join(` `))
        .addSection(`Author`, m.author)
        .addSection(`Message Location`, m);

      if (m.content.length > 0) {
        logEntry.addSection(`Message Contents`, m.content);
      }

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
      }

      if (m.embeds.length > 0) {
        let rawEmbeds = [];

        for (let i = 0; i < m.embeds.length; i++) {
          rawEmbeds.push(util.inspect(m.embeds[i], { showHidden: true, getters: true }));
          if (i + 1 < m.embeds.length) {
            rawEmbeds.push(``);
          } else {
            rawEmbeds = rawEmbeds.join(`\n`);
          }
        }

        logEntry.addSection(`Message Embeds`, {
          data: `[${m.embeds.length} Embed${(m.embeds.length > 1) ? `s` : ``}]`,
          raw: rawEmbeds
        });
      }

      logEntry.submit().then(() => {
        i++;
        postNext();
      }).catch(err => {
        bot.util.err(err);

        i++;
        postNext();
      });
    })();
  }, 5000);
};
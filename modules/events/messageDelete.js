
const util = require(`util`);
const timeago = require(`timeago.js`);
const ob = require(`../core/OptiBot.js`);

const bot = ob.memory.core.client;
const log = ob.log;

module.exports = (m) => {
  const now = new Date();
  if (bot.pause) return;
  if (m.channel.type === `dm`) return;
  if (m.type !== `DEFAULT` || m.system || m.author.system) return;
  if (m.author.system || m.author.bot) return;
  if (m.guild.id !== bot.mainGuild.id) return;
  if (bot.util.parseInput(m.content).cmd === `dr`) return;
  if (bot.cfg.channels.nolog.some(id => [m.channel.id, m.channel.parentID].includes(id))) return;

  ob.memory.rdel.push(m.id);

  const logEntry = new ob.LogEntry({ time: now, channel: `delete` })
    .preLoad();

  bot.setTimeout(() => {
    log(`begin calculation of executor`, `trace`);
    bot.mainGuild.fetchAuditLogs({ limit: 10, type: `MESSAGE_DELETE` }).then((audit) => {

      const ad = [...audit.entries.values()];

      let dlog = null;
      let clog = null;
      let dType = 0;
      // 0 = author
      // 1 = moderator

      for (let i = 0; i < ad.length; i++) {
        if (ad[i].target.id === m.author.id) {
          dlog = ad[i];

          for (let i = 0; i < ob.memory.audit.log.length; i++) {
            if (ob.memory.audit.log[i].id === dlog.id && clog === null) {
              clog = ob.memory.audit.log[i];
            }

            if (i + 1 === ob.memory.audit.log.length) {
              if (dlog !== null && clog === null) {
                dType = 1;
                finalLog();
              } else if (dlog === null && clog === null) {
                finalLog();
              } else if (dlog === null && clog !== null) {
                finalLog();
              } else if (dlog !== null && clog !== null) {
                if (dlog.extra.count > clog.extra.count) {
                  dType = 1;
                  finalLog();
                } else {
                  finalLog();
                }
              }
            }
          }
          break;
        } else if (i + 1 === ad.length) {
          // deleted message does not exist in audit log, therefore it was deleted by the author
          finalLog();
        }
      }

      function finalLog() {
        ob.memory.audit.log = [...audit.entries.values()];
        ob.memory.audit.time = new Date();

        const desc = [
          `Message originally posted on ${m.createdAt.toUTCString()}`,
          `(${timeago.format(m.createdAt)})`
        ];

        logEntry.setColor(bot.cfg.embed.error)
          .setIcon(ob.Assets.getEmoji(`ICO_trash`).url)
          .setTitle(`Message Deleted`, `Message Deletion Report`)
          .setDescription(desc.join(`\n`), desc.join(` `))
          .addSection(`Author`, m.author);

        if (dType === 1) {
          logEntry.addSection(`(Likely) Deleted By`, dlog.executor);
        } else if ((m.member !== null && m.member.deleted) || (!m.member)) {
          logEntry.addSection(`(Likely) Deleted By`, `Unknown (Possibly deleted during a ban)`);
        } else {
          logEntry.addSection(`(Likely) Deleted By`, `Author`);
        }

        logEntry.addSection(`Message Location`, m);

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

        logEntry.submit();

        ob.memory.rdel.splice(ob.memory.rdel.indexOf(m.id), 1);
      }
    }).catch(err => {
      logEntry.error(err);
    });
  }, 500);
};
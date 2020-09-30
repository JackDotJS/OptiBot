const util = require('util');
const timeago = require('timeago.js');
const ob = require('../modules/core/OptiBot.js');

module.exports = (bot, mr, user) => {
  const now = new Date();
  if (bot.pause) return;
  if (mr.message.channel.type === 'dm') return;
  if (user.id === bot.user.id) return;

  const isOptiFine = (mr.message.guild.id === bot.cfg.guilds.optifine);

  if (mr.emoji.id === bot.cfg.emoji.deleter) {
    const del = (docs, mod, orguser) => {
      if (mr.message.content.indexOf(bot.cfg.messages.confirmDelete) > -1) {
        const logEntry = new ob.LogEntry({ time: now, channel: 'delete' });

        if (isOptiFine) logEntry.preLoad();

        mr.message.delete().then((bm) => {
          ob.Memory.db.msg.remove(docs[0], {}, (err) => {
            if (err) {
              if (isOptiFine) logEntry.error(err);
              else ob.OBUtil.err(err);
            } else {
              const desc = [
                `Message originally posted on ${bm.createdAt.toUTCString()}`,
                `(${timeago.format(bm.createdAt)})`
              ];

              logEntry.setColor(bot.cfg.embed.error)
                .setIcon(ob.Assets.getEmoji('ICO_trash').url)
                .setTitle('OptiBot Message Deleted', 'OptiBot Message Deletion Report')
                .setDescription(desc.join('\n'), desc.join(' '))
                .addSection('Deleted by', user);

              if (mod) {
                if (orguser) {
                  logEntry.addSection('Original Author', orguser);
                } else {
                  logEntry.addSection('Original Author', 'Unknown.');
                }
              }

              logEntry.addSection('Message Location', bm);

              if (bm.content.length > 0 && bm.content !== '_ _' && bm.content !== bot.cfg.messages.confirmDelete) {
                logEntry.addSection('Message Contents', bm.content);
              }

              const att = [];
              const att_raw = [];
              if (bm.attachments.size > 0) {
                bm.attachments.each(a => {
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

              if (bm.embeds.length > 0) {
                let rawEmbeds = [];

                for (let i = 0; i < bm.embeds.length; i++) {
                  rawEmbeds.push(util.inspect(bm.embeds[i], { showHidden: true, getters: true }));
                  if (i + 1 < bm.embeds.length) {
                    rawEmbeds.push('');
                  } else {
                    rawEmbeds = rawEmbeds.join('\n');
                  }
                }

                logEntry.addSection('Message Embeds', {
                  data: `[${bm.embeds.length} Embed${(bm.embeds.length > 1) ? 's' : ''}]`,
                  raw: rawEmbeds
                });
              }

              if (isOptiFine) logEntry.submit();
            }
          });
        }).catch(err => {
          if (isOptiFine) logEntry.error(err);
          else ob.OBUtil.err(err);
        });
      } else {
        let nm = `${mr.message.content}\n\n${bot.cfg.messages.confirmDelete}`;
        if (nm.length === 2000 /* incredibly unlikely, but better safe than sorry */ || mr.message.content.length === 0 || mr.message.content === '_ _') {
          nm = bot.cfg.messages.confirmDelete;
        }

        mr.message.edit(nm).catch(err => {
          ob.OBUtil.err(err);
        });
      }
    };

    ob.Memory.db.msg.find({ message: mr.message.id }, (err, docs) => {
      if (err) {
        ob.OBUtil.err(err);
      } else if (docs[0] && docs[0].user === user.id) {
        del(docs);
      } else {
        const mem = bot.mainGuild.members.cache.get(user.id);
        if (mem && mem.roles.cache.has(bot.cfg.roles.moderator)) {
          if (docs[0]) {
            const org = bot.mainGuild.members.cache.get(docs[0].user);

            if (!org) {
              bot.users.fetch(docs[0].user).then((org) => {
                del(docs, true, org);
              });
            } else {
              del(docs, true, org);
            }
          } else {
            del(docs, true);
          }
        }
      }
    });
  }
};
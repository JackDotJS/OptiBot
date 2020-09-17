const path = require('path');
const djs = require('discord.js');
const timeago = require('timeago.js');
const { Command, OBUtil, Memory, RecordEntry, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  aliases: ['modrecords', 'modlog'],
  short_desc: 'View a moderator\'s audit log.',
  long_desc: 'Displays a brief summary of a given user\'s recent actions as a moderator.',
  args: [
    '<discord member> [page #] ["full"]',
    '<discord member> ["full"] [page #]',
  ],
  authlvl: 1,
  flags: ['DM_OPTIONAL', 'MOD_CHANNEL_ONLY', 'LITE'],
  run: null
};

metadata.run = (m, args, data) => {
  if (!args[0]) {
    OBUtil.missingArgs(m, metadata);
  } else {
    let selectPage = 1;
    const caseid = (args[1]) ? parseInt(args[1], 36) : 0;
    let viewAll = false;

    if ((args[1] && args[1].toLowerCase() === 'full') || (args[2] && args[2].toLowerCase() === 'full')) {
      viewAll = true;
    }

    if (args[1] && !isNaN(args[1])) {
      selectPage = parseInt(args[1]);
    } else
    if (args[2] && !isNaN(args[2])) {
      selectPage = parseInt(args[2]);
    }

    OBUtil.parseTarget(m, 0, args[0], data.member).then((result) => {
      if (!result) {
        OBUtil.err('You must specify a valid user.', { m: m });
      } else
      if (result.type === 'notfound') {
        OBUtil.err('Unable to find a user.', { m: m });
      } else
      if (result.id === bot.user.id) {
        OBUtil.err('Nice try.', { m: m });
      } else {
        function getLogs() {
          // TODO: this MAY be a temporary solution.
          //
          // ideally we wouldn't be searching the entire database for this data,
          // instead we'd be reading directly from the given moderator's profile data.
          //
          // however, i'm trying to figure out if keeping two copies of what is 
          // essentially the same data in two completely separate profiles is really a good idea.
          //
          // a better solution might be to search the entire database on startup and cache the data in Memory.
          // i'll look into this later.

          return new Promise((resolve, reject) => {
            const logs = [];
            Memory.db.profiles.find({ format: 3, 'edata.record': { $exists: true } }, (err, docs) => {
              if (err) return OBUtil.err(err, { m: m });

              let i = 0;
              (function checkRecord() {
                for (const entry of docs[i].edata.record) {
                  if (entry.moderator === result.id) {
                    entry.userid = docs[i].id;
                    logs.push(entry);
                  }
                }
                i++;
                if (i === docs.length) {
                  logs.sort((a, b) => a.date - b.date);

                  log(logs);
                  resolve(logs);
                } else {
                  checkRecord();
                }
              })();
            });
          });
        }

        getLogs().then((modlog) => {
          const footer = [
            'Note that existing actions before October 30, 2019 will not show here.',
            'All records before August 5, 2020 may be missing information.'
          ];

          const embed = new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle(result.tag);

          if (result.type !== 'id') {
            embed.setDescription([
              `Mention: ${result.mention}`,
              `\`\`\`yaml\nID: ${result.id}\`\`\``
            ].join('\n'));
          }

          if (result.type !== 'id') {
            embed.setThumbnail(((result.type === 'user') ? result.target : result.target.user).displayAvatarURL({ format: 'png' }));
          }

          let title = 'Moderator Audit Log';

          if (modlog.length === 0) {
            embed.setAuthor(title, Assets.getEmoji('ICO_docs').url)
              .addField('Record Statistics', 'This user has no moderation actions on record.')
              .setFooter(footer.join('\n'));

            return m.channel.send({ embed: embed }).then(bm => OBUtil.afterSend(bm, m.author.id));
          }

          let pageNum = selectPage;
          const perPage = 4;
          const pageLimit = Math.ceil(modlog.length / perPage);
          if (selectPage < 0 || selectPage > pageLimit) {
            pageNum = 1;
          }

          modlog.reverse();

          title += ` | Page ${pageNum}/${pageLimit}`;

          const stats = [
            `**Total Audit Log Size**: ${modlog.length.toLocaleString()}`
          ];

          let pardonedCount = 0;

          for (const entry of modlog) {
            if (entry.pardon) {
              pardonedCount++;
            }
          }

          stats.push(
            `**Total Pardoned Entries**: ${pardonedCount.toLocaleString()}`
          );

          let i = (pageNum > 1) ? (perPage * (pageNum - 1)) : 0;
          let added = 0;
          let hidden = 0;
          (function addEntry() {
            const entry = new RecordEntry(modlog[i]);
            const details = [
              `**Case ID: [${entry.display.id}](${m.url.replace(/\/\d+$/, '')})**`
            ];

            function next() {
              if (added >= perPage || i + 1 >= modlog.length) {
                if (hidden > 0) {
                  stats[1] += ` (${hidden} on this page)`;
                }

                if (pardonedCount === modlog.length) {
                  stats.push(
                    `**[NOTICE: All of this moderator's actions have been pardoned.](${m.url.replace(/\/\d+$/, '')})**`
                  );
                }

                embed.setAuthor(title, Assets.getEmoji('ICO_docs').url)
                  .setFooter(footer.join('\n'))
                  .fields.unshift({
                    name: 'Audit Log Information',
                    value: stats.join(`${Assets.getEmoji('ICO_space')}\n`) + `${Assets.getEmoji('ICO_space')}`
                  });

                m.channel.send({ embed: embed }).then(bm => OBUtil.afterSend(bm, m.author.id));
              } else {
                i++;
                addEntry();
              }
            }

            if (entry.edits && footer.length < 3) {
              footer.push(
                '',
                'Edited entries prefixed with an asterisk (*)',
              );
            }

            if (entry.pardon) {
              if (!viewAll) {
                if ((added + hidden) < perPage) {
                  hidden++;
                }
                return next();
              }

              const reason = `> **${(entry.action !== 0) ? 'Reason' : 'Note Contents'}:**${Assets.getEmoji('ICO_space')}\n> ${entry.pardon.reason.split('\n').join('\n> ')}`;

              details.push(
                `**Pardoned By:** ${(entry.pardon.admin === result.id) ? 'Self' : `<@${entry.pardon.admin}>`}`,
                `**When:** ${timeago.format(entry.pardon.date)}`
              );

              if (entry.pardon.reason.length > 128) {
                details.push(reason.substring(0, 125).trim() + '...'); // 125 because the "..." takes up three characters
              } else {
                details.push(reason);
              }
            } else {
              const reason = `> **${(entry.action !== 0) ? 'Reason' : 'Note Contents'}:**${Assets.getEmoji('ICO_space')}\n> ${entry.reason.split('\n').join('\n> ')}`;

              details.push(
                `**Member:** <@${modlog[i].userid}>`,
                `**When:** ${timeago.format(entry.date)}`
              );

              if (entry.action === 5) {
                details.push(`**Amount:** ${entry.display.pointsTotal.toLocaleString()}` + ((entry.display.pointsTotal != entry.display.pointsNow) ? `(now: ${entry.display.pointsNow})` : ''));
              }

              if (entry.reason.length > 128) {
                details.push(reason.substring(0, 128).trim() + '...');
              } else {
                details.push(reason);
              }
            }

            embed.addField(`${entry.display.icon} ${(entry.edits) ? '**' : ''}${entry.display.action}${(entry.edits) ? '*' : ''} ${entry.pardon ? '**(PARDONED)**' : ''}`, details.join(`${Assets.getEmoji('ICO_space')}\n`));

            added++;

            next();
          })();
        });
      }
    }).catch(err => OBUtil.err(err, { m: m }));
  }
};

module.exports = new Command(metadata);
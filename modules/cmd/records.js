const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const timeago = require(`timeago.js`);
const { Command, memory, RecordEntry, Assets } = require(`../core/modules.js`);

const bot = memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  aliases: [`record`, `history`],
  description: {
    short: `View a user's record.`,
    long: `View a user's violation history.`
  },
  args: [
    `<discord member> [page #] ["full"]`,
    `<discord member> ["full"] [page #]`,
    `<discord member> [case ID]`
  ],
  dm: true,
  flags: [ `STAFF_CHANNEL_ONLY`, `LITE` ],
  dperm: `MANAGE_GUILD`,
  run: null
};

metadata.run = (m, args, data) => {
  if (!args[0]) {
    bot.util.missingArgs(m, metadata);
  } else {
    let selectPage = 1;
    const caseid = (args[1]) ? parseInt(args[1], 36) : 0;
    let viewAll = false;

    if ((args[1] && args[1].toLowerCase() === `full`) || (args[2] && args[2].toLowerCase() === `full`)) {
      viewAll = true;
    }

    if (args[1] && !isNaN(args[1])) {
      selectPage = parseInt(args[1]);
    } else if (args[2] && !isNaN(args[2])) {
      selectPage = parseInt(args[2]);
    }

    bot.util.parseTarget(m, 0, args[0], data.member).then((result) => {
      if (!result) {
        bot.util.err(`You must specify a valid user.`, { m });
      } else if (result.type === `notfound`) {
        bot.util.err(`Unable to find a user.`, { m });
      } else if (result.id === bot.user.id) {
        bot.util.err(`Nice try.`, { m });
      } else {
        bot.util.getProfile(result.id, false).then(profile => {
          const footer = [
            `Note that existing violations before October 30, 2019 will not show here.`,
            `All records before August 5, 2020 may be missing information.`
          ];

          let embed = new djs.MessageEmbed()
            .setColor(bot.cfg.colors.default)
            .setTitle(result.tag);

          if (result.type !== `id`) {
            embed.setDescription([
              `Mention: ${result.mention}`,
              `\`\`\`yaml\nID: ${result.id}\`\`\``
            ].join(`\n`));
          }

          if (result.type !== `id`) {
            embed.setThumbnail(((result.type === `user`) ? result.target : result.target.user).displayAvatarURL({ format: `png` }));
          }

          let title = `Member Records`;

          if (!profile || !profile.edata.record) {
            embed.setAuthor(title, Assets.getEmoji(`ICO_docs`).url)
              .addField(`Record Statistics`, `This user has no known record.`)
              .setFooter(footer.join(`\n`));

            bot.send(m, { embed });
          } else if (!isNaN(caseid) && caseid > 1420070400000 && caseid < new Date().getTime()) {
            // INDIVIDUAL ENTRY

            log(`lookup case id: ${caseid}`);

            profile.getRecord(caseid).then(entry => {
              if (!entry) {
                bot.util.err(`Unable to find case ID "${caseid}".`, { m });
              } else {
                log(util.inspect(entry));

                const mod = `${entry.moderator} | ${entry.moderator.tag}\n\`\`\`yaml\nID: ${entry.moderator.id}\`\`\``;

                footer.shift();

                embed = new djs.MessageEmbed()
                  .setColor(bot.cfg.colors.default)
                  .setAuthor(title + ` | Single Entry`, Assets.getEmoji(`ICO_docs`).url)
                  .setTitle(`Case ID: ${entry.display.id} ${(entry.pardon) ? `(PARDONED)` : ``}`)
                  .setDescription(`${new Date(entry.date).toUTCString()} \n(${timeago.format(entry.date)})`)
                  .addField(`Member`, [
                    `${result.mention} | ${result.tag}`,
                    `\`\`\`yaml\nID: ${result.id}\`\`\``
                  ].join(`\n`))
                  .addField(`Moderator Responsible`, mod)
                  .addField(`Command Location`, (entry.url !== null) ? `[Direct URL](${entry.url})` : `Unavailable.`)
                  .addField(`Action`, `${entry.display.icon} ${entry.display.action}`)
                  .addField(`${isEdited(`reason`, entry)}${(entry.action !== 0) ? `Reason` : `Note Contents`}`, (!entry.reason) ? `No reason provided.` : entry.reason);

                if (result.type !== `id`) {
                  embed.setThumbnail(((result.type === `user`) ? result.target : result.target.user).displayAvatarURL({ format: `png` }));
                }

                if (entry.edits) {
                  const lastEdit = entry.edits.history[entry.edits.history.length - 1];
                  footer.push(
                    ``,
                    `Edited sections prefixed with an asterisk (*)`,
                    `Last updated on ${new Date(lastEdit.date)} \n(${timeago.format(lastEdit.date)})`
                  );
                }

                if (entry.action === 5 && entry.actionType === 1) {
                  embed.addField(`Marks (w/ Calculated Decay)`, entry.display.pointsNow);
                }

                if (entry.details) embed.addField(`${isEdited(`details`, entry)}Additional Information`, entry.details);

                if (entry.pardon) {
                  const adm = `${entry.pardon.admin} | ${entry.pardon.admin.tag}\n\`\`\`yaml\nID: ${entry.pardon.admin.id}\`\`\``;

                  embed.addField(`(Pardon) Administrator Responsible`, adm)
                    .addField(`(Pardon) Command Location`, (entry.pardon.url !== null) ? `[Direct URL](${entry.pardon.url})` : `Unavailable.`)
                    .addField(`(Pardon) Date & Time (UTC)`, `${new Date(entry.pardon.date).toUTCString()} \n(${timeago.format(entry.pardon.date)})`)
                    .addField(`(Pardon) ${isEdited(`pardon`, entry)}Reason`, entry.pardon.reason);
                }

                if (entry.parent) embed.addField(`${isEdited(`parent`, entry)}Parent Case ID`, entry.display.parent);

                if (entry.children.length > 0) embed.addField(`Linked Case ID(s)`, entry.display.children.join(`\n`));

                embed.setFooter(footer.join(`\n`));

                bot.send(m, { embed });
              }
            });
          } else {

            // ALL ENTRIES

            const record = profile.edata.record;
            let pageNum = selectPage;
            const perPage = 4;
            const pageLimit = Math.ceil(record.length / perPage);
            if (selectPage < 0 || selectPage > pageLimit) {
              pageNum = 1;
            }

            record.reverse();

            title += ` | Page ${pageNum}/${pageLimit}`;

            const stats = [
              `**Total Record Size**: ${record.length.toLocaleString()}`
            ];

            let pardonedCount = 0;
            const points = profile.getPoints();

            for (const entry of record) {
              if (entry.pardon) {
                pardonedCount++;
              }
            }

            stats.push(
              `**Pardoned Entries**: ${pardonedCount.toLocaleString()}`,
              `**Violation Marks (Maximum)**: ${points.maximum.toLocaleString()}/${bot.cfg.points.userMax.toLocaleString()} ${(points.maximum >= bot.cfg.points.userMax) ? Assets.getEmoji(`ICO_warn`).toString() : ``}`,
              `**Violation Marks (Current)**: ${points.current.toLocaleString()}/${bot.cfg.points.userMax.toLocaleString()} ${(points.current >= bot.cfg.points.userMax) ? Assets.getEmoji(`ICO_warn`).toString() : ``}`,
              `**Violation Marks (Minimum)**: ${points.minimum.toLocaleString()}/${bot.cfg.points.userMax.toLocaleString()} ${(points.minimum >= bot.cfg.points.userMax) ? Assets.getEmoji(`ICO_warn`).toString() : ``}`
            );

            let i = (pageNum > 1) ? (perPage * (pageNum - 1)) : 0;
            let added = 0;
            let hidden = 0;
            (function addEntry() {
              const entry = new RecordEntry(record[i]);
              const details = [
                `**Case ID: [${entry.display.id}](${m.url.replace(/\/\d+$/, ``)})**`
              ];

              function next() {
                if (added >= perPage || i + 1 >= record.length) {
                  if (hidden > 0) {
                    stats[1] += ` (${hidden} on this page)`;
                  }

                  if (pardonedCount === record.length) {
                    stats.push(
                      `**[NOTICE: All of this user's record entries have been pardoned.](${m.url.replace(/\/\d+$/, ``)})**`
                    );
                  }

                  embed.setAuthor(title, Assets.getEmoji(`ICO_docs`).url)
                    .setFooter(footer.join(`\n`))
                    .fields.unshift({
                      name: `Record Information`,
                      value: stats.join(`${Assets.getEmoji(`ICO_space`)}\n`) + `${Assets.getEmoji(`ICO_space`)}`
                    });

                  bot.send(m, { embed });
                } else {
                  i++;
                  addEntry();
                }
              }

              if (entry.edits && footer.length < 3) {
                // eslint-disable-next-line no-unused-vars
                const lastEdit = entry.edits.history[entry.edits.history.length - 1]; // Was this meant to be used somewhere?
                footer.push(
                  ``,
                  `Edited entries prefixed with an asterisk (*)`,
                );
              }

              if (entry.pardon) {
                if (!viewAll) {
                  if ((added + hidden) < perPage) {
                    hidden++;
                  }
                  return next();
                }

                const reason = `> **${(entry.action !== 0) ? `Reason` : `Note Contents`}:**${Assets.getEmoji(`ICO_space`)}\n> ${entry.pardon.reason.split(`\n`).join(`\n> `)}`;

                details.push(
                  `**Pardoned By:** <@${entry.pardon.admin}>`,
                  `**When:** ${timeago.format(entry.pardon.date)}`
                );

                if (entry.pardon.reason.length > 128) {
                  details.push(reason.substring(0, 125).trim() + `...`);
                } else {
                  details.push(reason);
                }
              } else {
                const reason = `> **${(entry.action !== 0) ? `Reason` : `Note Contents`}:**${Assets.getEmoji(`ICO_space`)}\n> ${entry.reason.split(`\n`).join(`\n> `)}`;

                details.push(
                  `**Moderator:** <@${entry.moderator}>`,
                  `**When:** ${timeago.format(entry.date)}`
                );

                if (entry.action === 5) {
                  details.push(`**Amount:** ${entry.display.pointsTotal.toLocaleString()} ` + ((entry.display.pointsTotal != entry.display.pointsNow) ? `(now: ${entry.display.pointsNow})` : ``));
                }

                if (entry.reason.length > 128) {
                  details.push(reason.substring(0, 125).trim() + `...`);
                } else {
                  details.push(reason);
                }
              }

              embed.addField(`${entry.display.icon} ${(entry.edits) ? `**` : ``}${entry.display.action}${(entry.edits) ? `*` : ``} ${entry.pardon ? `**(PARDONED)**` : ``}`, details.join(`${Assets.getEmoji(`ICO_space`)}\n`));

              added++;

              next();
            })();
          }
        }).catch(err => bot.util.err(err, { m }));
      }
    }).catch(err => bot.util.err(err, { m }));
  }
};

function isEdited(key, entry) {
  if (entry.edits && entry.edits.original[key]) {
    return `*`;
  } else {
    return ``;
  }
}

module.exports = new Command(metadata);
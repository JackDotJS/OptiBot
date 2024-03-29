const path = require(`path`);
const djs = require(`discord.js`);
const { Command, memory, LogEntry, Assets } = require(`../core/modules.js`);

const bot = memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  aliases: [`rmnote`, `removenote`],
  description: {
    short: `Remove a note from someone's record.`,
    long: `Removes a note from someone's record. With the exception of Administrators, notes can only be removed by the note author.`
  },
  args: `<discord member> <case ID>`,
  dm: false,
  flags: [ `STRICT`, `STAFF_CHANNEL_ONLY`, `LITE` ],
  dperm: `MANAGE_GUILD`,
  run: null
};

metadata.run = (m, args, data) => {
  if (!args[1]) return bot.util.missingArgs(m, metadata);

  bot.util.parseTarget(m, 0, args[0], data.member).then((result) => {
    if (!result) {
      bot.util.err(`You must specify a valid user.`, { m });
    } else if (result.type === `notfound`) {
      bot.util.err(`Unable to find a user.`, { m });
    } else /* if (bot.util.getAuthlvl(result.target) > data.authlvl) {
      bot.util.err(`You are not strong enough to modify this user's record.`, { m });
    } else  */if (result.id === m.author.id || result.id === bot.user.id) {
      bot.util.err(`Nice try.`, { m });
    } else {
      bot.util.getProfile(result.id, false).then(profile => {
        if (!profile.edata.record) {
          return bot.util.err(`This user does not have a record.`, { m });
        }

        profile.getRecord(args[1]).then((entry) => {
          if (!entry || !entry.index) {
            return bot.util.err(`Unable to find case ID "${args[1]}".`, { m });
          }

          if (entry.action !== 0) {
            return bot.util.err(`Record entry "${args[1]}" is not a note.`, { m });
          }

          if (entry.moderator !== m.author.id && data.authlvl < 4) {
            return bot.util.err(`You do not have permission to modify this entry.`, { m });
          }

          const embed = new djs.MessageEmbed()
            .setAuthor(`Are you sure?`, Assets.getEmoji(`ICO_warn`).url)
            .setColor(bot.cfg.colors.default)
            .setDescription([
              `The following note will be removed:`,
              `> **Note Contents:**`,
              `> ${entry.reason.split(`\n`).join(`${Assets.getEmoji(`ICO_space`)}\n> `)}`
            ].join(`${Assets.getEmoji(`ICO_space`)}\n`))
            .setFooter(`This action CANNOT be undone.`);

          bot.send(m, { embed, delayControl: true }).then(bres => {
            const msg = bres.msg;

            bot.util.confirm(m, msg).then(res => {
              if (res === 1) {
                log(`removing 1 element at index ${entry.index}`);
                log(`record size: ${profile.edata.record.length}`);
                profile.edata.record.splice(entry.index, 1);

                bot.util.updateProfile(profile).then(() => {
                  const logEntry = new LogEntry({ channel: `moderation` })
                    .setColor(bot.cfg.colors.error)
                    .setIcon(Assets.getEmoji(`ICO_trash`).url)
                    .setTitle(`Moderation Note Deleted`, `Moderation Note Deleted Report`)
                    .addSection(`Member`, result.target)
                    .addSection(`Record Entry`, entry)
                    .addSection(`Note Author`, entry.moderator);

                  if (m.author.id !== entry.moderator.id) {
                    logEntry.addSection(`Deleted by`, m.author);
                  } else {
                    logEntry.addSection(`Deleted by`, `Author`);
                  }

                  logEntry.addSection(`Command Location`, m)
                    .addSection(`Note Contents`, entry.reason)
                    .submit().then(() => {
                      const embed = new djs.MessageEmbed()
                        .setAuthor(`Note Removed.`, Assets.getEmoji(`ICO_okay`).url)
                        .setColor(bot.cfg.colors.okay);

                      msg.edit({ embed: embed });
                    });
                }).catch(err => bot.util.err(err, { m }));
              } else if (res === 0) {
                const update = new djs.MessageEmbed()
                  .setAuthor(`Cancelled`, Assets.getEmoji(`ICO_load`).url)
                  .setColor(bot.cfg.colors.default)
                  .setDescription(`${result.mention}'s profile has not been changed.`);

                msg.edit({ embed: update }).then(() => bres.addControl);
              } else {
                const update = new djs.MessageEmbed()
                  .setAuthor(`Timed out`, Assets.getEmoji(`ICO_load`).url)
                  .setColor(bot.cfg.colors.default)
                  .setDescription(`Sorry, you didn't respond in time. Please try again.`);

                msg.edit({ embed: update }).then(() => bres.addControl);
              }
            }).catch(err => {
              bot.util.err(err, { m });
            });
          });
        });
      }).catch(err => bot.util.err(err, { m }));
    }
  }).catch(err => bot.util.err(err, { m }));
};

module.exports = new Command(metadata);
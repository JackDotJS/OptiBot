const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const { Command, memory, LogEntry, Assets } = require(`../core/modules.js`);

const bot = memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  aliases: [`editrec`, `updaterecord`],
  description: {
    short: `Edit an existing record entry.`,
    long: [
      `Edits an existing record entry. With the exception of Administrators, records can only be modified by the same moderator who's responsible for its creation.`,
      ``,
      `Valid properties include:`,
      `**\`reason\`** - The reason for this action.`,
      `**\`details\`** - The details of the case.`,
      `**\`parent\`** - The parent case ID.`,
      `**\`pardon\`** - (Administrators only) The reason for pardoning this action.`,
    ].join(`\n`)
  },
  args: `<discord member> <case ID> <property> [new value]`,
  dm: false,
  flags: [ `STRICT`, `PERMS_REQUIRED`, `STAFF_CHANNEL_ONLY`, `LITE`],
  run: null
};

metadata.run = (m, args, data) => {
  if (!args[2]) return bot.util.missingArgs(m, metadata);

  bot.util.parseTarget(m, 0, args[0], data.member).then((result) => {
    if (!result) {
      bot.util.err(`You must specify a valid user.`, { m });
    } else if (result.type === `notfound`) {
      bot.util.err(`Unable to find a user.`, { m });
    } else if (bot.util.getAuthlvl(result.target) > data.authlvl) {
      bot.util.err(`You are not strong enough to modify this user's record.`, { m });
    } else if (result.id === m.author.id || result.id === bot.user.id) {
      bot.util.err(`Nice try.`, { m });
    } else if (![`reason`, `details`, `parent`, `pardon`].includes(args[2].toLowerCase())) {
      bot.util.err(`Invalid property: \`${args[2]}\``, { m });
    } else {
      const value = m.content.substring(`${bot.prefix}${data.input.cmd} ${args[0]} ${args[1]} ${args[2]} `.length).trim();

      if (value.length > 1000) {
        bot.util.err(`New value cannot exceed 1000 characters in length.`, { m });
        return;
      }

      bot.util.getProfile(result.id, false).then(profile => {
        if (!profile.edata.record) {
          return bot.util.err(`This user does not have a record that can be modified.`, { m });
        }

        profile.getRecord(args[1]).then(entry => {
          if (!entry) {
            return bot.util.err(`Unable to find case ID "${args[1]}".`, { m });
          }
          if (entry.moderator.id !== m.author.id && bot.util.getAuthlvl(member, true) !== 4) {
            return bot.util.err(`You do not have permission to modify this entry.`, { m });
          }

          log(util.inspect(entry));
          log(typeof entry.date);

          let property = args[2].toLowerCase();
          let propertyName = null;
          let oldValue = null;
          let newValue = value;

          if (value.length === 0) newValue = null;

          switch (property) {
            case `reason`:
              if (entry.action === 0) return bot.util.err(`Cannot change "reason" property of notes.`, { m });
              propertyName = `Reason`;
              oldValue = entry.reason;

              if (!newValue) {
                newValue = `No reason provided.`;
              } else {
                newValue = value;
              }
              break;
            case `details`:
              if (entry.action === 0) {
                propertyName = `Note Contents`;
                property = `reason`;
                oldValue = entry.reason;
              } else {
                propertyName = `Case Details`;
                oldValue = entry.details;
              }

              if (!newValue) {
                switch (entry.action) {
                  case 0:
                    return bot.util.err(`Cannot remove note contents.`, { m });
                  case 2:
                  case 5:
                    newValue = oldValue.split(`\n`)[0];
                    break;
                }
              } else {
                switch (entry.action) {
                  case 2:
                  case 5:
                    newValue = `${oldValue.split(`\n`)[0]}\n${value}`;
                    break;
                }
              }
              break;
            case `parent`:
              propertyName = `Parent Case ID`;
              oldValue = entry.parent;

              if (!Number.isInteger(parseInt(newValue))) {
                newValue = parseInt(newValue, 36);
              }

              if (isNaN(newValue) || newValue < 1420070400000 || newValue > new Date().getTime()) {
                return bot.util.err(`Invalid case ID.`, { m });
              } else if (newValue === entry.date) {
                return bot.util.err(`Nice try.`, { m });
              }

              break;
            case `pardon`:
              if (data.authlvl < 4) {
                return bot.util.err(`You do not have permission to modify this value.`, { m });
              } else if (!entry.pardon) {
                return bot.util.err(`This entry has not been pardoned.`, { m });
              } else if (!newValue) {
                return bot.util.err(`Cannot remove pardon reason.`, { m });
              } else {
                propertyName = `Pardon Reason`;
                oldValue = entry.pardon.reason;
              }
              break;
          }

          if (oldValue === newValue) {
            return bot.util.err(`New value cannot be the same as the old value.`, { m });
          }

          const cont = () => {
            const embed = new djs.MessageEmbed()
              .setAuthor(`Are you sure?`, Assets.getEmoji(`ICO_warn`).url)
              .setColor(bot.cfg.colors.default)
              .setDescription([
                `The following record entry will be updated:${Assets.getEmoji(`ICO_space`)}`,
                `${entry.display.icon} ${entry.display.action}`,
                `\`\`\`yaml\nID: ${entry.display.id}\`\`\``
              ].join(`\n`))
              .addField(`Old ${propertyName}`, (oldValue) ? oldValue : `<none>`)
              .addField(`New ${propertyName}`, (newValue) ? newValue : `<none>`)
              .setFooter(`This action CANNOT be undone.`);

            bot.send(m, { embed }).then(bres => {
              const msg = bres.msg;

              bot.util.confirm(m, msg).then(res => {
                if (res === 1) {
                  switch (property) {
                    case `reason`:
                      entry.setReason(m.author, newValue);
                      break;
                    case `details`:
                      entry.setDetails(m.author, newValue);
                      break;
                    case `parent`:
                      entry.setParent(m.author, newValue);
                      break;
                    case `pardon`:
                      entry.setPardon(m, newValue);
                      break;
                  }

                  profile.updateRecord(entry).then(() => {
                    bot.util.updateProfile(profile).then(() => {
                      new LogEntry({ channel: `moderation` })
                        .setColor(bot.cfg.colors.default)
                        .setIcon(Assets.getEmoji(`ICO_docs`).url)
                        .setTitle(`Record Entry Edited`, `Record Entry Edit Report`)
                        .addSection(`Member`, result.target)
                        .addSection(`Record Entry`, entry)
                        .addSection(`Editor`, m.author)
                        .addSection(`Old ${propertyName}`, (oldValue) ? oldValue : `<none>`)
                        .addSection(`New ${propertyName}`, (newValue) ? newValue : `<none>`)
                        .submit().then(() => {
                          const embed = new djs.MessageEmbed()
                            .setAuthor(`Record Entry Updated.`, Assets.getEmoji(`ICO_okay`).url)
                            .setColor(bot.cfg.colors.okay)
                            .addField(`Record Entry`, [
                              `${entry.display.icon} ${entry.display.action}`,
                              `\`\`\`yaml\nID: ${entry.display.id}\`\`\``
                            ].join(`\n`))
                            .addField(`Old ${propertyName}`, (oldValue) ? oldValue : `<none>`)
                            .addField(`New ${propertyName}`, (newValue) ? newValue : `<none>`);

                          msg.edit({ embed: embed });
                        });
                    }).catch(err => bot.util.err(err, { m }));
                  });
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
          };

          if (property === `parent`) {
            profile.getRecord(newValue).then(entry => {
              if (entry) {
                cont();
              } else {
                bot.util.err(`New parent case ID does not exist.`, { m });
              }
            });
          } else {
            cont();
          }
        });
      }).catch(err => bot.util.err(err, { m }));
    }
  }).catch(err => bot.util.err(err, { m }));
};

module.exports = new Command(metadata);
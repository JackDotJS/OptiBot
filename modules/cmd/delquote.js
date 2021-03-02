const path = require(`path`);
const djs = require(`discord.js`);
const { Command, memory, LogEntry, Assets } = require(`../core/optibot.js`);

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  aliases: [`unquote`, `rmquote`],
  description: {
    short: `Remove profile quotes.`,
    long: `Removes a quote from a given profile. Requires moderator permissions to remove quotes from other profiles.`
  },
  args: `[discord member]`,
  dm: true,
  flags: [ `BOT_CHANNEL_ONLY`, `LITE` ],
  run: null
};

metadata.run = (m, args, data) => {
  bot.util.parseTarget(m, 0, args[0], data.member).then(result => {
    if (!result || data.authlvl < 2 || result.id === m.author.id) {
      if (!result && args[0] && data.authlvl >= 2) {
        bot.util.err(`You must specify a valid user.`, { m });
      } else {
        bot.util.getProfile(m.author.id, false).then(profile => {
          if (!profile || (profile && !profile.ndata.quote)) {
            bot.util.err(`Your profile does not have a quote message.`, { m });
          } else {
            const embed = new djs.MessageEmbed()
              .setAuthor(`Are you sure?`, Assets.getEmoji(`ICO_warn`).url)
              .setColor(bot.cfg.embed.default)
              .setDescription(`The following quote will be permanently removed from your OptiBot profile: \n> ${profile.ndata.quote}`);

            bot.send(m, { embed }).then(bres => {
              const msg = bres.msg;
              
              bot.util.confirm(m, msg).then(res => {
                if (res === 1) {
                  delete profile.ndata.quote;

                  bot.util.updateProfile(profile).then(() => {
                    const update = new djs.MessageEmbed()
                      .setAuthor(`Success`, Assets.getEmoji(`ICO_okay`).url)
                      .setColor(bot.cfg.embed.okay)
                      .setDescription(`Your profile has been updated.`);

                    msg.edit({ embed: update }).then(() => bres.addControl);
                  });
                } else if (res === 0) {
                  const update = new djs.MessageEmbed()
                    .setAuthor(`Cancelled`, Assets.getEmoji(`ICO_load`).url)
                    .setColor(bot.cfg.embed.default)
                    .setDescription(`Your profile has not been changed.`);

                  msg.edit({ embed: update }).then(() => bres.addControl);
                } else {
                  const update = new djs.MessageEmbed()
                    .setAuthor(`Timed out`, Assets.getEmoji(`ICO_load`).url)
                    .setColor(bot.cfg.embed.default)
                    .setDescription(`Sorry, you didn't respond in time. Please try again.`);

                  msg.edit({ embed: update }).then(() => bres.addControl);
                }
              }).catch(err => {
                bot.util.err(err, { m });
              });
            });
          }
        });
      }
    } else if (result.type === `notfound`) {
      bot.util.err(`Unable to find a user.`, { m });
    } else {
      bot.util.getProfile(result.id, false).then(profile => {
        if (!profile) {
          bot.util.err(`This user does not have a profile.`, { m });
        } else if (!profile || (profile && !profile.ndata.quote)) {
          bot.util.err(`This profile does not have a quote message.`, { m });
        } else {
          const embed = new djs.MessageEmbed()
            .setAuthor(`Are you sure?`, Assets.getEmoji(`ICO_warn`).url)
            .setColor(bot.cfg.embed.default)
            .setDescription(`The following quote will be permanently removed from ${result.mention}'s OptiBot profile: \n> ${profile.ndata.quote}`);

          bot.send(m, { embed }).then(bres => {
            const msg = bres.msg;
            bot.util.confirm(m, msg).then(res => {
              if (res === 1) {
                const logEntry = new LogEntry({ channel: `moderation` })
                  .setColor(bot.cfg.embed.default)
                  .setIcon(Assets.getEmoji(`ICO_warn`).url)
                  .setTitle(`Profile Quote Deleted`, `Profile Quote Deletion Report`)
                  .addSection(`Member`, result.target)
                  .addSection(`Moderator Responsible`, m.author)
                  .addSection(`Command Location`, m);

                if (result.type !== `id`) {
                  logEntry.setThumbnail(((result.type === `user`) ? result.target : result.target.user).displayAvatarURL({ format: `png` }));
                }

                logEntry.addSection(`Quote`, profile.ndata.quote);

                delete profile.ndata.quote;

                bot.util.updateProfile(profile).then(() => {
                  const update = new djs.MessageEmbed()
                    .setAuthor(`Success`, Assets.getEmoji(`ICO_okay`).url)
                    .setColor(bot.cfg.embed.okay)
                    .setDescription(`${result.mention}'s profile has been updated.`);

                  msg.channel.stopTyping(true);
                  logEntry.submit();
                  msg.edit({ embed: update });
                }).catch(err => {
                  logEntry.error(err);
                });
              } else if (res === 0) {
                const update = new djs.MessageEmbed()
                  .setAuthor(`Cancelled`, Assets.getEmoji(`ICO_load`).url)
                  .setColor(bot.cfg.embed.default)
                  .setDescription(`${result.mention}'s profile has not been changed.`);

                msg.edit({ embed: update }).then(() => bres.addControl);
              } else {
                const update = new djs.MessageEmbed()
                  .setAuthor(`Timed out`, Assets.getEmoji(`ICO_load`).url)
                  .setColor(bot.cfg.embed.default)
                  .setDescription(`Sorry, you didn't respond in time. Please try again.`);

                msg.edit({ embed: update }).then(() => bres.addControl);
              }
            }).catch(err => {
              bot.util.err(err, { m });
            });
          });
        }
      });
    }
  });
};

module.exports = new Command(metadata);
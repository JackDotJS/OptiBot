/* eslint-disable no-inner-declarations */
const path = require(`path`);
const djs = require(`discord.js`);
const { Command, memory, RecordEntry, LogEntry, Assets } = require(`../core/modules.js`);

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  aliases: [`ungag`, `unsilence`],
  description: {
    short: `Unmute a user.`,
    long: `Allows a user to speak once again, if they've already been muted.`
  },
  args: `<discord member> [reason]`,
  dm: false,
  flags: [ `LITE` ],
  dperm: `MANAGE_GUILD`,
  run: null
};

metadata.run = (m, args, data) => {
  if (!args[0]) {
    bot.util.missingArgs(m, metadata);
  } else {
    bot.util.parseTarget(m, 0, args[0], data.member).then((result) => {
      if (!result) {
        bot.util.err(`You must specify a valid user to unmute.`, { m });
      } else if (result.type === `notfound` || result.type === `id`) {
        bot.util.err(`Unable to find a user.`, { m });
      } else if (result.id === m.author.id) {
        bot.util.err(`If you're muted, how are you even using this command?`, { m });
      } else if (result.id === bot.user.id) {
        bot.util.err(`I'm a bot. Why would I even be muted?`, { m });
      } else if (bot.util.getAuthlvl(result.target) > 0) {
        bot.util.err(`That user is too powerful to be muted in the first place.`, { m });
      } else if (result.type === `member` && !result.target.roles.cache.has(bot.cfg.roles.muted)) {
        bot.util.err(`That user has not been muted.`, { m });
      } else {
        s2(result);
      }
    });

    function s2(result) {
      const now = new Date().getTime();
      bot.util.getProfile(result.id, true).then(profile => {
        const reason = m.content.substring(`${bot.prefix}${data.input.cmd} ${args[0]} `.length);

        if (!profile.edata.record) profile.edata.record = [];

        const entry = new RecordEntry()
          .setMod(m.author.id)
          .setURL(m.url)
          .setAction(`mute`)
          .setActionType(`remove`)
          .setReason(m.author, (reason.length > 0) ? reason : `No reason provided.`);

        if (profile.edata.mute) {
          const remaining = profile.edata.mute.end - now;
          const minutes = Math.round(remaining / 1000 / 60);
          const hours = Math.round(remaining / (1000 * 60 * 60));
          const days = Math.round(remaining / (1000 * 60 * 60 * 24));
          let time_remaining = null;

          if (minutes < 60) {
            time_remaining = `${minutes} minute${(minutes !== 1) ? `s` : ``}`;
          } else if (hours < 24) {
            time_remaining = `${hours} hour${(hours !== 1) ? `s` : ``}`;
          } else {
            time_remaining = `${days} day${(days !== 1) ? `s` : ``}`;
          }

          entry.setParent(m.author, profile.edata.mute.caseID);

          if (profile.edata.mute.end !== null) {
            entry.setDetails(m.author, `Leftover mute time remaining: ${time_remaining}.`);
          }

          delete profile.edata.mute;
        }

        profile.edata.record.push(entry.raw);

        for (const i in memory.mutes) {
          if (memory.mutes[i].id === profile.id) {
            bot.clearTimeout(memory.mutes[i].time);
            memory.mutes.splice(i, 1);
          }
        }

        bot.util.updateProfile(profile).then(() => {
          const logInfo = () => {
            const embed = new djs.MessageEmbed()
              .setColor(bot.cfg.colors.okay)
              .setAuthor(`User unmuted.`, Assets.getEmoji(`ICO_okay`).url)
              .setDescription(`${result.mention} has been unmuted.`);

            if (reason.length > 0) {
              embed.addField(`Reason`, reason);
            } else {
              embed.addField(`Reason`, `No reason provided. \n(Please use the \`${bot.prefix}editrecord\` command.)`);
            }
            
            bot.send(m, { embed });

            const logEntry = new LogEntry({ channel: `moderation` })
              .setColor(bot.cfg.colors.default)
              .setIcon(Assets.getEmoji(`ICO_unmute`).url)
              .setTitle(`Member Unmuted`, `Member Mute Removal Report`)
              .setHeader((reason.length > 0) ? `Reason: ` + reason : `No reason provided.`)
              .addSection(`Member Unmuted`, result.target)
              .addSection(`Moderator Responsible`, m.author)
              .addSection(`Command Location`, m);

            if (result.type !== `id`) {
              logEntry.setThumbnail(((result.type === `user`) ? result.target : result.target.user).displayAvatarURL({ format: `png` }));
            }

            logEntry.submit();
          };

          if (result.type === `member`) {
            result.target.roles.remove(bot.cfg.roles.muted, `Member unmuted by ${m.author.tag}`).then(() => {
              logInfo();
            }).catch(err => bot.util.err(err, { m }));
          } else {
            logInfo();
          }
        }).catch(err => bot.util.err(err, { m }));
      });
    }
  }
};

module.exports = new Command(metadata);
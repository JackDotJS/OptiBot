const path = require(`path`);
const djs = require(`discord.js`);
const { Command, memory, Assets } = require(`../core/optibot.js`);

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  aliases: [`getban`, `searchban`],
  short_desc: `Get ban information.`,
  long_desc: `Gets information on a given user's ban. Includes information from records, if available.`,
  args: `<discord member>`,
  authlvl: 2,
  flags: [`DM_OPTIONAL`, `MOD_CHANNEL_ONLY`, `LITE`],
  run: null
};

metadata.run = (m, args, data) => {
  if (!args[0]) {
    bot.util.missingArgs(m, metadata);
  } else {
    bot.util.parseTarget(m, 0, args[0], data.member).then((result) => {
      if (!result) {
        bot.util.err(`You must specify a valid user.`, { m });
      } else if (result.type === `notfound`) {
        bot.util.err(`Unable to find a user.`, { m });
      } else if (result.id === m.author.id || result.id === bot.user.id) {
        bot.util.err(`Nice try.`, { m });
      } else {
        bot.mainGuild.fetchBan(result.id).then(ban => {
          bot.util.getProfile(result.id, false).then(profile => {
            let recordEntry = null;

            if (profile && profile.edata.record) {
              const record = profile.edata.record.reverse();
              for (let i = 0; i < record.length; i++) {
                const entry = record[i];

                if (entry.action === 4 && entry.actionType === 1) {
                  recordEntry = entry;
                  break;
                }
              }
            }

            const embed = new djs.MessageEmbed()
              .setColor(bot.cfg.embed.default)
              .setAuthor(`Ban Information`, Assets.getEmoji(`ICO_docs`).url)
              .setTitle(result.tag)
              .setDescription([
                `Mention: ${result.mention}`,
                `\`\`\`yaml\nID: ${result.id}\`\`\``
              ].join(`\n`))
              .addField(`Ban Reason`, ban.reason);

            if (result.type !== `id`) {
              embed.setThumbnail(((result.type === `user`) ? result.target : result.target.user).displayAvatarURL({ format: `png` }));
            }

            if (recordEntry != null) {
              if (recordEntry.reason !== ban.reason) {
                embed.addField(`(Record) Ban Reason`, recordEntry.reason);
              }

              if (recordEntry.details != null) {
                embed.addField(`(Record) Details`, recordEntry.details);
              }
            }

            bot.send(m, { embed });
          }).catch(err => bot.util.err(err, { m }));
        }).catch(err => {
          if (err.message.match(/unknown ban/i)) {
            bot.util.err(`"${result.tag}" is not currently banned.`, { m });
          } else {
            bot.util.err(err, { m });
          }
        });
      }
    }).catch(err => bot.util.err(err, { m }));
  }
};

module.exports = new Command(metadata);
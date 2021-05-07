const path = require(`path`);
const djs = require(`discord.js`);
const { Command, memory, Assets } = require(`../core/modules.js`);

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  description: {
    short: `Ban a given user.`,
    long: `Bans a given user. This command only really exists to allow moderators to ban users outside of the server. **Note that this will NOT delete any existing messages for the sake of preserving history.**`
  },
  args: `<discord member> <reason>`,
  dm: false,
  flags: [ `LITE` ],
  dperm: `MANAGE_GUILD`,
  run: null
};

metadata.run = (m, args, data) => {
  if (!args[1]) return bot.util.missingArgs(m, metadata);

  const reason = m.content.substring(`${bot.prefix}${data.input.cmd} ${args[0]} `.length);

  bot.util.parseTarget(m, 0, args[0], data.member).then((result) => {
    if (result && ![`user`, `member`, `id`].includes(result.type)) {
      return bot.util.err(`You must specify a valid user.`, { m });
    }
    if (result.id === m.author.id) {
      return bot.util.err(`Nice try.`, { m });
    }
    if (result.id === bot.user.id) {
      return bot.util.err(`You have no power here, fool.`, { m });
    }
    if (bot.util.getAuthlvl(result.target) > 0) {
      return bot.util.err(`That user is too powerful to be banned.`, { m });
    }

    bot.mainGuild.fetchBan(result.id).then(() => {
      bot.util.err(`${result.mention} has already been banned.`, { m });
    }).catch(err => {
      if (err.stack.match(/unknown ban/i)) {
        const embed = new djs.MessageEmbed()
          .setAuthor(`Are you sure?`, Assets.getEmoji(`ICO_warn`).url)
          .setColor(bot.cfg.colors.default)
          .setDescription(`The following user will be banned from the server: \n> ${result.mention} (${result.id})`)
          .addField(`Reason`, reason);

        m.channel.stopTyping(true);
        bot.send(m, { embed, delayControl: true }).then(bres => {
          const msg = bres.msg;

          bot.util.confirm(m, msg).then(res => {
            if (res === 1) {
              memory.rban[result.id] = m.author;

              bot.mainGuild.members.ban(result.target, { reason: reason }).then(() => {
                const update = new djs.MessageEmbed()
                  .setColor(bot.cfg.colors.okay)
                  .setAuthor(`Successfully banned user`, Assets.getEmoji(`ICO_okay`).url)
                  .setDescription(`${(result.type === `id`) ? `\`${result.target}\`` : result.target.toString()} has been banned.`)
                  .addField(`Reason`, reason);

                msg.edit({ embed: update });
              }).catch(err => bot.util.err(err, { m }));
            } else if (res === 0) {
              const update = new djs.MessageEmbed()
                .setAuthor(`Cancelled`, Assets.getEmoji(`ICO_load`).url)
                .setColor(bot.cfg.colors.default)
                .setDescription(`User has not been banned.`);

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
      } else {
        bot.util.err(err, { m });
      }
    });
  });
};

module.exports = new Command(metadata);

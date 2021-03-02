const path = require(`path`);
const djs = require(`discord.js`);
const { Command, memory, RecordEntry, LogEntry, Assets } = require(`../core/optibot.js`);

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  description: {
    short: `Warn a user.`,
    long: `Gives a warning to a user. All warnings are logged and saved to the given users record, but otherwise do nothing.`
  },
  args: `<discord member> [reason]`,
  dm: false,
  flags: [ `PERMS_REQUIRED`, `LITE` ],
  run: null
};

metadata.run = (m, args, data) => {
  if (!args[0]) return bot.util.missingArgs(m, metadata);

  bot.util.parseTarget(m, 0, args[0], data.member).then((result) => {
    if (!result) {
      bot.util.err(`You must specify a valid user.`, { m });
    } else if (result.type === `notfound`) {
      bot.util.err(`Unable to find a user.`, { m });
    } else if (result.id === m.author.id) {
      bot.util.err(`Nice try.`, { m });
    } else if (result.id === bot.user.id) {
      bot.util.err(`:(`, { m });
    } else if (bot.util.getAuthlvl(result.target) > data.authlvl) {
      bot.util.err(`That user is too powerful to be warned.`, { m });
    } else {
      bot.util.getProfile(result.id, true).then(profile => {
        if (!profile.edata.record) profile.edata.record = [];
        const reason = m.content.substring(`${bot.prefix}${data.input.cmd} ${args[0]} `.length);

        const entry = new RecordEntry()
          .setMod(m.author.id)
          .setURL(m.url)
          .setAction(`warn`)
          .setActionType(`add`)
          .setReason(m.author, (args[1]) ? reason : `No reason provided.`);

        profile.edata.record.push(entry.raw);

        bot.util.updateProfile(profile).then(() => {
          const logEntry = new LogEntry({ channel: `moderation` })
            .setColor(bot.cfg.embed.default)
            .setIcon(Assets.getEmoji(`ICO_warn`).url)
            .setTitle(`Member Warned`, `Member Warning Report`)
            .addSection(`Member`, result.target)
            .addSection(`Moderator Responsible`, m.author)
            .addSection(`Command Location`, m);

          if (result.type !== `id`) {
            logEntry.setThumbnail(((result.type === `user`) ? result.target : result.target.user).displayAvatarURL({ format: `png` }));
          }

          const embed = new djs.MessageEmbed()
            .setAuthor(`User warned`, Assets.getEmoji(`ICO_warn`).url)
            .setColor(bot.cfg.embed.default)
            .setDescription(`${result.mention} has been warned.`);

          if (args[1]) {
            embed.addField(`Reason`, reason);
            logEntry.setHeader(`Reason: ${reason}`);
          } else {
            embed.addField(`Reason`, `No reason provided. \n(Please use the \`${bot.prefix}editrecord\` command.)`);
            logEntry.setHeader(`No reason provided.`);
          }

          m.channel.stopTyping(true);

          bot.send(m, { embed, userDelete: false });
          logEntry.submit();
        }).catch(err => bot.util.err(err, { m }));
      }).catch(err => bot.util.err(err, { m }));
    }
  }).catch(err => bot.util.err(err, { m }));

};

module.exports = new Command(metadata);
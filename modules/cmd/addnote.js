const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const { Command, memory, RecordEntry, LogEntry, Assets } = require(`../core/optibot.js`);

const bot = memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  aliases: [`addrecord`, `addrecords`],
  description: {
    short: `Add a note to a user's record.`,
    long: `Adds a note to a given user's record. These notes can be edited with the \`${bot.prefix}editrecord\` command, and removed at any time by using the \`${bot.prefix}rmnote\` command.`
  },
  args: `<discord member> <text>`,
  dm: false,
  flags: [ `STRICT`, `STAFF_CHANNEL_ONLY`, `PERMS_REQUIRED`, `LITE` ],
  run: null
};

metadata.run = (m, args, data) => {
  if (!args[1]) return bot.util.missingArgs(m, metadata);

  bot.util.parseTarget(m, 0, args[0], data.member).then((result) => {
    if (!result) return bot.util.err(`You must specify a valid user.`, { m });
    if (result.type === `notfound`) return bot.util.err(`Unable to find a user.`, { m });
    if (bot.util.getAuthlvl(result.target) > data.authlvl) return bot.util.err(`You are not strong enough to add notes to this user.`, { m });
    if (result.id === m.author.id || result.id === bot.user.id) return bot.util.err(`Nice try.`, { m });

    const reason = m.content.substring(`${bot.prefix}${data.input.cmd} ${args[0]} `.length);
    if (reason.length > 1000) return bot.util.err(`Note cannot exceed 1000 characters in length.`, { m: m });

    bot.util.getProfile(result.id, true).then(profile => {
      if (!profile.edata.record) profile.edata.record = [];

      const entry = new RecordEntry()
        .setMod(m.author.id)
        .setURL(m.url)
        .setAction(`note`)
        .setActionType(`add`)
        .setReason(m.author, reason);

      log(util.inspect(entry));
      log(util.inspect(entry.raw));

      profile.edata.record.push(entry.raw);

      bot.util.updateProfile(profile).then(() => {
        new LogEntry({ channel: `moderation` })
          .setColor(bot.cfg.colors.default)
          .setIcon(Assets.getEmoji(`ICO_docs`).url)
          .setTitle(`Moderation Note Created`, `Moderation Note Report`)
          .addSection(`Member`, result.target)
          .addSection(`Note Author`, m.author)
          .addSection(`Note Contents`, reason)
          .submit();

        const embed = new djs.MessageEmbed()
          .setAuthor(`Note added.`, Assets.getEmoji(`ICO_okay`).url)
          .setColor(bot.cfg.colors.okay)
          .setDescription(`User record has been updated.`)
          .addField(`Member`, `${result.mention} | ${result.tag}\n\`\`\`yaml\nID: ${result.id}\`\`\``)
          .addField(`Note`, reason);

        m.channel.stopTyping(true);

        bot.send(m, { embed, userDelete: false });
      }).catch(err => bot.util.err(err, { m: m }));
    }).catch(err => bot.util.err(err, { m: m }));
  }).catch(err => bot.util.err(err, { m: m }));
};

module.exports = new Command(metadata);
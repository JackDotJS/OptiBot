const path = require(`path`);
const djs = require(`discord.js`);
const { Command, memory, LogEntry, Assets } = require(`../core/modules.js`);

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  aliases: [`open`],
  description: {
    short: `Unlock a given channel.`,
    long: `Unlocks a given channel. Defaults to the channel you're in if not specified.`
  },
  args: `[channel]`,
  dm: false,
  flags: [ `LITE` ],
  dperm: `MANAGE_GUILD`,
  run: null
};

metadata.run = (m, args, data) => {
  let channel = m.channel;

  if (args[0]) {
    if (djs.MessageMentions.CHANNELS_PATTERN.exec(args[0]) != null) {
      channel = args[0].mentions.channels.first();
    } else if (parseInt(args[0]) >= 1420070400000) {
      channel = bot.channels.cache.get(args[0]) || m.channel;
    }
  }

  if (bot.cfg.channels.nomodify.some(id => [channel.id, channel.parentID].includes(id)) || channel.guild.id != bot.mainGuild.id) {
    return bot.util.err(`The #${channel.name} channel cannot be modified.`, { m });
  }

  if (!channel.permissionOverwrites.get(bot.mainGuild.id).deny.has(`SEND_MESSAGES`)) {
    return bot.util.err(`The #${channel.name} channel has already been unlocked.`, { m });
  }

  channel.updateOverwrite(bot.mainGuild.id, { SEND_MESSAGES: null }, `Channel unlocked by ${m.author.tag} (${m.author.id}) via ${bot.prefix}${data.input.cmd}`).then(() => {
    const logEntry = new LogEntry({ channel: `moderation` })
      .setColor(bot.cfg.colors.default)
      .setIcon(Assets.getEmoji(`ICO_unlock`).url)
      .setTitle(`Channel Unlocked`, `Channel Unlock Report`)
      .addSection(`Channel`, channel)
      .addSection(`Moderator Responsible`, m.author)
      .addSection(`Command Location`, m);

    const embed = new djs.MessageEmbed()
      .setAuthor(`Channel unlocked.`, Assets.getEmoji(`ICO_okay`).url)
      .setColor(bot.cfg.colors.okay)
      .setDescription(`The ${channel} channel has been unlocked.`);

    bot.send(m, { embed, userDelete: false });
    logEntry.submit();
  });
};

module.exports = new Command(metadata);
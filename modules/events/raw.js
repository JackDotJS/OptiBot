const util = require(`util`);
const djs = require(`discord.js`);
const timeago = require(`timeago.js`);
const ob = require(`../core/OptiBot.js`);

const bot = ob.memory.core.client;
const log = ob.log;

module.exports = (packet) => {
  const now = new Date();
  if (!bot.available) return;
  if (packet.t === `MESSAGE_DELETE`) {
    // this packet does not contain the actual message data, unfortunately.
    // as of writing, this only contains the message ID, the channel ID, and the guild ID.
    bot.setTimeout(() => {
      if (ob.memory.rdel.includes(packet.d.id)) return; // stops if the message exists in the bot's cache.
      if (packet.d.guild_id !== bot.mainGuild.id) return;
      if (bot.cfg.channels.nolog.includes(packet.d.channel_id)) return;

      const logEntry = new ob.LogEntry({ time: now, channel: `delete`, embed: false });

      const mt = djs.SnowflakeUtil.deconstruct(packet.d.id).date;

      const desc = [
        `Message originally posted on ${mt.toUTCString()}`,
        `(${timeago.format(mt)})`
      ];

      logEntry.setColor(bot.cfg.colors.error)
        .setIcon(ob.Assets.getEmoji(`ICO_trash`).url)
        .setTitle(`(Uncached) Message Deleted`, `Uncached Message Deletion Report`)
        .setDescription(desc.join(`\n`), desc.join(` `))
        .addSection(`Message Location`, `${bot.channels.cache.get(packet.d.channel_id).toString()} | [Direct URL](https://discordapp.com/channels/${packet.d.guild_id}/${packet.d.channel_id}/${packet.d.id}) (deleted)`)
        .submit();
    }, 100);
  }
};
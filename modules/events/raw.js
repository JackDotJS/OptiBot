const util = require(`util`);
const djs = require(`discord.js`);
const timeago = require(`timeago.js`);
const ob = require(`../core/OptiBot.js`);

const bot = ob.memory.core.client;
const log = ob.log;

module.exports = (bot, packet) => {
  const now = new Date();
  if (bot.pause) return;
  if (packet.t === `MESSAGE_REACTION_ADD`) {
    const channel = bot.channels.cache.get(packet.d.channel_id);
    if (channel.messages.cache.has(packet.d.message_id)) return; // stops if the message exists in the bot's cache.

    log(util.inspect(packet));

    channel.messages.fetch(packet.d.message_id, true).then(m => {
      const emoji = packet.d.emoji.id ? packet.d.emoji.id : packet.d.emoji.name;
      const reaction = m.reactions.cache.get(emoji);
      let user = bot.users.cache.get(packet.d.user_id);

      function s2() {
        log(`old emoji detected`);
        if (!reaction) {
          log(util.inspect(m.reactions.cache));
          log(`get ${emoji}`);
        } else {
          reaction.users.cache.set(packet.d.user_id, user);
          bot.emit(`messageReactionAdd`, reaction, user);
        }
      }

      if (!user || user.partial) {
        if (channel.guild !== null && channel.guild !== undefined && channel.type === `text`) {
          log(`fetch manual`);
          channel.guild.members.fetch({ user: packet.d.user_id }).then(mem => {
            user = mem.user;
            s2();
          });
        } else {
          return;
        }
      } else {
        s2();
      }
    }).catch(err => {
      bot.util.err(err);
    });
  } else if (packet.t === `MESSAGE_DELETE`) {
    // this packet does not contain the actual message data, unfortunately.
    // as of writing, this only contains the message ID, the channel ID, and the guild ID.
    bot.setTimeout(() => {
      if (ob.memory.rdel.includes(packet.d.id)) return; // stops if the message exists in the bot's cache.
      if (packet.d.guild_id !== bot.cfg.guilds.optifine) return;
      if (bot.cfg.channels.nolog.includes(packet.d.channel_id)) return;

      const logEntry = new ob.LogEntry({ time: now, channel: `delete`, embed: false });

      ob.memory.db.msg.remove({ message: packet.d.id }, {}, (err, num) => {
        if (err) {
          logEntry.error(err);
        } else if (num > 0) {
          log(`Bot message deleted natively.`);
        }
      });

      const mt = djs.SnowflakeUtil.deconstruct(packet.d.id).date;

      const desc = [
        `Message originally posted on ${mt.toUTCString()}`,
        `(${timeago.format(mt)})`
      ];

      logEntry.setColor(bot.cfg.embed.error)
        .setIcon(ob.Assets.getEmoji(`ICO_trash`).url)
        .setTitle(`(Uncached) Message Deleted`, `Uncached Message Deletion Report`)
        .setDescription(desc.join(`\n`), desc.join(` `))
        .addSection(`Message Location`, `${bot.channels.cache.get(packet.d.channel_id).toString()} | [Direct URL](https://discordapp.com/channels/${packet.d.guild_id}/${packet.d.channel_id}/${packet.d.id}) (deleted)`)
        .submit();
    }, 100);
  }
};
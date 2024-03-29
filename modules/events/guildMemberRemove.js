const ob = require(`../core/modules.js`);

const bot = ob.memory.core.client;
const log = ob.log;

module.exports = (member) => {
  const now = new Date();
  if (!bot.available) return;
  if (member.guild.id !== bot.mainGuild.id) return;

  for (const i in ob.memory.mutes) {
    const mute = ob.memory.mutes[i];
    if (mute.id === member.user.id) {
      bot.clearTimeout(mute.time);
      ob.memory.mutes.splice(i, 1);
      break;
    }
  }

  bot.setTimeout(() => {
    bot.mainGuild.fetchAuditLogs({ limit: 10 }).then((audit) => {
      const ad = [...audit.entries.values()];

      for (let i = 0; i < ad.length; i++) {
        if ((ad[i].action === `MEMBER_KICK` || ad[i].action === `MEMBER_BAN_ADD`) && ad[i].target.id === member.user.id) {
          if (ad[i].action === `MEMBER_KICK`) {
            new ob.LogEntry({ time: now, channel: `moderation` })
              .setColor(bot.cfg.colors.error)
              .setIcon(ob.Assets.getEmoji(`ICO_leave`).url)
              .setThumbnail(member.user.displayAvatarURL({ format: `png` }))
              .setTitle(`Member Kicked`, `Member Kick Report`)
              .setHeader((ad[i].reason) ? `Reason: ` + ad[i].reason : `No reason provided.`)
              .addSection(`Member`, member)
              .addSection(`Moderator Responsible`, ad[i].executor)
              .submit();
          }
          break;
        } else if (i + 1 >= ad.length) {
          new ob.LogEntry({ time: now, channel: `joinleave` })
            .setColor(bot.cfg.colors.error)
            .setIcon(ob.Assets.getEmoji(`ICO_leave`).url)
            .setThumbnail(member.user.displayAvatarURL({ format: `png` }))
            .setTitle(`Member Left`, `Member Leave Report`)
            .addSection(`Member`, member)
            .addSection(`Join Date`, (member.joinedAt !== null) ? member.joinedAt : `Unknown.`)
            .addSection(`New Server Member Count`, bot.mainGuild.memberCount)
            .submit();
        }
      }
    }).catch(err => bot.util.err(err));
  }, 500);
};
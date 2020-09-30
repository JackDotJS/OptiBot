const ob = require('../modules/core/OptiBot.js');

module.exports = (bot, member) => {
  const now = new Date();
  if (bot.pause) return;
  if (member.guild.id !== bot.cfg.guilds.optifine) return;

  for (const i in ob.Memory.mutes) {
    const mute = ob.Memory.mutes[i];
    if (mute.id === member.user.id) {
      bot.clearTimeout(mute.time);
      ob.Memory.mutes.splice(i, 1);
      break;
    }
  }

  bot.setTimeout(() => {
    bot.mainGuild.fetchAuditLogs({ limit: 10 }).then((audit) => {
      const ad = [...audit.entries.values()];

      for (let i = 0; i < ad.length; i++) {
        if ((ad[i].action === 'MEMBER_KICK' || ad[i].action === 'MEMBER_BAN_ADD') && ad[i].target.id === member.user.id) {
          if (ad[i].action === 'MEMBER_KICK') {
            new ob.LogEntry({ time: now, channel: 'moderation' })
              .setColor(bot.cfg.embed.error)
              .setIcon(ob.Assets.getEmoji('ICO_leave').url)
              .setThumbnail(member.user.displayAvatarURL({ format: 'png' }))
              .setTitle('Member Kicked', 'Member Kick Report')
              .setHeader((ad[i].reason) ? 'Reason: ' + ad[i].reason : 'No reason provided.')
              .addSection('Member', member)
              .addSection('Moderator Responsible', ad[i].executor)
              .submit();
          }
          break;
        } else if (i + 1 >= ad.length) {
          new ob.LogEntry({ time: now, channel: 'joinleave' })
            .setColor(bot.cfg.embed.error)
            .setIcon(ob.Assets.getEmoji('ICO_leave').url)
            .setThumbnail(member.user.displayAvatarURL({ format: 'png' }))
            .setTitle('Member Left', 'Member Leave Report')
            .addSection('Member', member)
            .addSection('Join Date', (member.joinedAt !== null) ? member.joinedAt : 'Unknown.')
            .addSection('New Server Member Count', bot.mainGuild.memberCount)
            .submit();
        }
      }
    }).catch(err => ob.OBUtil.err(err));
  }, 500);
};
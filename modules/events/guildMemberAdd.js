const ob = require(`../core/OptiBot.js`);

const bot = ob.memory.core.client;
const log = ob.log;

module.exports = (member) => {
  const now = new Date();
  if (bot.pause) return;

  if (member.guild.id === bot.mainGuild.id) {
    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    // DO NOT SET THIS TO TRUE UNDER ANY CIRCUMSTANCES
    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    const alwaysFalse = false;

    bot.util.getProfile(member.user.id, alwaysFalse).then(profile => {
      if (profile && profile.edata.mute && (profile.edata.mute.end - 10000 > new Date().getTime())) {
        member.roles.add(bot.cfg.roles.muted, `Member attempted to circumvent mute.`).then(() => {
          logEvent(true);
        }).catch(err => {
          bot.util.err(err);
          logEvent();
        });
      } else {
        logEvent();
      }
    }).catch(err => {
      bot.util.err(err);
      logEvent();
    });

    // eslint-disable-next-line no-inner-declarations
    function logEvent(muted) {
      const logEntry = new ob.LogEntry({ time: now, channel: `joinleave` })
        .setColor(bot.cfg.embed.okay)
        .setIcon(ob.Assets.getEmoji(`ICO_join`).url)
        .setThumbnail(member.user.displayAvatarURL({ format: `png` }))
        .setTitle(`Member Joined`, `New Member Report`)
        .addSection(`Member`, member)
        .addSection(`Account Creation Date`, member.user.createdAt)
        .addSection(`New Server Member Count`, bot.mainGuild.memberCount);

      if (muted) {
        logEntry.setDescription(`This user attempted to circumvent an on-going mute. The role has been automatically re-applied.`);
      }

      if ((member.user.createdAt.getTime() + (1000 * 60 * 60 * 24 * 7)) > now.getTime()) {
        // account is less than 1 week old
        logEntry.setHeader(`Warning: New Discord Account`);
      }

      logEntry.submit();
    }
  } else if (member.guild.id === bot.cfg.guilds.donator) {
    bot.util.verifyDonator(member).catch(err => {
      bot.util.err(err);
    });
  }
};
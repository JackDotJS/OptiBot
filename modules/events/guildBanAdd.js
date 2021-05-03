const util = require(`util`);
const ob = require(`../core/OptiBot.js`);

const bot = ob.memory.core.client;
const log = ob.log;

module.exports = (guild, user) => {
  const now = new Date();
  if (!bot.available) return;
  if (guild.id !== bot.mainGuild.id) return;

  const logEntry = new ob.LogEntry({ time: now, channel: `moderation` })
    .preLoad();

  log(util.inspect(user));

  log(`ban: got here`);

  bot.setTimeout(() => {
    log(`ban: got here`);
    bot.mainGuild.fetchAuditLogs({ limit: 10, type: `MEMBER_BAN_ADD` }).then((audit) => {
      log(`ban: got here`);

      const ad = [...audit.entries.values()];

      let mod = ob.memory.rban[user.id];
      let reason = null;
      for (let i = 0; i < ad.length; i++) {
        if (ad[i].target.id === user.id) {
          if (!mod) mod = ad[i].executor;
          reason = ad[i].reason;
          break;
        }
      }

      logEntry.setColor(bot.cfg.colors.error);
      logEntry.setIcon(ob.Assets.getEmoji(`ICO_ban`).url);
      logEntry.setThumbnail(user.displayAvatarURL({ format: `png` }));
      logEntry.setTitle(`Member Banned`, `Member Ban Report`);
      logEntry.addSection(`Banned Member`, user);

      if (reason) {
        logEntry.setHeader(`Reason: ${reason}`);
      } else {
        logEntry.setHeader(`No reason provided.`);
      }

      log(`ban: got here`);

      if (mod) {
        logEntry.addSection(`Moderator Responsible`, mod);
      } else {
        logEntry.addSection(`Moderator Responsible`, `Error: Unable to determine.`);
      }

      bot.util.getProfile(user.id, true).then(profile => {
        if (!profile.edata.record) profile.edata.record = [];

        log(`ban: got here 3`);

        const recordEntry = new ob.RecordEntry({ date: now });
        recordEntry.setAction(`ban`);
        recordEntry.setActionType(`add`);

        if (reason !== null) {
          recordEntry.setReason(bot.user, reason);
        }

        if (mod !== null) {
          recordEntry.setMod(mod.id);
        }

        profile.edata.record.push(recordEntry.raw);

        bot.util.updateProfile(profile).then(() => {
          log(`ban addition record successfully saved`);
          logEntry.submit();
        }).catch(err => {
          logEntry.error(err);
        });
      }).catch(err => {
        logEntry.error(err);
      });
    }).catch(err => {
      logEntry.error(err);
    });
  }, 5000);
};
const cid = require('caller-id');
const util = require('util');
const ob = require('./modules/core/OptiBot.js');

const log = (message, level, file, line) => {
  const call = cid.getData();
  if (!file) file = (call.evalFlag) ? 'eval()' : call.filePath.substring(call.filePath.lastIndexOf('\\') + 1);
  if (!line) line = call.lineNumber;

  try {
    process.send({
      type: 'log',
      message: message,
      level: level,
      misc: `${file}:${line}`
    });
  }
  catch (e) {
    try {
      process.send({
        type: 'log',
        message: util.inspect(message),
        level: level,
        misc: `${file}:${line}`
      });
    }
    catch (e2) {
      log(e);
      log(e2);
    }
  }


};

module.exports = (bot, guild, user) => {
  const now = new Date();
  if (bot.pause) return;
  if (guild.id !== bot.cfg.guilds.optifine) return;

  const logEntry = new ob.LogEntry({ time: now, channel: 'moderation' })
    .preLoad();

  log(util.inspect(guild));

  log(util.inspect(user));

  log('ban: got here');

  bot.setTimeout(() => {
    log('ban: got here');
    bot.mainGuild.fetchAuditLogs({ limit: 10, type: 'MEMBER_BAN_ADD' }).then((audit) => {
      log('ban: got here');

      const ad = [...audit.entries.values()];

      let mod = ob.Memory.rban[user.id];
      let reason = null;
      for (let i = 0; i < ad.length; i++) {
        if (ad[i].target.id === user.id) {
          if (!mod) mod = ad[i].executor;
          reason = ad[i].reason;
          break;
        }
      }

      log('ban: got here');
      logEntry.setColor(bot.cfg.embed.error);
      log('ban: got here');
      logEntry.setIcon(ob.Assets.getEmoji('ICO_ban').url);
      log('ban: got here');
      logEntry.setThumbnail(user.displayAvatarURL({ format: 'png' }));
      log('ban: got here');
      logEntry.setTitle('Member Banned', 'Member Ban Report');
      log('ban: got here');
      logEntry.addSection('Banned Member', user);

      log('ban: got here');

      if (reason) {
        logEntry.setHeader(`Reason: ${reason}`);
      } else {
        logEntry.setHeader('No reason provided.');
      }

      log('ban: got here');

      if (mod) {
        logEntry.addSection('Moderator Responsible', mod);
      } else {
        logEntry.addSection('Moderator Responsible', 'Error: Unable to determine.');
      }

      log('ban: got here');

      ob.OBUtil.getProfile(user.id, true).then(profile => {
        if (!profile.edata.record) profile.edata.record = [];

        log('ban: got here 3');

        const recordEntry = new ob.RecordEntry({ date: now });
        log('ban: got here 4');
        recordEntry.setAction('ban');
        log('ban: got here 4');
        recordEntry.setActionType('add');

        log('ban: got here 3');

        if (reason !== null) {
          recordEntry.setReason(bot.user, reason);
        }

        log('ban: got here 3');

        if (mod !== null) {
          recordEntry.setMod(mod.id);
        }

        log('ban: got here 3');

        profile.edata.record.push(recordEntry.raw);

        log('ban: got here');

        ob.OBUtil.updateProfile(profile).then(() => {
          log('ban: got here');
          log('ban addition record successfully saved');
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
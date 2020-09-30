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

  bot.setTimeout(() => {
    bot.mainGuild.fetchAuditLogs({ limit: 10, type: 'MEMBER_BAN_REMOVE' }).then((audit) => {
      const ad = [...audit.entries.values()];

      let mod = null;
      for (let i = 0; i < ad.length; i++) {
        if (ad[i].target.id === user.id) {
          mod = ad[i].executor;
          break;
        }
      }

      logEntry.setColor(bot.cfg.embed.default)
        .setIcon(ob.Assets.getEmoji('ICO_unban').url)
        .setThumbnail(user.displayAvatarURL({ format: 'png' }))
        .setTitle('Member Ban Revoked', 'Member Ban Removal Report')
        .addSection('Unbanned Member', user);

      if (mod) {
        logEntry.addSection('Moderator Responsible', mod);
      } else {
        logEntry.addSection('Moderator Responsible', 'Error: Unable to determine.');
      }

      ob.OBUtil.getProfile(user.id, true).then(profile => {
        if (!profile.edata.record) profile.edata.record = [];

        let parent = null;
        for (let i = 0; i < profile.edata.record.length; i++) {
          const entry = profile.edata.record[i];
          if (entry.action === 4 && entry.actionType === 1) {
            parent = entry;
          }
        }

        const recordEntry = new ob.RecordEntry({ date: now })
          .setAction('ban')
          .setActionType('remove')
          .setReason(mod, 'No reason provided.');

        if (parent !== null) {
          recordEntry.setParent(mod, parent.date);
        }

        if (mod !== null) {
          recordEntry.setMod(mod.id);
        }

        profile.edata.record.push(recordEntry.raw);

        ob.OBUtil.updateProfile(profile).then(() => {
          log('ban removal record successfully saved');
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
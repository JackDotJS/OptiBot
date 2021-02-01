const Memory = require('../core/memory.js');
const OBerr = require('./err.js');
const getProfile = require('./getProfile.js');
const updateProfile = require('./updateProfile.js');
const Assets = require('../core/asset_manager.js');
const LogEntry = require('../core/modlog.js');
const djs = require('discord.js');
const util = require('util');

module.exports = (id) => {
  const bot = Memory.core.client;
  const log = bot.log;

  // eslint-disable-next-line no-unused-vars
  return new Promise((resolve, reject) => {
    const errHandler = (err, user) => {
      OBerr(err);

      let type = null;
      if (user) type = (user.constructor === djs.User) ? 'user' : 'member';

      const logEntry = new LogEntry({ channel: 'moderation' })
        .setColor(bot.cfg.embed.error)
        .setIcon(Assets.getEmoji('ICO_error').url)
        .setTitle('Member Unmute Failure', 'Member Mute Removal Failure Report')
        .setHeader('An error occurred while trying to unmute a user.')
        .setDescription(`\`\`\`diff\n-${err}\`\`\``);

      if (user) {
        logEntry.addSection('Member', (type === 'user') ? user : user.user)
          .setThumbnail(((type === 'user') ? user : user.user).displayAvatarURL({ format: 'png' }));
      } else {
        logEntry.addSection('Member', 'Unknown. (Error occurred before or during fetch operation)');
      }

      logEntry.submit().then(() => {
        resolve();
      }).catch(err => {
        OBerr(err);
        resolve();
      });
    };

    bot.mainGuild.members.fetch(id).then(mem => {
      removeRole(mem);
    }).catch(err => {
      if (err.message.match(/invalid or uncached|unknown member|unknown user/i)) {
        bot.users.fetch(id).then(user => {
          removeRole(user);
        }).catch(err => {
          errHandler(err);
        });
      } else {
        errHandler(err);
      }
    });

    function removeRole(user) {
      if (user.constructor === djs.User) {
        removeProfileData(user, 'user');
      } else {
        user.roles.remove(bot.cfg.roles.muted, 'Mute period expired.').then(() => {
          removeProfileData(user, 'member');
        }).catch(err => {
          log(util.inspect(user));
          errHandler(err, user);
        });
      }
    }

    function removeProfileData(user, type) {
      getProfile(id, false).then(profile => {
        if (profile) {
          /* let entry = new RecordEntry()
          .setMod(bot.user.id)
          .setAction('mute')
          .setActionType('remove')
          .setReason(bot.user, `Mute period expired.`)
          .setParent(bot.user, profile.edata.mute.caseID)

          if(!profile.edata.record) profile.edata.record = [];
          profile.edata.record.push(entry.raw); */

          delete profile.edata.mute;

          updateProfile(profile).then(() => {
            finish(user, type);
          }).catch(err => {
            errHandler(err, user);
          });
        } else {
          finish(user, type);
        }
      }).catch(err => {
        errHandler(err, user);
      });
    }

    function finish(user, type) {
      for (let i = 0; i < Memory.mutes.length; i++) {
        const mute = Memory.mutes[i];
        if (mute.id === id) {
          Memory.mutes.splice(i, 1);
        }
      }

      new LogEntry({ channel: 'moderation' })
        .setColor(bot.cfg.embed.default)
        .setIcon(Assets.getEmoji('ICO_unmute').url)
        .setTitle('Member Unmuted', 'Member Mute Removal Report')
        .setHeader('Reason: Mute period expired.')
        .addSection('Member Unmuted', (type === 'user') ? user : user.user)
        .setThumbnail(((type === 'user') ? user : user.user).displayAvatarURL({ format: 'png' }))
        .submit().then(() => {
          resolve();
        }).catch(err => {
          OBerr(err);
          resolve();
        });
    }
  });
};
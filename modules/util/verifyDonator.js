const Memory = require('../core/OptiBotMemory.js');

const bot = Memory.core.client;
const log = bot.log;

module.exports = (member) => {
  return new Promise((resolve, reject) => {
    log(`${member.user.tag} (${member.user.id}) joined OptiFine Donator server!`, 'info');

    function grantRole() {
      member.roles.add(bot.cfg.roles.donatorServer, 'Verified Donator via OptiFine Server.').then(() => {
        log(`${member.user.tag} (${member.user.id}) has been successfully verified as a donator.`, 'info');
        resolve();
      }).catch(err => {
        log(`Error occurred while verifying ${member.user.tag} (${member.user.id}) as a donator.`, 'error');
        reject(err);
      });
    }

    function kick() {
      member.kick('Unverified Donator.').then(() => {
        log(`Kicked ${member.user.tag} (${member.user.id}) for not being a verified donator.`, 'info');
        resolve();
      }).catch(err => {
        log(`Error occurred while kicking ${member.user.tag} (${member.user.id}) from donator server.`, 'error');
        reject(err);
      });
    }

    bot.mainGuild.members.fetch(member.user.id).then((ofm) => {
      if (ofm.roles.cache.has(bot.cfg.roles.donator)) {
        if (!member.roles.cache.has(bot.cfg.roles.donatorServer)) {
          grantRole();
        } else {
          resolve();
        }
      } else {
        kick();
      }
    }).catch(err => {
      if (err.message.match(/invalid or uncached|unknown member|unknown user/i) != null) {
        kick();
      } else {
        log(`Error occurred while verifying ${member.user.tag} (${member.user.id}) as a donator.`, 'error');
        reject(err);
      }
    });
  });
};
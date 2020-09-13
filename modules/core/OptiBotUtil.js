const Memory = require('./OptiBotMemory.js');

module.exports = {
  setWindowTitle: require('./OptiBotUtil/setWindowTitle'),
  parseInput: require('./OptiBotUtil/parseInput'),
  getAuthlvl: require('./OptiBotUtil/getAuthLevel'),
  missingArgs: require('./OptiBotUtil/missingArgs'),
  getProfile: require('./OptiBotUtil/getProfile'),
  updateProfile: require('./OptiBotUtil/updateProfile'),
  parseTarget: require('./OptiBotUtil/parseTarget'),
  confirm: require('./OptiBotUtil/confirm'),
  err: require('./OptiBotUtil/err'),
  parseTime: require('./OptiBotUtil/parseTime'),
  afterSend: require('./OptiBotUtil/afterSend'),
  unmuter: require('./OptiBotUtil/unmuter'),
  uwu: require('./OptiBotUtil/uwu')
};

module.exports = class OptiBotUtilities {
  constructor() {
    throw new Error('Why are you doing this? (Cannot instantiate this class.)');
  }

  static verifyDonator(member) {
    const bot = Memory.core.client;
    const log = bot.log;

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
  }

  static calculatePoints(date, total) {
    const bot = Memory.core.client;
    const log = bot.log;

    const daysSince = Math.round((Date.now() - date) / (1000 * 60 * 60 * 24));

    log(`days since: ${daysSince}`);

    if (daysSince > bot.cfg.points.decayDelay) {
      const decay = total - (bot.cfg.points.dailyDecay * (daysSince - bot.cfg.points.decayDelay));
      const minimum = (bot.cfg.points.minPercentDecay / 100) * total;

      log(`decay: ${decay}`);
      log(`minimum: ${minimum}`);

      return Math.max(decay, minimum);
    }

    return total;
  }
};
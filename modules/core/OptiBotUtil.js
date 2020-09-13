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
  uwu: require('./OptiBotUtil/uwu'),
  verifyDonator: require('./OptiBotUtil/verifyDonator')
};

module.exports = class OptiBotUtilities {
  constructor() {
    throw new Error('Why are you doing this? (Cannot instantiate this class.)');
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
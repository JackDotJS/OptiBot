const Memory = require('../core/OptiBotMemory.js');

module.exports = (date, total) => {
  const bot = Memory.core.client;
  const log = bot.log;

  const daysSince = Math.round((Date.now() - date) / (1000 * 60 * 60 * 24));

  log(`days since: ${daysSince}`);

  if (daysSince > bot.cfg.points.decayDelay) {
    const decay = total - (bot.cfg.points.dailyDecay * (daysSince - bot.cfg.points.decayDelay));
    const minimum = (bot.cfg.points.minPercentDecay / 100) * total;

    log(`decay: ${decay}`);
    log(`minimum: ${minimum}`);

    return Math.round(Math.max(decay, minimum));
  }

  return total;
};
const ob = require(`../core/OptiBot.js`);

const bot = ob.memory.core.client;
const log = bot.log;

module.exports = {
  repeat: true,
  interval: 300000,
  lite: true,
  fn: () => {
    if (!bot.pause && bot.ws.shards.size > 0 && bot.ws.shards.first().status === 0 && (ob.memory.presenceRetry < 3 || ob.memory.presenceHour !== new Date().getHours())) {
      log(`presence sync: updating`);
      bot.user.setPresence(ob.memory.presence);
      ob.memory.presenceRetry++;
      ob.memory.presenceHour = new Date().getHours();
    }
  }
};
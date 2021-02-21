const util = require(`util`);
const ob = require(`../core/OptiBot.js`);

const bot = ob.memory.core.client;
const log = ob.log;

module.exports = (bot, id, replayed) => {
  log(`Shard WebSocket resumed. \nShard ID: ${id} \nEvents replayed: ${replayed}`, `info`);
  log(util.inspect(bot.ws));
  bot.util.setWindowTitle();
  ob.memory.presenceRetry = 0;
};
const util = require(`util`);
const ob = require(`../core/OptiBot.js`);

const bot = ob.memory.core.client;
const log = ob.log;

module.exports = (bot, err, id) => {
  log(`Shard WebSocket connection error. \nShard ID: ${id} \nStack: ${err.stack || err}`, `error`);
  log(util.inspect(bot.ws));
  bot.util.setWindowTitle();
};  
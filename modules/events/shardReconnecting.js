const util = require(`util`);
const ob = require(`../core/modules.js`);

const bot = ob.memory.core.client;
const log = ob.log;

module.exports = (id) => {
  log(`Shard WebSocket reconnecting... \nShard ID: ${id}`, `warn`);
  log(util.inspect(bot.ws));
  bot.util.setWindowTitle();
};
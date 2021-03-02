const util = require(`util`);
const ob = require(`../core/OptiBot.js`);

const bot = ob.memory.core.client;
const log = ob.log;

module.exports = (id, guilds) => {
  log(`Shard WebSocket ready. \nShard ID: ${id} \nUnavailable Guilds: ${(guilds) ? `\n` + [...guilds].join(`\n`) : `None.`}`, `info`);
  log(util.inspect(bot.ws));
  bot.util.setWindowTitle();
  ob.memory.presenceRetry = 0;
};
const util = require(`util`);
const ob = require(`../core/modules.js`);

const bot = ob.memory.core.client;
const log = ob.log;

module.exports = () => {
  log(`Session Invalidated.`, `fatal`);
  bot.util.setWindowTitle(`Session invalidated.`);
  process.exit(1);
};
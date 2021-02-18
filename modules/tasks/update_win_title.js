const ob = require(`../core/OptiBot.js`);

const bot = ob.memory.core.client;

module.exports = {
  repeat: true,
  interval: 500,
  lite: true,
  fn: () => {
    bot.util.setWindowTitle();
  }
};
const ob = require('../core/OptiBot.js');

module.exports = {
  repeat: true,
  interval: 500,
  lite: true,
  fn: () => {
    const bot = ob.Memory.core.client;
    const log = bot.log;

    ob.OBUtil.setWindowTitle();
  }
};
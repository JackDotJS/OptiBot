const ob = require('../core/OptiBot.js');

module.exports = {
  repeat: true,
  interval: 500,
  lite: true,
  fn: () => {
    ob.OBUtil.setWindowTitle();
  }
};
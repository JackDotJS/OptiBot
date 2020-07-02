const OBUtil = require(`../core/OptiBotUtil.js`);

module.exports = {
    interval: 5000,
    lite: true,
    fn: (bot, log) => {
        OBUtil.setWindowTitle();
    }
}
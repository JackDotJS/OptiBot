const OBUtil = require(`../core/OptiBotUtil.js`);

module.exports = {
    interval: 500,
    lite: true,
    fn: (bot, log) => {
        OBUtil.setWindowTitle();
    }
}
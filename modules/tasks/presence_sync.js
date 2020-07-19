const { OBUtil, Memory } = require(`../core/OptiBot.js`);

module.exports = {
    interval: 5000,
    lite: true,
    fn: (bot, log) => {
        if (!Memory.bot.init && bot.ws.shards.size > 0 && bot.ws.shards.first().status === 0 && (Memory.presenceRetry < 3 || Memory.presenceHour !== new Date().getHours())) {
            log('presence sync: updating')
            bot.user.setPresence(Memory.presence);
            Memory.presenceRetry++;
            Memory.presenceHour = new Date().getHours();
        }
    }
}
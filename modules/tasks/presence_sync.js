const ob = require(`../core/OptiBot.js`);

module.exports = {
    repeat: true,
    interval: 5000,
    lite: true,
    fn: () => {
        const bot = ob.Memory.core.client;
        const log = bot.log;
        
        if (!bot.pause && bot.ws.shards.size > 0 && bot.ws.shards.first().status === 0 && (ob.Memory.presenceRetry < 3 || ob.Memory.presenceHour !== new Date().getHours())) {
            log('presence sync: updating')
            bot.user.setPresence(ob.Memory.presence);
            ob.Memory.presenceRetry++;
            ob.Memory.presenceHour = new Date().getHours();
        }
    }
}
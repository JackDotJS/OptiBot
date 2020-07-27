const ob = require(`../core/OptiBot.js`);

module.exports = {
    repeat: false,
    time: ob.Memory.core.client.exitTime.getTime() - new Date().getTime(),
    lite: true,
    fn: () => {
        const bot = ob.Memory.core.client;
        const log = bot.log;

        bot.pause = true;
        bot.setBotStatus(-1)

        let logEntry = new ob.LogEntry({time: new Date()})
        .setColor(bot.cfg.embed.default)
        .setIcon(ob.OBUtil.getEmoji('ICO_door').url)
        .setTitle(`OptiBot is now restarting...`, `OptiBot Restart Report`)
        .submit().then(() => {
            let maxPauseTime = 10000;
            let minPauseTime = 2500;
            let pauseTime = minPauseTime;

            let li = new Date().getTime() - ob.Memory.li;

            if(li > maxPauseTime) {
                pauseTime = minPauseTime;
            } else
            if(li < minPauseTime) {
                pauseTime = maxPauseTime;
            } else {
                pauseTime = li/(1000);
            }

            log(`Restarting in ${(pauseTime/(1000)).toFixed(1)} seconds...`, 'warn');

            bot.setTimeout(() => {
                bot.exit(18)
            }, pauseTime);
        });
    }
}
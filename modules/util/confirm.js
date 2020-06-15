/**
 * Allows users to confirm specific requests.
 * This should ONLY be used in the `then()` function of a `channel.send()` promise.
 * 
 * @param m User Message.
 * @param botmsg Bot Repsonse.
 * @param bot OptiBot itself.
 */

module.exports = (m, botmsg, bot) => {
    return new Promise((resolve, reject) => {
        const log = bot.log;
        m.channel.stopTyping(true);

        const filter = (r, user) => [bot.cfg.emoji.confirm, bot.cfg.emoji.cancel].indexOf(r.emoji.id) > -1 && user.id === m.author.id;
        const df = botmsg.createReactionCollector(filter, { time: (1000 * 60 * 5) });

        df.on('collect', r => {
            df.stop('done');

            if(r.emoji.id === bot.cfg.emoji.confirm) {
                resolve(1);
            } else {
                resolve(0);
            }
        });

        df.on('end', (c, reason) => {
            if(!botmsg.deleted) {
                botmsg.reactions.removeAll().then(() => {
                    if(reason === 'done') {
                        return;
                    } else
                    if(reason === 'time') {
                        resolve(-1);
                    } else {
                        log(reason, 'error');
                    }
                })
            }
        });

        let ob = bot.guilds.cache.get(bot.cfg.guilds.optibot)
        botmsg.react(ob.emojis.cache.get(bot.cfg.emoji.confirm)).then(() => {
            botmsg.react(ob.emojis.cache.get(bot.cfg.emoji.cancel)).catch(err => {
                df.stop();
                reject(err);
            });
        }).catch(err => {
            df.stop();
            reject(err);
        });
    });
}
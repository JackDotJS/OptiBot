/**
 * Allows users to confirm specific requests.
 * This should ONLY be used in the `then()` function of a `channel.send()` promise.
 * 
 * @param author User ID.
 * @param m OptiBot Message.
 * @param bot OptiBot itself.
 */

module.exports = (author, m, bot) => {
    const log = bot.log;
    m.channel.stopTyping(true);

    m.react(bot.guilds.cache.get(bot.cfg.guilds.optibot).emojis.get(bot.cfg.emoji.confirm)).then(() => {
        m.react(bot.guilds.cache.get(bot.cfg.guilds.optibot).emojis.get(bot.cfg.emoji.cancel)).then(() => {
            // massive todo
        }).catch(err => {
            log(err.stack, 'error');
        });
    }).catch(err => {
        log(err.stack, 'error');
    });
}
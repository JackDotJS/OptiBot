/**
 * Allows users to confirm specific requests.
 * This should ONLY be used in the `then()` function of a `channel.send()` promise.
 * 
 * @param author User ID.
 * @param m OptiBot Message.
 * @param bot OptiBot itself.
 * @param {Function} log A function to send log events to.
 */

module.exports = (author, m, bot, log = function(){}) => {
    m.channel.stopTyping(true);

    m.react(bot.guilds.get(bot.cfg.guilds.optibot).emojis.get(bot.cfg.emoji.confirm)).then(() => {
        m.react(bot.guilds.get(bot.cfg.guilds.optibot).emojis.get(bot.cfg.emoji.cancel)).then(() => {
            // massive todo
        }).catch(err => {
            log(err.stack, 'error');
        });
    }).catch(err => {
        log(err.stack, 'error');
    });
}
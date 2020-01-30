/**
 * Performs various actions after sending a message.
 * This should ONLY be used in the `then()` function of a `channel.send()` promise.
 * 
 * @param author The original input message.
 * @param m The message that OptiBot has just sent.
 * @param bot OptiBot
 * @param {Function} log A function to send log events to.
 */

module.exports = (author, m, bot, log = function(){}) => {
    m.channel.stopTyping(true);

    if(m.channel.type !== 'dm') {
        log('message sent, adding to cache', 'debug');
        m.react(bot.guilds.get(bot.cfg.guilds.optibot).emojis.get(bot.cfg.emoji.deleter)).then(() => {
            let cacheData = {
                time: new Date().getTime(), 
                /**
                 * the "time" property of this is only used to sort entries by age,
                 * which is then used to delete the oldest entry when the message limit is reached.
                 * 
                 * theoretically, this could be replaced by the message ID alone,
                 * but i have no actual idea how snowflake IDs are structured.
                 * 
                 * i'll probably experiment with this idea in the future.
                 */
                guild: m.guild.id,
                channel: m.channel.id,
                message: m.id,
                user: author
            }

            bot.db.msg.insert(cacheData, (err) => {
                if (err) {
                    log(err.stack, 'error');
                } else {
                    log('successfully added message to cache', 'debug');
                    log('checking cache limit', 'debug');
                    bot.db.msg.find({}).sort({ time: 1 }).exec((err, docs) => {
                        if (err) {
                            log(err.stack, 'error');
                        } else
                        if (docs.length > bot.cfg.db.limit) {
                            log('reached cache limit, removing first element from cache.', 'debug');
                            bot.db.msg.remove(docs[0], {}, (err) => {
                                if (err) {
                                    log(err.stack, 'error');
                                } else {
                                    bot.guilds.get(docs[0].guild).channels.get(docs[0].channel).fetchMessage(docs[0].message).then((msg) => {
                                        let reaction = msg.reactions.get('click_to_delete:'+bot.cfg.emoji.deleter);

                                        if(reaction && reaction.me) {
                                            reaction.remove().then(() => {
                                                log('Time expired for message deletion.', 'trace');
                                            }).catch(err => {
                                                log(err.stack, 'error');
                                            })
                                        }
                                    }).catch(err => {
                                        log(err.stack, 'error');
                                    });
                                }
                            });
                        }
                    });
                }
            })
        }).catch(err => {
            log(err.stack, 'error');
        });
    }
}
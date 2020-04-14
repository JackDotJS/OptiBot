/**
 * Performs various actions after sending a message.
 * This should ONLY be used in the `then()` function of a `channel.send()` promise.
 * 
 * @param author The original message author ID.
 * @param m The message that OptiBot has just sent.
 * @param bot OptiBot
 */

module.exports = (author, m, bot) => {
    m.channel.stopTyping(true);

    const log = bot.log;

    if(m.channel.type !== 'dm') {
        log('message sent, adding to cache', 'debug');
        m.react(bot.guilds.cache.get(bot.cfg.guilds.optibot).emojis.cache.get(bot.cfg.emoji.deleter)).then(() => {
            let cacheData = {
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
                    bot.db.msg.find({}).sort({ message: 1 }).exec((err, docs) => {
                        if (err) {
                            log(err.stack, 'error');
                        } else
                        if (docs.length > bot.cfg.db.limit) {
                            log('reached cache limit, removing first element from cache.', 'debug');
                            bot.db.msg.remove(docs[0], {}, (err) => {
                                if (err) {
                                    log(err.stack, 'error');
                                } else {
                                    try {
                                        bot.guilds.cache.get(docs[0].guild).channels.cache.get(docs[0].channel).messages.fetch(docs[0].message).then((msg) => {
                                            let reaction = msg.reactions.cache.get('click_to_delete:'+bot.cfg.emoji.deleter);
    
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
                                    catch(err) {
                                        log(err.stack, 'error');
                                    }
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
const Memory = require('../core/memory.js');
const OptiBotUtilities = require('../core/util');
const djs = require('discord.js'); // eslint-disable-line no-unused-vars

/**
     * Performs various actions after sending a message.
     * This should ONLY be used in the `then()` function of a `channel.send()` promise.
     *
     * @param {djs.Message} bm The message that OptiBot has just sent.
     * @param {String} author The original message author ID.
     *
     *
     */
module.exports = (bm, author) => {
  const bot = Memory.core.client;
  const log = bot.log;

  bm.channel.stopTyping(true);
  if (bm.channel.type === 'dm') return;

  log('message sent, adding to cache', 'debug');
  bm.react(bot.guilds.cache.get(bot.cfg.guilds.optibot).emojis.cache.get(bot.cfg.emoji.deleter)).then(() => {
    const cacheData = {
      guild: bm.guild.id,
      channel: bm.channel.id,
      message: bm.id,
      user: author
    };

    Memory.db.msg.insert(cacheData, (err) => {
      if (err) {
        OptiBotUtilities.err(err);
      } else {
        log('successfully added message to cache', 'debug');
        log('checking cache limit', 'debug');
        Memory.db.msg.find({}).sort({ message: 1 }).exec((err, docs) => {
          if (err) {
            OptiBotUtilities.err(err);
          } else if (docs.length > bot.cfg.db.limit) {
            log('reached cache limit, removing first element from cache.', 'debug');
            Memory.db.msg.remove(docs[0], {}, (err) => {
              if (err) {
                OptiBotUtilities.err(err);
              } else {
                try {
                  bot.guilds.cache.get(docs[0].guild).channels.cache.get(docs[0].channel).messages.fetch(docs[0].message).then((msg) => {
                    const reaction = msg.reactions.cache.get('click_to_delete:' + bot.cfg.emoji.deleter);

                    if (reaction && reaction.me) {
                      reaction.remove().then(() => {
                        log('Time expired for message deletion.', 'trace');
                      }).catch(err => {
                        OptiBotUtilities.err(err);
                      });
                    }
                  }).catch(err => {
                    OptiBotUtilities.err(err);
                  });
                }
                catch (err) {
                  OptiBotUtilities.err(err);
                }
              }
            });
          }
        });
      }
    });
  }).catch(err => {
    OptiBotUtilities.err(err);
  });
};
const Memory = require(`../core/memory.js`);

module.exports = (m, bm) => {
  const bot = Memory.core.client;
  const log = bot.log;

  return new Promise((resolve, reject) => {
    const filter = (r, user) => [bot.cfg.emoji.confirm, bot.cfg.emoji.cancel].indexOf(r.emoji.id) > -1 && user.id === m.author.id;
    const df = bm.createReactionCollector(filter, { time: (1000 * 60 * 5) });

    df.on(`collect`, r => {
      df.stop(`done`);

      if (r.emoji.id === bot.cfg.emoji.confirm) {
        resolve(`confirm`);
      } else {
        resolve(`cancel`);
      }
    });

    df.on(`end`, (c, reason) => {
      if (!bm.deleted) {
        bm.reactions.removeAll().then(() => {
          if (reason === `done`) {
            return;
          } else if (reason === `time`) {
            resolve(`timeout`);
          } else {
            log(reason, `error`);
          }
        });
      }
    });

    const ob = bot.guilds.cache.get(bot.cfg.guilds.optibot);
    bm.react(ob.emojis.cache.get(bot.cfg.emoji.confirm)).then(() => {
      bm.react(ob.emojis.cache.get(bot.cfg.emoji.cancel)).catch(err => {
        df.stop();
        reject(err);
      });
    }).catch(err => {
      df.stop();
      reject(err);
    });
  });
};
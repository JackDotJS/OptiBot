const path = require('path');
const sim = require('string-similarity');
const { Command, memory, Assets } = require('../core/optibot.js');

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  aliases: ['policies', 'policys'],
  short_desc: 'Search staff policies.',
  args: '<query>',
  authlvl: 2,
  flags: ['DM_OPTIONAL', 'MOD_CHANNEL_ONLY', 'STRICT', 'DELETE_ON_MISUSE', 'LITE'],
  run: null
};


metadata.run = (m, args) => {
  if (!args[0]) {
    bot.util.missingArgs(m, metadata);
  } else {
    memory.db.pol.find({}, (err, docs) => {
      if (err) {
        bot.util.err(err, { m });
      } else {
        let allkw = [];

        for (const doc of docs) {
          allkw = allkw.concat(doc.kw);
        }

        allkw = [...new Set(allkw)]; // ensures there are no duplicates

        const match = sim.findBestMatch((m.content.substring(`${bot.prefix}${metadata.name} `.length)), allkw);

        for (let i = 0; i < docs.length; i++) {
          if (docs[i].kw.includes(match.bestMatch.target)) {
            return bot.guilds.cache.get(bot.cfg.policies.guild).channels.cache.get(bot.cfg.policies.channel).messages.fetch(docs[i].id).then(pm => {
              const embed = pm.embeds[0]
                .setAuthor('OptiFine Discord Moderation Policies', Assets.getEmoji('ICO_docs').url)
                .setColor(bot.cfg.embed.default)
                .setFooter(`${(match.bestMatch.rating * 100).toFixed(1)}% match during search.`);

              m.channel.send({ embed: embed }).then(bm => bot.util.afterSend(bm, m.author.id));
            });
          }
        }

        bot.util.err('Unable to find a policy.', { m });
      }
    });
  }
};

module.exports = new Command(metadata);
const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const sim = require('string-similarity');
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    aliases: ['policies', 'policys'],
    short_desc: `Search staff policies.`,
    args: `<query>`,
    authlvl: 1,
    flags: ['DM_OPTIONAL', 'MOD_CHANNEL_ONLY', 'STRICT', 'DELETE_ON_MISUSE'],
    run: null
}


metadata.run = (m, args, data) => {
    if(!args[0]) {
        OBUtil.missingArgs(m, metadata);
    } else {
        Memory.db.pol.find({}, (err, docs) => {
            if(err) {
                OBUtil.err(err, {m:m});
            } else {
                let allkw = [];

                for(let doc of docs) {
                    allkw = allkw.concat(doc.kw);
                }

                allkw = [...new Set(allkw)] // ensures there are no duplicates

                let match = sim.findBestMatch((m.content.substring( `${bot.prefix}${metadata.name} `.length )), allkw)

                for(let i = 0; i < docs.length; i++) {
                    if(docs[i].kw.includes(match.bestMatch.target)) {
                        return bot.guilds.cache.get(bot.cfg.policies.guild).channels.cache.get(bot.cfg.policies.channel).messages.fetch(docs[i].id).then(pm => {
                            let embed = pm.embeds[0]
                            .setAuthor('OptiFine Discord Moderation Policies', Assets.getEmoji('ICO_docs').url)
                            .setColor(bot.cfg.embed.default)
                            .setFooter(`${(match.bestMatch.rating * 100).toFixed(1)}% match during search.`)

                            m.channel.send({embed: embed}).then(bm => OBUtil.afterSend(bm, m.author.id));
                        });
                    }
                }

                OBUtil.err('Unable to find a policy.', {m:m});
            }
        });
    }
}

module.exports = new Command(metadata);
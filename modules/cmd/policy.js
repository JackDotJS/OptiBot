const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const sim = require('string-similarity');
const { Command, OBUtil, Memory } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    aliases: ['policies', 'policys'],
    short_desc: `Search Moderator policies.`,
    args: `<query>`,
    authlvl: 1,
    flags: ['DM_OPTIONAL'],
    run: null
}


metadata.run = (m, args, data) => {
    if(!args[0]) {
        OBUtil.missingArgs(m, metadata);
    } else {
        const policies = {
            index: bot.util.policies(bot),
            kw: []
        }

        for(let policy of policies.index) {
            if(policy.type === 2) {
                policies.kw = policies.kw.concat(policy.kw);
            }
        }

        policies.kw = [...new Set(policies.kw)] // ensures there are no duplicates

        let match = sim.findBestMatch((m.content.substring( `${bot.prefix}${metadata.name} `.length )), policies.kw)

        for(let i = 0; i<policies.index.length; i++) {
            if(policies.index[i].type === 2 && policies.index[i].kw.indexOf(match.bestMatch.target) > -1) {
                let embed = policies.index[i].embed
                .setAuthor('OptiFine Discord Moderation Policies', OBUtil.getEmoji('ICO_docs').url)
                .setFooter(`${(match.bestMatch.rating * 100).toFixed(1)}% match during search.`)
                m.channel.send({embed: embed}).then(bm => OBUtil.afterSend(bm, m.author.id));
                break;
            }

            if(i+1 === policies.index.length) {
                OBUtil.err('Unable to find a policy.', {m:m});
            }
        }
    }
}

module.exports = new Command(metadata);
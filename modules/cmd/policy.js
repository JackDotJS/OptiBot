const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const sim = require('string-similarity');
const Command = require(path.resolve(`./modules/core/command.js`));
const errMsg = require(path.resolve(`./modules/util/simpleError.js`));
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    aliases: ['policies', 'policys'],
    short_desc: `Search Moderator policies.`,
    usage: `<~query>`,
    authlevel: 1,
    tags: ['DM_OPTIONAL'],

    run: (m, args, data) => {
        if(!args[0]) {
            let embed = new djs.RichEmbed()
            .setAuthor(`Usage:`, bot.icons.find('ICO_info'))
            .setDescription(`\`\`\`${data.cmd.metadata.usage}\`\`\``)
            .setColor(bot.cfg.embed.default);

            m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot, log));
        } else {
            const policies = {
                index: require(path.resolve(`./cfg/policies.js`))(bot),
                kw: []
            }
    
            for(let policy of policies.index) {
                if(policy.type === 2) {
                    policies.kw = policies.kw.concat(policy.kw);
                }
            }
    
            policies.kw = [...new Set(policies.kw)] // ensures there are no duplicates

            let match = sim.findBestMatch((m.content.substring( `${bot.prefix}${path.parse(__filename).name} `.length )), policies.kw)

            for(let i = 0; i<policies.index.length; i++) {
                if(policies.index[i].type === 2 && policies.index[i].kw.indexOf(match.bestMatch.target) > -1) {
                    let embed = policies.index[i].embed
                    .setAuthor('OptiFine Discord Moderation Policies', bot.icons.find('ICO_docs'))
                    .setFooter(`${(match.bestMatch.rating * 100).toFixed(1)}% match during search.`)
                    m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot, log));
                    break;
                }

                if(i+1 === policies.index.length) {
                    let err = new Error('Unable to find a policy.');
                    m.channel.send({embed: errMsg(err, bot, log)})
                    .catch(err => { log(err.stack, 'error') });
                }
            }
        }
    }
})}
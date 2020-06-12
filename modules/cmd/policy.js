const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const sim = require('string-similarity');
const Command = require(path.resolve(`./modules/core/command.js`));

const setup = (bot) => { 
    return new Command(bot, {
        name: path.parse(__filename).name,
        aliases: ['policies', 'policys'],
        short_desc: `Search Moderator policies.`,
        args: `<query>`,
        authlvl: 1,
        flags: ['DM_OPTIONAL'],
        run: func
    });
}


const func = (m, args, data) => {
    const bot = data.bot;
    const log = data.log;

    if(!args[0]) {
        data.cmd.noArgs(m);
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

        let match = sim.findBestMatch((m.content.substring( `${bot.prefix}${data.input.cmd} `.length )), policies.kw)

        for(let i = 0; i<policies.index.length; i++) {
            if(policies.index[i].type === 2 && policies.index[i].kw.indexOf(match.bestMatch.target) > -1) {
                let embed = policies.index[i].embed
                .setAuthor('OptiFine Discord Moderation Policies', bot.icons.find('ICO_docs'))
                .setFooter(`${(match.bestMatch.rating * 100).toFixed(1)}% match during search.`)
                m.channel.send({embed: embed}).then(bm => bot.util.responder(m.author.id, bm, bot));
                break;
            }

            if(i+1 === policies.index.length) {
                bot.util.err(new Error('Unable to find a policy.'), bot, {m:m});
            }
        }
    }
}

module.exports = setup;
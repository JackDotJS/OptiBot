const path = require(`path`);
const util = require(`util`);

const djs = require(`discord.js`);
const sim = require('string-similarity');
const wink = require('jaro-winkler');

const Command = require(path.resolve(`./modules/core/command.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    aliases: ['answer', 'question', 'q', 'query'],
    short_desc: `Search for answered questions from <#531622141393764352>.`,
    long_desc: `Searches for answered questions in the <#531622141393764352> channel.`,
    args: `<query | discord message>`,
    authlvl: 0,
    flags: ['DM_OPTIONAL'],

    run: (m, args, data) => {
        if(!args[0]) {
            data.cmd.noArgs(m);
        } else {
            let query = m.cleanContent.substring(`${bot.prefix}${data.input.cmd} `.length);
            let faq = bot.util.faq(bot);
            let entries = [];
            let best = {
                r: 0,
                embed: null
            }

            for(let entry of faq) {
                if(entry.type === 1) {
                    entries.push({
                        kw: entry.kw.concat([entry.embed.title]),
                        embed: entry.embed,
                    });
                }
            }

            bot.util.target(m, args[0], bot, {type: 1, member: data.member}).then(result => {
                if(result && result.type === 'message') {
                    query = result.target.cleanContent;
                }

                rate();
            }).catch(err => {
                bot.util.err(err, bot, {m:m});
            });
            
            let i = 0;
            function rate() {
                let entry = entries[i];
                for(let kw of entry.kw) {
                    // dice's coefficient
                    let match = sim.compareTwoStrings(query.toLowerCase(), kw.toLowerCase());
    
                    // jaro-winkler
                    //let match = wink(query.toLowerCase(), question[0].toLowerCase());
    
                    if (match > best.r) best = {
                        r: match,
                        embed: entry.embed
                    };
                }

                if (i+1 >= entries.length || best.r === 1) {
                    final();
                } else {
                    i++
                    rate();
                }
            }

            function final() {
                if (best.r < 0.05) {
                    bot.util.err('Could not find an answer to that question', bot, {m:m});
                } else {
                    let embed = best.embed
                    .setAuthor('Frequently Asked Questions', bot.icons.find('ICO_faq'))
                    .setFooter(`${(best.r * 100).toFixed(1)}% match during search.`)

                    m.channel.send({embed: embed}).then(bm => bot.util.responder(m.author.id, bm, bot));
                }
            }
        }
    }
})}
const path = require(`path`);
const util = require(`util`);

const djs = require(`discord.js`);
const sim = require('string-similarity');
const wink = require('jaro-winkler');

const Command = require(path.resolve(`./modules/core/command.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    aliases: ['answer'],
    short_desc: `Search for answered questions from <#531622141393764352>`,
    long_desc: `Searches for answered questions in the <#531622141393764352> channel.`,
    usage: `<~text:query | target:discord message>`,
    authlvl: 0,
    tags: ['DM_OPTIONAL'],

    run: (m, args, data) => {
        if(!args[0]) {
            data.cmd.noArgs(m);
        } else {
            let query = m.cleanContent.substring(`${bot.prefix}${data.input.cmd} `.length);

            bot.util.target(m, args[0], bot, {type: 1, member: data.member}).then(result => {
                if(result && result.type === 'message') {
                    query = result.target.cleanContent;
                    getMessages();
                } else 
                if(result && result.type === 'notfound') {
                    bot.util.err('Could not find a message to use for search.', bot, {m:m});
                } else {
                    getMessages();
                }
            }).catch(err => {
                bot.util.err(err, bot, {m:m});
            });


            let allmsg = [];
            let runs = 0;
            function getMessages(before) {
                log(query);
                runs++;
                log(runs);
                bot.guilds.cache.get(bot.cfg.guilds.optifine).channels.cache.get('531622141393764352').messages.fetch({limit:100, before:before}, true).then(msgs => {
                    let last = false;
                    if(msgs.has('531629512559951872')) {
                        log('non-faq deleted');
                        msgs.delete('531629512559951872')
                        last = true;
                    }

                    if(msgs.size === 0) {
                        filtermsg();
                    } else {
                        let arraymsg = [...msgs.values()];
                        allmsg = allmsg.concat(arraymsg);

                        if(last){
                            filtermsg();
                        } else {
                            getMessages(arraymsg[arraymsg.length - 1].id);
                        }
                    }
                });
            }

            let i = 0;
            let ratings = [];
            let best = {
                r: 0,
                message: null,
                q: null,
                a: null
            }

            function filtermsg() {
                if(i === 0) {
                    log('all messages gotten')
                    log(`total length: ${allmsg.length}`)
                    log(`queries: ${runs}`)
                }

                let question = allmsg[i].content.match(/(?<=Q: \*\*).+(?=\*\*)/);
                let answer = allmsg[i].content.split('\n').slice(1).join('\n').replace(/A:/i, "").replace(/_\s+_\s*$/, "").trim();

                if (question !== null) {
                    // dice's coefficient
                    let match = sim.compareTwoStrings(query.toLowerCase(), question[0].toLowerCase());

                    // jaro-winkler
                    //let match = wink(query.toLowerCase(), question[0].toLowerCase());
                    let matchData = {
                        r: match,
                        message: allmsg[i],
                        q: question,
                        a: answer
                    }

                    if (match > best.r) best = matchData;
                    ratings.push(matchData);
                }

                if (i+1 >= allmsg.length || best.r === 1) {
                    ratings.sort((a,b) => a.r - b.r);
                    log(ratings);
                    if (best.r < 0.05 || best.message === undefined || best.message === null) {
                        bot.util.err('Could not find an answer to that question', bot, {m:m});
                    } else {
                        let embed = new djs.MessageEmbed()
                        .setColor(bot.cfg.embed.default)
                        .setAuthor('Frequently Asked Questions', bot.icons.find('ICO_faq'))
                        .setTitle(best.q)
                        .setFooter(`${(best.r * 100).toFixed(1)}% match during search.`);

                        if (best.message.attachments.size > 0) {
                            let attachments = [...best.message.attachments.values()];
                            let imageAdded = false;

                            attachments.forEach((file, i) => {
                                if (file.url.match(/.(jpg|jpeg|png|gif)$/i) !== null && !imageAdded) {
                                    embed.setImage(file.url);
                                    imageAdded = true;
                                } else {
                                    if(i === 0) {
                                        if(!best.a || typeof best.a !== 'string') {
                                            best.a = '';
                                        }

                                        best.a += '\n\n'+file.url;
                                    } else {
                                        best.a += '\n'+file.url;
                                    }
                                }
                            });
                        }

                        let infotext = '';

                        if (best.a) {
                            if (best.a.length < 2000) {
                                embed.setDescription(best.a);
                            } else {
                                infotext = `**The answer to this question is too long to show in an embed.**\n`;
                                embed.setDescription(best.a.substring(0, 512).trim()+'...')
                            }
                        }

                        embed.addField('Additional Information', `[${infotext}Click here to go to the original message link.](${best.message.url})\n\n Check out the <#531622141393764352> channel to find more frequent questions.`);

                        m.channel.send({embed: embed}).then(bm => bot.util.responder(m.author.id, bm, bot));
                    }
                } else {
                    i++
                    filtermsg();
                }
            }
        }
    }
})}
const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));
const errMsg = require(path.resolve(`./modules/util/simpleError.js`));
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    aliases: ['vote'],
    short_desc: `Start, view, or end a poll.`,
    long_desc: `Starts, displays, or ends a poll. \n\nTo start a vote, specify the type of answers, and then the details of the vote. The details will be displayed in the vote message.\n\n To view or simply end an existing vote, type \`${bot.prefix}${path.parse(__filename).name} view\` or \`${bot.prefix}${path.parse(__filename).name} end\`.`,
    usage: `<start|view|end> [<yn|2-10> <message>]`,
    authlevel: 1,
    tags: ['NO_DM', 'INSTANT'],

    run: (m, args, data) => {
        if (!args[0]) {
            let embed = new djs.RichEmbed()
            .setAuthor(`Usage:`, bot.icons.find('ICO_info'))
            .setDescription(`\`\`\`${data.cmd.metadata.usage}\`\`\``)
            .setColor(bot.cfg.embed.default);

            m.channel.send({embed: embed})
            .then(bm => msgFinalizer(m.author.id, bm, bot, log))
            .catch(err => {
                m.channel.send({embed: errMsg(err, bot, log)})
                .catch(e => { log(err.stack, 'error') });
            });
        } else
        if (args[0].toLowerCase() === 'start') {
            if(bot.memory.vote.issue !== null) {
                let embed = new djs.RichEmbed()
                .setAuthor(`You cannot start a poll while one is already active.`, bot.icons.find('ICO_error'))
                .setColor(bot.cfg.embed.error);

                m.channel.send({embed: embed})
                .then(bm => msgFinalizer(m.author.id, bm, bot, log))
                .catch(err => {
                    m.channel.send({embed: errMsg(err, bot, log)})
                    .catch(e => { log(err.stack, 'error') });
                });
            } else {
                let type;

                if(args[1].toLowerCase() === 'yn') {
                    type = 0;
                } else
                if(!isNaN(parseInt(args[1]))) {
                    if(parseInt(args[1]) < 2) {
                        let embed = new djs.RichEmbed()
                        .setAuthor(`Numbered polls must have a minimum of 2 options.`, bot.icons.find('ICO_error'))
                        .setColor(bot.cfg.embed.error);

                        m.channel.send({embed: embed})
                        .then(bm => msgFinalizer(m.author.id, bm, bot, log))
                        .catch(err => {
                            m.channel.send({embed: errMsg(err, bot, log)})
                            .catch(e => { log(err.stack, 'error') });
                        });
                        return;
                    } else
                    if(parseInt(args[1]) > 10) {
                        let embed = new djs.RichEmbed()
                        .setAuthor(`Numbered polls cannot exceed 10 options.`, bot.icons.find('ICO_error'))
                        .setColor(bot.cfg.embed.error);

                        m.channel.send({embed: embed})
                        .then(bm => msgFinalizer(m.author.id, bm, bot, log))
                        .catch(err => {
                            m.channel.send({embed: errMsg(err, bot, log)})
                            .catch(e => { log(err.stack, 'error') });
                        });
                        return;
                    } else {
                        type = 1;
                    }
                } else {
                    let embed = new djs.RichEmbed()
                    .setAuthor(`You must specify valid voting options.`, bot.icons.find('ICO_error'))
                    .setColor(bot.cfg.embed.error);

                    m.channel.send({embed: embed})
                    .then(bm => msgFinalizer(m.author.id, bm, bot, log))
                    .catch(err => {
                        m.channel.send({embed: errMsg(err, bot, log)})
                        .catch(e => { log(err.stack, 'error') });
                    });
                    return;
                }

                if(!args[2]) {
                    let embed = new djs.RichEmbed()
                    .setAuthor(`You must specify the details of the poll.`, bot.icons.find('ICO_error'))
                    .setColor(bot.cfg.embed.error);

                    m.channel.send({embed: embed})
                    .then(bm => msgFinalizer(m.author.id, bm, bot, log))
                    .catch(err => {
                        m.channel.send({embed: errMsg(err, bot, log)})
                        .catch(e => { log(err.stack, 'error') });
                    });
                } else {
                    let vote = {
                        issue: m.content.substring( `${bot.prefix}${path.parse(__filename).name} ${args[0]} ${args[1]} `.length ),
                        author: m.author.tag,
                        message: {
                            g: m.guild.id,
                            c: m.channel.id,
                            m: null
                        }
                    }

                    if(vote.issue.length > 1000) {
                        let embed = new djs.RichEmbed()
                        .setAuthor(`Poll message cannot exceed 1,000 characters.`, bot.icons.find('ICO_error'))
                        .setColor(bot.cfg.embed.error);

                        m.channel.send({embed: embed})
                        .then(bm => msgFinalizer(m.author.id, bm, bot, log))
                        .catch(err => {
                            m.channel.send({embed: errMsg(err, bot, log)})
                            .catch(e => { log(err.stack, 'error') });
                        });
                    }

                    let embed = new djs.RichEmbed()
                    .setAuthor(`Poll started by ${vote.author}`, bot.icons.find('ICO_docs'))
                    .setColor(bot.cfg.embed.default)
                    .setDescription(`> ${vote.issue}`)

                    m.channel.send({embed: embed}).then(bm => {
                        vote.message.m = bm.id;
                        bot.memory.vote = vote;

                        let emoji = [];

                        if(type === 0) {
                            emoji = ['👍', '👎'];
                        } else {
                            emoji = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
                        }

                        let limit = (type === 0) ? emoji.length : parseInt(args[1]);
                        let i = 0;
                        (function addEmoji() {
                            bm.react(emoji[i]).then(() => {
                                i++;
                                if(i < limit) {
                                    addEmoji();
                                }
                            });
                        })();
                    }).catch(err => {
                        m.channel.send({embed: errMsg(err, bot, log)})
                        .catch(e => { log(err.stack, 'error') });
                    });
                }
            }
        } else
        if (args[0].toLowerCase() === 'view' || args[0].toLowerCase() === 'end') {
            if(bot.memory.vote.issue === null) {
                let embed = new djs.RichEmbed()
                .setAuthor(`There is no active poll.`, bot.icons.find('ICO_error'))
                .setColor(bot.cfg.embed.error);

                m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot, log));
            } else {
                bot.guilds.get(bot.memory.vote.message.g).channels.get(bot.memory.vote.message.c).fetchMessage(bot.memory.vote.message.m).then(bm => {
                    let votes = [...bm.reactions.filter(react => react.me).values()];
                    let totalvotes = 0;
                    let counts = [];

                    votes.forEach(react => {
                        totalvotes += (react.count - 1);
                    });

                    votes.forEach(react => {
                        counts.push(`${react.emoji} _ _ **${(react.count-1).toLocaleString()} vote${((react.count-1) === 1) ? '' : 's'}** | ${totalvotes === 0 ? ('0.0') : ((100 * (react.count - 1)) / totalvotes).toFixed(1)}%`);
                    });

                    let embed = new djs.RichEmbed();

                    if (args[0].toLowerCase() === 'end') {
                        embed.setAuthor(`Poll ended`, bot.icons.find('ICO_okay'))
                        .setColor(bot.cfg.embed.okay)
                        .setDescription(`**[Click here to go to the original poll.](${bm.url})**`)
                        .addField('Final Results', counts.join('\n\n'))

                        bot.memory.vote = {
                            issue: null,
                            author: null,
                            message: null
                        }
                    } else {
                        embed.setAuthor(`Poll started by ${bot.memory.vote.author}`, bot.icons.find('ICO_docs'))
                        .setColor(bot.cfg.embed.default)
                        .setDescription(`> ${bot.memory.vote.issue}\n**[Click here to vote!](${bm.url})**`)
                        .addField('Current Count', counts.join('\n\n'))
                    }

                    m.channel.send({embed: embed}).then(bm2 => msgFinalizer(m.author.id, bm2, bot, log));
                });
            }
        } else {
            let embed = new djs.RichEmbed()
            .setAuthor(`You must specify a valid action to perform.`, bot.icons.find('ICO_error'))
            .setColor(bot.cfg.embed.error);

            m.channel.send({embed: embed})
            .then(bm => msgFinalizer(m.author.id, bm, bot, log))
            .catch(err => {
                m.channel.send({embed: errMsg(err, bot, log)})
                .catch(e => { log(err.stack, 'error') });
            });
        }
    }
})}
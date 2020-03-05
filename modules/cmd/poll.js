const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));
const erm = require(path.resolve(`./modules/util/simpleError.js`));
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    aliases: ['vote'],
    short_desc: `Start, view, or end a poll.`,
    long_desc: `Starts, displays, or ends a poll. \n\nTo start a vote, type \`${bot.prefix}${path.parse(__filename).name} start\` and then provide the details of the vote. The details will be displayed in the vote message.\n\n To view or simply end an existing vote, type \`${bot.prefix}${path.parse(__filename).name} view\` or \`${bot.prefix}${path.parse(__filename).name} end\` respectively.`,
    usage: `<view|end|start <message>>`,
    authlevel: 1,
    tags: ['NO_DM', 'INSTANT'],

    run: (m, args, data) => {
        if (!args[0]) {
            data.cmd.noArgs(m);
        } else
        if (args[0].toLowerCase() === 'start') {
            if(bot.memory.vote.issue !== null) {
                erm(`You cannot start a poll while one is already active.`, bot, {m: m})
            } else
            if(!args[1]) {
                erm(`You must specify the details of the poll.`, bot, {m: m})
            } else {
                let vote = {
                    issue: m.content.substring( `${bot.prefix}${path.parse(__filename).name} ${args[0]} `.length ),
                    author: m.author.tag,
                    message: {
                        g: m.guild.id,
                        c: m.channel.id,
                        m: null
                    }
                }

                if(vote.issue.length > 1000) {
                    erm(`Poll message cannot exceed 1,000 characters.`, bot, {m: m})
                }

                let embed = new djs.MessageEmbed()
                .setAuthor(`Poll started by ${vote.author}`, bot.icons.find('ICO_docs'))
                .setColor(bot.cfg.embed.default)
                .setDescription(`> ${vote.issue}`)

                m.channel.send({embed: embed}).then(bm => {
                    vote.message.m = bm.id;
                    bot.memory.vote = vote;

                    bm.react('👍').then(() => {
                        bm.react('👎');
                    });
                }).catch(err => {
                    erm(err, bot, {m: m})
                });
            }
        } else
        if (args[0].toLowerCase() === 'view' || args[0].toLowerCase() === 'end') {
            if(bot.memory.vote.issue === null) {
                erm(`There is no active poll.`, bot, {m: m})
            } else {
                bot.guilds.cache.get(bot.memory.vote.message.g).channels.cache.get(bot.memory.vote.message.c).fetchMessage(bot.memory.vote.message.m).then(bm => {
                    let votes = [...bm.reactions.filter(react => react.me).values()];
                    let totalvotes = 0;
                    let counts = [];

                    votes.forEach(react => {
                        totalvotes += (react.count - 1);
                    });

                    votes.forEach(react => {
                        counts.push(`${react.emoji} _ _ **${(react.count-1).toLocaleString()} vote${((react.count-1) === 1) ? '' : 's'}** | ${totalvotes === 0 ? ('0.0') : ((100 * (react.count - 1)) / totalvotes).toFixed(1)}%`);
                    });

                    let embed = new djs.MessageEmbed();

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

                    m.channel.send({embed: embed}).then(bm2 => msgFinalizer(m.author.id, bm2, bot));
                });
            }
        } else {
            erm(`You must specify a valid action to perform.`, bot, {m: m})
        }
    }
})}
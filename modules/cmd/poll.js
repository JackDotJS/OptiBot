const path = require('path');
const util = require('util');
const djs = require('discord.js');
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  aliases: ['vote'],
  short_desc: 'Start, view, or end a poll.',
  long_desc: `Starts, displays, or ends a poll. \n\nTo start a vote, type \`${bot.prefix}${path.parse(__filename).name} start\` and then provide the details of the vote. The details will be displayed in the vote message.\n\n To view or simply end an existing vote, type \`${bot.prefix}${path.parse(__filename).name} view\` or \`${bot.prefix}${path.parse(__filename).name} end\` respectively.`,
  args: '<option> [text]',
  authlvl: 2,
  flags: ['NO_DM', 'NO_TYPER'],
  run: null
};


metadata.run = (m, args, data) => {
  if (!args[0]) {
    OBUtil.missingArgs(m, metadata);
  } else
  if (args[0].toLowerCase() === 'start') {
    if (Memory.vote.issue !== null) {
      OBUtil.err('You cannot start a poll while one is already active.', { m: m });
    } else
    if (!args[1]) {
      OBUtil.err('You must specify the details of the poll.', { m: m });
    } else {
      const vote = {
        issue: m.content.substring(`${bot.prefix}${path.parse(__filename).name} ${args[0]} `.length),
        author: m.author.tag,
        message: {
          g: m.guild.id,
          c: m.channel.id,
          m: null
        }
      };

      if (vote.issue.length > 1000) {
        OBUtil.err('Poll message cannot exceed 1,000 characters.', { m: m });
      }

      const embed = new djs.MessageEmbed()
        .setAuthor(`Poll started by ${vote.author}`, Assets.getEmoji('ICO_docs').url)
        .setColor(bot.cfg.embed.default)
        .setDescription(`> ${vote.issue}`);

      m.channel.send({ embed: embed }).then(bm => {
        vote.message.m = bm.id;
        Memory.vote = vote;

        bm.react('👍').then(() => {
          bm.react('👎');
        });
      }).catch(err => {
        OBUtil.err(err, { m: m });
      });
    }
  } else
  if (args[0].toLowerCase() === 'view' || args[0].toLowerCase() === 'end') {
    if (Memory.vote.issue === null) {
      OBUtil.err('There is no active poll.', { m: m });
    } else {
      bot.guilds.cache.get(Memory.vote.message.g).channels.cache.get(Memory.vote.message.c).messages.fetch(Memory.vote.message.m).then(bm => {
        const votes = [...bm.reactions.cache.filter(react => react.me).values()];
        let totalvotes = 0;
        const counts = [];

        votes.forEach(react => {
          totalvotes += (react.count - 1);
        });

        votes.forEach(react => {
          counts.push(`${react.emoji} _ _ ${(react.count - 1).toLocaleString()} vote${((react.count - 1) === 1) ? '' : 's'}**｜**${totalvotes === 0 ? ('0.0') : ((100 * (react.count - 1)) / totalvotes).toFixed(1)}%`);
        });

        const embed = new djs.MessageEmbed();

        if (args[0].toLowerCase() === 'end') {
          embed.setAuthor('Poll ended', Assets.getEmoji('ICO_okay').url)
            .setColor(bot.cfg.embed.okay)
            .setDescription(`**[Click here to go to the original poll.](${bm.url})**`)
            .addField('Final Results', counts.join('\n\n'));

          Memory.vote = {
            issue: null,
            author: null,
            message: null
          };
        } else {
          embed.setAuthor(`Poll started by ${Memory.vote.author}`, Assets.getEmoji('ICO_docs').url)
            .setColor(bot.cfg.embed.default)
            .setDescription(`> ${Memory.vote.issue}\n**[Click here to vote!](${bm.url})**`)
            .addField('Current Count', counts.join('\n\n'));
        }

        m.channel.send({ embed: embed }).then(bm2 => OBUtil.afterSend(bm2, m.author.id));
      });
    }
  } else {
    OBUtil.err('You must specify a valid action to perform.', { m: m });
  }
};

module.exports = new Command(metadata);
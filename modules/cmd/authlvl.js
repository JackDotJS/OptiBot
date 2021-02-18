const path = require('path');
const util = require('util');
const djs = require('discord.js');
const timeago = require('timeago.js');
const { Command, memory, RecordEntry, LogEntry, Assets } = require('../core/optibot.js');

const bot = memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  aliases: ['authlevel'],
  short_desc: 'Test OptiBot member auth levels.',
  long_desc: 'Gives the auth level of a given member, as well as listing your own to compare.',
  args: '<discord member>',
  authlvl: 2,
  flags: ['DM_OPTIONAL', 'NO_TYPER'],
  run: null
};

metadata.run = (m, args, data) => {
  if(!args[0]) {
    bot.util.missingArgs(m, metadata);
  } else {
    bot.util.parseTarget(m, 0, args[0], data.member).then(result => {
      if (!result) {
        bot.util.err('You must specify a valid user.', {m:m});
      } else 
      if (result.type === 'notfound') {
        bot.util.err('Unable to find a user.', {m:m});
      } else {
        const targetAuth = bot.util.getAuthlvl(result.target);

        m.channel.send(`\`\`\`Your Authlvl: ${data.authlvl}\nTarget Authlvl: ${targetAuth}\`\`\``).then(bm => bot.util.afterSend(bm, m.author.id));
      }
    }).catch(err => bot.util.err(err, {m:m}));
  }
};

module.exports = new Command(metadata);
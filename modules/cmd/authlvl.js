const path = require('path');
const util = require('util');
const djs = require('discord.js');
const timeago = require('timeago.js');
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;
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
    OBUtil.missingArgs(m, metadata);
  } else {
    OBUtil.parseTarget(m, 0, args[0], data.member).then(result => {
      if (!result) {
        OBUtil.err('You must specify a valid user.', {m:m});
      } else 
      if (result.type === 'notfound') {
        OBUtil.err('Unable to find a user.', {m:m});
      } else {
        const targetAuth = OBUtil.getAuthlvl(result.target);

        m.channel.send(`\`\`\`Your Authlvl: ${data.authlvl}\nTarget Authlvl: ${targetAuth}\`\`\``).then(bm => OBUtil.afterSend(bm, m.author.id));
      }
    }).catch(err => OBUtil.err(err, {m:m}));
  }
};

module.exports = new Command(metadata);
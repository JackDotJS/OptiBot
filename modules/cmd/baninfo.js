const path = require('path');
const util = require('util');
const djs = require('discord.js');
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  aliases: ['getban', 'searchban'],
  short_desc: 'Get ban information.',
  long_desc: 'Gets information on a given user\'s ban. Includes information from records if available.',
  args: '<discord member>',
  authlvl: 1,
  flags: ['DM_OPTIONAL', 'MOD_CHANNEL_ONLY', 'LITE'],
  run: null
};

metadata.run = (m, args, data) => {
  if(!args[0]) {
    OBUtil.missingArgs(m, metadata);
  } else {
    OBUtil.parseTarget(m, 0, args[0], data.member).then((result) => {
      if (!result) {
        OBUtil.err('You must specify a valid user.', {m:m});
      } else
      if (result.type === 'notfound') {
        OBUtil.err('Unable to find a user.', {m:m});
      } else
      if (result.id === m.author.id || result.id === bot.user.id) {
        OBUtil.err('Nice try.', {m:m});
      } else {
        bot.mainGuild.fetchBan(result.id).then(ban => {
          OBUtil.getProfile(result.id, false).then(profile => {
            let recordEntry = null;
    
            if(profile && profile.edata.record) {
              const record = profile.edata.record.reverse();
              for(let i = 0; i < record.length; i++) {
                const entry = record[i];
    
                if(entry.action === 4 && entry.actionType === 1) {
                  recordEntry = entry;
                  break;
                }
              }
            }
    
            const embed = new djs.MessageEmbed()
              .setColor(bot.cfg.embed.default)
              .setAuthor('Ban Information', Assets.getEmoji('ICO_docs').url)
              .setTitle(result.tag)
              .setDescription([
                `Mention: ${result.mention}`,
                `\`\`\`yaml\nID: ${result.id}\`\`\``
              ].join('\n'))
              .addField('Ban Reason', ban.reason);

            if(result.type !== 'id') {
              embed.setThumbnail(((result.type === 'user') ? result.target : result.target.user).displayAvatarURL({format:'png'}));
            }

            if(recordEntry != null) {
              if(recordEntry.reason !== ban.reason) {
                embed.addField('(Record) Ban Reason', recordEntry.reason);
              }
    
              if(recordEntry.details != null) {
                embed.addField('(Record) Details', recordEntry.details);
              }
            }

            m.channel.send({embed: embed}).then(bm => OBUtil.afterSend(bm, m.author.id));
          }).catch(err => OBUtil.err(err, {m:m}));
        }).catch(err => {
          if(err.message.match(/unknown ban/i)) {
            OBUtil.err(`"${result.tag}" is not currently banned.`, {m:m});
          } else {
            OBUtil.err(err, {m:m});
          }
        });
      }
    }).catch(err => OBUtil.err(err, {m:m}));
  }
};

module.exports = new Command(metadata);
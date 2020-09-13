const path = require('path');
const util = require('util');
const djs = require('discord.js');
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  aliases: ['rmnote', 'removenote'],
  short_desc: 'Remove a moderation note.',
  long_desc: 'Removes a given moderation note. With the exception of Administrators, moderation notes can only be removed by the note author.',
  args: '<discord member> <case ID>',
  authlvl: 2,
  flags: ['NO_DM', 'STRICT', 'NO_TYPER'],
  run: null
};

metadata.run = (m, args, data) => {
  if(!args[1]) {
    OBUtil.missingArgs(m, metadata);
  } else {
    const now = new Date().getTime();
    OBUtil.parseTarget(m, 0, args[0], data.member).then((result) => {
      if (!result) {
        OBUtil.err('You must specify a valid user.', {m:m});
      } else 
      if (result.type === 'notfound') {
        OBUtil.err('Unable to find a user.', {m:m});
      } else
      if (OBUtil.getAuthlvl(result.target) > data.authlvl) {
        OBUtil.err('You are not strong enough to modify this user\'s record.', {m:m});
      } else 
      if (result.id === m.author.id || result.id === bot.user.id) {
        OBUtil.err('Nice try.', {m:m});
      } else {
        OBUtil.getProfile(result.id, false).then(profile => {
          if(!profile.edata.record) {
            return OBUtil.err('This user does not have a record.', {m:m});
          }

          profile.getRecord(args[1]).then((entry) => {
            if(!entry || !entry.index) {
              return OBUtil.err(`Unable to find case ID "${args[1]}".`, {m:m});
            }
    
            if(entry.action !== 0) {
              return OBUtil.err(`Record entry "${args[1]}" is not a note.`, {m:m});
            }
    
            if(entry.moderator !== m.author.id && data.authlvl < 4) {
              return OBUtil.err('You do not have permission to modify this entry.', {m:m});
            }
    
            const embed = new djs.MessageEmbed()
              .setAuthor('Are you sure?', Assets.getEmoji('ICO_warn').url)
              .setColor(bot.cfg.embed.default)
              .setDescription([
                'The following note will be removed:',
                '> **Note Contents:**',
                `> ${entry.reason.split('\n').join(`${Assets.getEmoji('ICO_space')}\n> `)}`
              ].join(`${Assets.getEmoji('ICO_space')}\n`))
              .setFooter('This action CANNOT be undone.');
    
            m.channel.send('_ _', {embed: embed}).then(msg => {
              OBUtil.confirm(m, msg).then(res => {
                if(res === 1) {
                  log(`removing 1 element at index ${entry.index}`);
                  log(`record size: ${profile.edata.record.length}`);
                  profile.edata.record.splice(entry.index, 1);
    
                  OBUtil.updateProfile(profile).then(() => {
                    const logEntry = new LogEntry({channel: 'moderation'})
                      .setColor(bot.cfg.embed.error)
                      .setIcon(Assets.getEmoji('ICO_trash').url)
                      .setTitle('Moderation Note Deleted', 'Moderation Note Deleted Report')
                      .addSection('Member', result.target)
                      .addSection('Record Entry', entry)
                      .addSection('Note Author', entry.moderator);

                    if(m.author.id !== entry.moderator.id) {
                      logEntry.addSection('Deleted by', m.author);
                    } else {
                      logEntry.addSection('Deleted by', 'Author');
                    }
                                        
                    logEntry.addSection('Command Location', m)
                      .addSection('Note Contents', entry.reason)
                      .submit().then(() => {
                        const embed = new djs.MessageEmbed()
                          .setAuthor('Note Removed.', Assets.getEmoji('ICO_okay').url)
                          .setColor(bot.cfg.embed.okay);
    
                        msg.edit({embed: embed});//.then(bm => OBUtil.afterSend(bm, m.author.id));
                      });
                  }).catch(err => OBUtil.err(err, {m:m}));
                } else
                if(res === 0) {
                  const update = new djs.MessageEmbed()
                    .setAuthor('Cancelled', Assets.getEmoji('ICO_load').url)
                    .setColor(bot.cfg.embed.default)
                    .setDescription(`${result.mention}'s profile has not been changed.`);
    
                  msg.edit({embed: update}).then(msg => { OBUtil.afterSend(msg, m.author.id); });
                } else {
                  const update = new djs.MessageEmbed()
                    .setAuthor('Timed out', Assets.getEmoji('ICO_load').url)
                    .setColor(bot.cfg.embed.default)
                    .setDescription('Sorry, you didn\'t respond in time. Please try again.');
    
                  msg.edit({embed: update}).then(msg => { OBUtil.afterSend(msg, m.author.id); });
                }
              }).catch(err => {
                OBUtil.err(err, {m:m});
              });
            });
          });
        }).catch(err => OBUtil.err(err, {m:m}));
      }
    }).catch(err => OBUtil.err(err, {m:m}));
  } 
};

module.exports = new Command(metadata);
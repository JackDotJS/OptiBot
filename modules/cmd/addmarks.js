const path = require('path');
const djs = require('discord.js');
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  aliases: ['addmark', 'addm', 'am', 'marks', 'addpoints', 'addpoint', 'addp', 'ap', 'points'],
  short_desc: 'Add violation marks to a user.',
  long_desc: 'Gives a number of violation marks to a given user.',
  args: '<discord member> <count> [reason]',
  authlvl: 2,
  flags: ['NO_DM', 'STRICT', 'LITE'],
  run: null
};

metadata.run = (m, args, data) => {
  if(!args[1]) {
    OBUtil.missingArgs(m, metadata);
  } else 
  if(!Number.isInteger(parseInt(args[1]))) {
    OBUtil.err('You must specify a valid number of marks.', {m:m});
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
      } else
      if (OBUtil.getAuthlvl(result.target) > data.authlvl) {
        OBUtil.err('That user is too powerful to be given marks.', {m:m});
      } else {
        OBUtil.getProfile(result.id, true).then(profile => {
          if(!profile.edata.record) profile.edata.record = [];
          const reason = m.content.substring( `${bot.prefix}${data.input.cmd} ${args[0]} ${args[1]} `.length );
          const points = Math.abs(parseInt(args[1]));

          if(points > bot.cfg.points.assignMax) return OBUtil.err(`You cannot assign more than ${bot.cfg.points.assignMax.toLocaleString()} marks at a time.`, {m:m});
          if(points < bot.cfg.points.assignMin) return OBUtil.err(`You must assign at least ${bot.cfg.points.assignMin.toLocaleString()} marks.`, {m:m});

          const entry = new RecordEntry()
            .setMod(m.author.id)
            .setURL(m.url)
            .setAction('points')
            .setActionType('add')
            .setReason(m.author, (args[2]) ? reason : 'No reason provided.')
            .setDetails(m.author, [
              `Marks assigned: [${points}]`,
              `Total marks at time of addition: [${profile.getPoints().current + points}]`
            ].join('\n'));

          profile.edata.record.push(entry.raw);

          OBUtil.updateProfile(profile).then(() => {
            const logEntry = new LogEntry({channel: 'moderation'})
              .setColor(bot.cfg.embed.default)
              .setIcon(Assets.getEmoji('ICO_points').url)
              .setTitle('Violation Marks Added', 'Violation Mark Addition Report')
              .addSection('Member', result.target)
              .addSection('Moderator Responsible', m.author)
              .addSection('Command Location', m)
              .addSection('Marks Added', points)
              .addSection('Total Violation Marks', profile.getPoints().current);

            if(result.type !== 'id') {
              logEntry.setThumbnail(((result.type === 'user') ? result.target : result.target.user).displayAvatarURL({format:'png'}));
            }

            const embed = new djs.MessageEmbed()
              .setAuthor('Marks added', Assets.getEmoji('ICO_points').url)
              .setColor(bot.cfg.embed.default)
              .setDescription(`${result.mention} has been given ${Math.abs(parseInt(args[1])).toLocaleString()} violation marks.`);

            if(args[2]) {
              embed.addField('Reason', reason);
              logEntry.setHeader(`Reason: ${reason}`);
            } else {
              embed.addField('Reason', `No reason provided. \n(Please use the \`${bot.prefix}editrecord\` command.)`);
              logEntry.setHeader('No reason provided.');
            }

            m.channel.stopTyping(true);
                        
            m.channel.send({embed: embed});//.then(bm => OBUtil.afterSend(bm, m.author.id));
            logEntry.submit();
          }).catch(err => OBUtil.err(err, {m:m}));
        }).catch(err => OBUtil.err(err, {m:m}));
      }
    }).catch(err => OBUtil.err(err, {m:m}));
  }
};

module.exports = new Command(metadata);
const path = require('path');
const util = require('util');
const djs = require('discord.js');
const sim = require('string-similarity');
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    aliases: ['rank'],
    short_desc: 'Add or remove member roles.',
    long_desc: 'Adds or removes roles for the specified member.',
    args: '<discord member> <role>',
    authlvl: 2,
    flags: ['NO_DM', 'LITE'],
    run: null
};

metadata.run = (m, args, data) => {
    if(!args[1]) {
        OBUtil.missingArgs(m, metadata);
    } else {
        OBUtil.parseTarget(m, 0, args[0], data.member).then((result) => {
            if (!result) {
                OBUtil.err('You must specify a valid user.', {m:m});
            } else
            if (result.type === 'notfound' || result.type === 'id' || result.type === 'user') {
                OBUtil.err('Unable to find a user.', {m:m});
            } else
            if (result.target.user.id === m.author.id || result.target.user.id === bot.user.id) {
                OBUtil.err('Nice try.', {m:m});
            } else 
            if (OBUtil.getAuthlvl(result.target) > data.authlvl) {
                OBUtil.err('You aren\'t powerful enough to update this user\'s roles.', {m:m});
            } else {
                const roles = [...bot.guilds.cache.get(bot.cfg.guilds.optifine).roles.cache.filter(role => bot.cfg.roles.grantable.indexOf(role.id) > -1).values()];
                const match = {
                    role: null,
                    rating: 0,
                };
                const reqrole = m.content.substring((`${bot.prefix}${data.input.cmd} ${args[0]} `).length);
                for(const role of roles) {
                    const newrating = sim.compareTwoStrings(reqrole, role.name);
                    if (newrating > match.rating) {
                        match.role = role;
                        match.rating = newrating;
                    }
                }

                log(match);

                if (match.rating < 0.05) {
                    OBUtil.err('What kind of role is that?', {m:m});
                } else
                if (!result.target.roles.cache.has(match.role.id)) {
                    result.target.roles.add(match.role.id, `Role granted by ${m.author.tag}`).then(() => {
                        const logEntry = new LogEntry({channel: 'moderation'})
                            .setColor(bot.cfg.embed.okay)
                            .setIcon(Assets.getEmoji('ICO_join').url)
                            .setTitle('Member Role Granted', 'Member Role Grant Report')
                            .setThumbnail(result.target.user.displayAvatarURL({format:'png'}))
                            .addSection('Member', result.target)
                            .addSection('Moderator Responsible', m.author)
                            .addSection('Command Location', m)
                            .addSection('Role', `${match.role}`)
                            .submit().then(() => {
                                const embed = new djs.MessageEmbed()
                                    .setColor(bot.cfg.embed.okay)
                                    .setAuthor('Role added', Assets.getEmoji('ICO_okay').url)
                                    .setDescription(`${result.target} has been given the ${match.role} role.`);

                                m.channel.send({embed: embed}).then(bm => OBUtil.afterSend(bm, m.author.id));
                            });
                    }).catch(err => OBUtil.err(err, {m:m}));
                } else {
                    result.target.roles.remove(match.role.id, `Role removed by ${m.author.tag}`).then(() => {
                        const logEntry = new LogEntry({channel: 'moderation'})
                            .setColor(bot.cfg.embed.error)
                            .setIcon(Assets.getEmoji('ICO_leave').url)
                            .setTitle('Member Role Removed', 'Member Role Removal Report')
                            .setThumbnail(result.target.user.displayAvatarURL({format:'png'}))
                            .addSection('Member', result.target)
                            .addSection('Moderator Responsible', m.author)
                            .addSection('Command Location', m)
                            .addSection('Role', `${match.role}`)
                            .submit().then(() => {
                                const embed = new djs.MessageEmbed()
                                    .setColor(bot.cfg.embed.okay)
                                    .setAuthor('Role removed', Assets.getEmoji('ICO_okay').url)
                                    .setDescription(`${result.target} no longer has the ${match.role} role.`);

                                m.channel.send({embed: embed}).then(bm => OBUtil.afterSend(bm, m.author.id));
                            });
                        
                    }).catch(err => OBUtil.err(err, {m:m}));
                }
            }
        }).catch(err => OBUtil.err(err, {m:m}));
    }
};

module.exports = new Command(metadata);
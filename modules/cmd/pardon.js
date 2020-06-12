const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));

const setup = (bot) => { 
    return new Command(bot, {
        name: path.parse(__filename).name,
        short_desc: `Pardon a record entry.`,
        long_desc: `Dismisses a given record entry. Note that this will only pardon a single record entry. If needed, any linked entries must also be pardoned separately.`,
        args: `<discord member> <case ID> <reason>`,
        authlvl: 4,
        flags: ['NO_TYPER'],
        run: func
    });
}


const func = (m, args, data) => {
    const bot = data.bot;
    const log = data.log;

    if(!args[2]) {
        data.cmd.noArgs(m);
    } else {
        bot.util.target(m, args[0], bot, {type: 0, member:data.member}).then((result) => {
            if (!result) {
                bot.util.err('You must specify a valid user.', bot, {m:m})
            } else
            if (result.type === 'notfound') {
                bot.util.err('Unable to find a user.', bot, {m:m})
            } else {
                let id = (result.type === 'id') ? result.target : result.target.user.id;

                if (id === m.author.id || id === bot.user.id) {
                    bot.util.err('Nice try.', bot, {m:m})
                } else {
                    bot.getProfile(id, false).then(profile => {
                        if(!profile || (profile && !profile.data.essential.record)) {
                            bot.util.err('This user has no record.', bot, {m:m});
                        } else {
                            for(let i in profile.data.essential.record) {
                                let entry = profile.data.essential.record[i];
                                if(entry.date === parseInt(args[1])) {
                                    let reason = m.content.substring( `${bot.prefix}${data.input.cmd} ${args[0]} ${args[1]} `.length );

                                    let action = '';
                                    let type = '';
                                    let rec = {
                                        action: null,
                                        icon: '<:ICO_default:657533390073102363>'
                                    }
                    
                                    switch(entry.action) {
                                        case 0:
                                            rec.icon = `<:ICO_docs:657535756746620948>`;
                                            action = `Note`;
                                            break;
                                        case 1:
                                            rec.icon = `<:ICO_warn:672291115369627678>`;
                                            action = `Warning`;
                                            break;
                                        case 2:
                                            rec.icon = `<:ICO_mute:671593152221544450>`;
                                            action = `Mute`;
                                            break;
                                        case 3:
                                            rec.icon = `<:ICO_kick:671964834988032001>`;
                                            action = `Kick`;
                                            break;
                                        case 4:
                                            rec.icon = `<:ICO_ban:671964834887106562>`;
                                            action = `Ban`;
                                            break;
                                    }
                    
                                    switch(entry.actionType) {
                                        case -1:
                                            type = `Remove`;
                                            break;
                                        case 0:
                                            type = `Edit`;
                                            break;
                                        case 1:
                                            if ([3, 4].indexOf(entry.action) < 0) type = `Add`;
                                            break;
                                    }
                    
                                    rec.action = `${type} ${action}`.trim();

                                    let embed = new djs.MessageEmbed()
                                    .setAuthor('Are you sure?', bot.icons.find('ICO_warn'))
                                    .setColor(bot.cfg.embed.default)
                                    .setDescription(`The following record entry will be dismissed: \n\n${rec.icon} ${rec.action}\n> ${entry.reason.split('\n').join('\n> ')}`)
                    
                                    m.channel.send('_ _', {embed: embed}).then(msg => {
                                        bot.util.confirm(m, msg, bot).then(res => {

                                            // big todo here

                                            if(res === 1) {
                                                entry.pardon = {
                                                    state: true,
                                                    date: new Date().getTime(),
                                                    admin: m.author.id,
                                                    reason: reason
                                                }
                    
                                                bot.updateProfile(id, profile).then(() => {
                                                    let update = new djs.MessageEmbed()
                                                    .setAuthor(`Success`, bot.icons.find('ICO_okay'))
                                                    .setColor(bot.cfg.embed.okay)
                                                    .setDescription(`Case ID ${entry.date} has been marked as pardoned.`)
                                                    .addField('Reason', reason);
                                
                                                    msg.edit({embed: update}).then(msg => { bot.util.responder(m.author.id, msg, bot); });
                                                });
                                            } else
                                            if(res === 0) {
                                                let update = new djs.MessageEmbed()
                                                .setAuthor('Cancelled', bot.icons.find('ICO_load'))
                                                .setColor(bot.cfg.embed.default)
                                                .setDescription('Record entry has not been changed.')
                    
                                                msg.edit({embed: update}).then(msg => { bot.util.responder(m.author.id, msg, bot); });
                                            } else {
                                                let update = new djs.MessageEmbed()
                                                .setAuthor('Timed out', bot.icons.find('ICO_load'))
                                                .setColor(bot.cfg.embed.default)
                                                .setDescription(`Sorry, you didn't respond in time. Please try again.`)
                    
                                                msg.edit({embed: update}).then(msg => { bot.util.responder(m.author.id, msg, bot); });
                                            }
                                        }).catch(err => {
                                            bot.util.err(err, bot, {m:m});
                                        })
                                    });
                                } else
                                if(i >= profile.data.essential.record.length) {
                                    bot.util.err('Unable to find the given case ID.', bot, {m:m})
                                }
                            }
                        }
                    }).catch(err => bot.util.err(err, bot, {m:m}));
                }
            }
        }).catch(err => bot.util.err(err, bot, {m:m}));
    }
}

module.exports = setup;
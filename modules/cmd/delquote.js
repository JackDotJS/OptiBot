const path = require(`path`);
const djs = require(`discord.js`);
const { Command } = require(`../core/OptiBot.js`);

const setup = (bot) => { 
    return new Command(bot, {
        name: path.parse(__filename).name,
        aliases: ['unquote', 'rmquote'],
        short_desc: `Remove profile quotes.`,
        long_desc: `Removes a quote from a given profile. Defaults to yourself when no arguments are given. Requires moderator permissions to remove quotes from other profiles.`,
        authlvl: 0,
        args: `[discord member]`,
        flags: ['DM_OPTIONAL', 'NO_TYPER', 'LITE'],
        run: func
    });
}

const func = (m, args, data) => {
    const bot = data.bot;
    const log = data.log;

    bot.util.target(m, args[0], bot, {type: 0, member:data.member}).then(result => {
        if(!result) {
            if(args[0] && data.authlvl >= 2) {
                bot.util.err(`You must specify a valid user.`, bot, {m:m});
            } else {
                bot.getProfile(m.author.id, false).then(profile => {
                    if(!profile || (profile && !profile.data.quote)) {
                        bot.util.err('Your profile does not have a quote message.', bot, {m:m})
                    } else {
                        let embed = new djs.MessageEmbed()
                        .setAuthor('Are you sure?', bot.icons.find('ICO_warn'))
                        .setColor(bot.cfg.embed.default)
                        .setDescription(`The following quote will be permanently removed from your OptiBot profile: \n> ${profile.data.quote}`)
        
                        m.channel.send('_ _', {embed: embed}).then(msg => {
                            bot.util.confirm(m, msg, bot).then(res => {
                                if(res === 1) {
                                    delete profile.data.quote;
        
                                    bot.updateProfile(m.author.id, profile).then(() => {
                                        let update = new djs.MessageEmbed()
                                        .setAuthor(`Success`, bot.icons.find('ICO_okay'))
                                        .setColor(bot.cfg.embed.okay)
                                        .setDescription(`Your profile has been updated.`)
                    
                                        msg.edit({embed: update}).then(msg => { bot.util.responder(m.author.id, msg, bot); });
                                    });
                                } else
                                if(res === 0) {
                                    let update = new djs.MessageEmbed()
                                    .setAuthor('Cancelled', bot.icons.find('ICO_load'))
                                    .setColor(bot.cfg.embed.default)
                                    .setDescription('Your profile has not been changed.')
        
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
                    }
                });
            }
        } else
        if(data.authlvl < 2) {
            bot.util.err('You do not have permission to remove quotes from other profiles.', bot, {m:m});
        } else 
        if(result.type === 'notfound') {
            bot.util.err(`Unable to find a user.`, bot, {m:m});
        } else {
            let id = (result.type === 'id') ? result.target : result.target.user.id;

            bot.getProfile(id, false).then(profile => {
                if(!profile && result.type === 'id') {
                    bot.util.err('This user does not have a profile.', bot, {m:m})
                } else 
                if(!profile || (profile && !profile.data.quote)) {
                    bot.util.err('This profile does not have a quote message.', bot, {m:m})
                } else {
                    let embed = new djs.MessageEmbed()
                    .setAuthor('Are you sure?', bot.icons.find('ICO_warn'))
                    .setColor(bot.cfg.embed.default)
                    .setDescription(`The following quote will be permanently removed from <@${id}>'s OptiBot profile: \n> ${profile.data.quote}`)
    
                    m.channel.send('_ _', {embed: embed}).then(msg => {
                        bot.util.confirm(m, msg, bot).then(res => {
                            if(res === 1) {
                                delete profile.data.quote;

                                log(profile);
    
                                bot.updateProfile(profile.id, profile).then(() => {
                                    let update = new djs.MessageEmbed()
                                    .setAuthor(`Success`, bot.icons.find('ICO_okay'))
                                    .setColor(bot.cfg.embed.okay)
                                    .setDescription(`<@${id}>'s profile has been updated.`)
                
                                    msg.edit({embed: update}).then(msg => { bot.util.responder(m.author.id, msg, bot); });
                                });
                            } else
                            if(res === 0) {
                                let update = new djs.MessageEmbed()
                                .setAuthor('Cancelled', bot.icons.find('ICO_load'))
                                .setColor(bot.cfg.embed.default)
                                .setDescription(`<@${id}>'s profile has not been changed.`)
    
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
                }
            });
        }
    });
}

module.exports = setup;
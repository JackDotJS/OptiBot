const path = require(`path`);
const djs = require(`discord.js`);
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    aliases: ['unquote', 'rmquote'],
    short_desc: `Remove profile quotes.`,
    long_desc: `Removes a quote from a given profile. Defaults to yourself when no arguments are given. Requires moderator permissions to remove quotes from other profiles.`,
    authlvl: 0,
    args: `[discord member]`,
    flags: ['DM_OPTIONAL', 'NO_TYPER', 'LITE', 'BOT_CHANNEL_ONLY'],
    run: null
}

metadata.run = (m, args, data) => {
    OBUtil.parseTarget(m, 0, args[0], data.member).then(result => {
        if(!result || data.authlvl < 2 || result.id === m.author.id) {
            if(!result && args[0] && data.authlvl >= 2) {
                OBUtil.err(`You must specify a valid user.`, {m:m});
            } else {
                OBUtil.getProfile(m.author.id, false).then(profile => {
                    if(!profile || (profile && !profile.ndata.quote)) {
                        OBUtil.err('Your profile does not have a quote message.', {m:m})
                    } else {
                        let embed = new djs.MessageEmbed()
                        .setAuthor('Are you sure?', Assets.getEmoji('ICO_warn').url)
                        .setColor(bot.cfg.embed.default)
                        .setDescription(`The following quote will be permanently removed from your OptiBot profile: \n> ${profile.ndata.quote}`)
        
                        m.channel.send('_ _', {embed: embed}).then(msg => {
                            OBUtil.confirm(m, msg).then(res => {
                                if(res === 1) {
                                    delete profile.ndata.quote;
        
                                    OBUtil.updateProfile(profile).then(() => {
                                        let update = new djs.MessageEmbed()
                                        .setAuthor(`Success`, Assets.getEmoji('ICO_okay').url)
                                        .setColor(bot.cfg.embed.okay)
                                        .setDescription(`Your profile has been updated.`)
                    
                                        msg.edit({embed: update}).then(msg => { OBUtil.afterSend(msg, m.author.id); });
                                    });
                                } else
                                if(res === 0) {
                                    let update = new djs.MessageEmbed()
                                    .setAuthor('Cancelled', Assets.getEmoji('ICO_load').url)
                                    .setColor(bot.cfg.embed.default)
                                    .setDescription('Your profile has not been changed.')
        
                                    msg.edit({embed: update}).then(msg => { OBUtil.afterSend(msg, m.author.id); });
                                } else {
                                    let update = new djs.MessageEmbed()
                                    .setAuthor('Timed out', Assets.getEmoji('ICO_load').url)
                                    .setColor(bot.cfg.embed.default)
                                    .setDescription(`Sorry, you didn't respond in time. Please try again.`)
        
                                    msg.edit({embed: update}).then(msg => { OBUtil.afterSend(msg, m.author.id); });
                                }
                            }).catch(err => {
                                OBUtil.err(err, {m:m});
                            })
                        });
                    }
                });
            }
        } else
        if(result.type === 'notfound') {
            OBUtil.err(`Unable to find a user.`, {m:m});
        } else {
            OBUtil.getProfile(result.id, false).then(profile => {
                if(!profile) {
                    OBUtil.err('This user does not have a profile.', {m:m})
                } else 
                if(!profile || (profile && !profile.ndata.quote)) {
                    OBUtil.err('This profile does not have a quote message.', {m:m})
                } else {
                    let embed = new djs.MessageEmbed()
                    .setAuthor('Are you sure?', Assets.getEmoji('ICO_warn').url)
                    .setColor(bot.cfg.embed.default)
                    .setDescription(`The following quote will be permanently removed from ${result.mention}'s OptiBot profile: \n> ${profile.ndata.quote}`)
    
                    m.channel.send('_ _', {embed: embed}).then(msg => {
                        OBUtil.confirm(m, msg).then(res => {
                            if(res === 1) {
                                let logEntry = new LogEntry({channel: "moderation"})
                                .setColor(bot.cfg.embed.default)
                                .setIcon(Assets.getEmoji('ICO_warn').url)
                                .setTitle(`Profile Quote Deleted`, `Profile Quote Deletion Report`)
                                .addSection(`Member`, result.target)
                                .addSection(`Moderator Responsible`, m.author)
                                .addSection(`Command Location`, m)

                                if(result.type !== 'id') {
                                    logEntry.setThumbnail(((result.type === "user") ? result.target : result.target.user).displayAvatarURL({format:'png'}))
                                }

                                logEntry.addSection(`Quote`, profile.ndata.quote)

                                delete profile.ndata.quote;
    
                                OBUtil.updateProfile(profile).then(() => {
                                    let update = new djs.MessageEmbed()
                                    .setAuthor(`Success`, Assets.getEmoji('ICO_okay').url)
                                    .setColor(bot.cfg.embed.okay)
                                    .setDescription(`${result.mention}'s profile has been updated.`)

                                    msg.channel.stopTyping(true);
                                    logEntry.submit();
                                    msg.edit({embed: update})//.then(msg => { OBUtil.afterSend(msg, m.author.id); });
                                }).catch(err => {
                                    logEntry.error(err);
                                })
                            } else
                            if(res === 0) {
                                let update = new djs.MessageEmbed()
                                .setAuthor('Cancelled', Assets.getEmoji('ICO_load').url)
                                .setColor(bot.cfg.embed.default)
                                .setDescription(`${result.mention}'s profile has not been changed.`)
    
                                msg.edit({embed: update}).then(msg => { OBUtil.afterSend(msg, m.author.id); });
                            } else {
                                let update = new djs.MessageEmbed()
                                .setAuthor('Timed out', Assets.getEmoji('ICO_load').url)
                                .setColor(bot.cfg.embed.default)
                                .setDescription(`Sorry, you didn't respond in time. Please try again.`)
    
                                msg.edit({embed: update}).then(msg => { OBUtil.afterSend(msg, m.author.id); });
                            }
                        }).catch(err => {
                            OBUtil.err(err, {m:m});
                        })
                    });
                }
            });
        }
    });
}

module.exports = new Command(metadata);
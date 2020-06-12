const util = require(`util`);
const djs = require(`discord.js`);

module.exports = {
    interval: 1000,
    lite: true,
    fn: (bot, log) => {
        if(!bot.memory.bot.init) {
            for(let i in bot.memory.mutes) {
                if(i >= bot.memory.mutes.length) return;
                if(new Date().getTime() >= bot.memory.mutes[i].time) {
                    bot.guilds.cache.get(bot.cfg.guilds.optifine).members.fetch(bot.memory.mutes[i].userid, true).then(mem => {
                        mem.roles.remove(bot.cfg.roles.muted, `Mute time limit passed.`).then(() => {
                            bot.getProfile(bot.memory.mutes[i].userid, false).then(profile => {
                                if(profile) {
                                    delete profile.data.essential.mute
                                    bot.updateProfile(bot.memory.mutes[i].userid, profile).then(() => {
                                        finish();
                                    }).catch(err => {
                                        bot.util.err(err, bot);
                                    });
                                } else {
                                    finish();
                                }
    
                                function finish() {
                                    bot.memory.mutes.splice(i, 1);
    
                                    let embed = new djs.MessageEmbed()
                                    .setColor(bot.cfg.embed.default)
                                    .setAuthor('Member Unmuted', bot.icons.find('ICO_unmute'))
                                    .setTitle(`Reason: Mute time limit passed.`)
                                    .setThumbnail(mem.user.displayAvatarURL)
                                    .setDescription(`${mem.user} | ${mem.user.tag} \n\`\`\`yaml\n${mem.user.id}\`\`\``)
                                    .setFooter(`Event logged on ${new Date().toUTCString()}`)
                                    .setTimestamp(new Date())
            
                                    bot.guilds.cache.get(bot.cfg.logging.guild).channels.cache.get(bot.cfg.logging.channel).send({embed: embed});
                                }
                            }).catch(err => {
                                bot.util.err(err, bot);
                            });
                        }).catch(err => {
                            bot.util.err(err, bot);
                        });
                    }).catch(err => {
                        bot.util.err(err, bot);
                    });
                }
            }
        }
    }
}
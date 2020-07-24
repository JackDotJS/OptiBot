const path = require(`path`);
const djs = require(`discord.js`);
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    short_desc: `Ban a given user.`,
    long_desc: `Bans a given user... and that's it. This command only really exists to allow moderators to ban users outside of the server. **Note that this will NOT delete any existing messages for the sake of preserving history.**`,
    args: `<discord member> <reason>`,
    authlvl: 3,
    flags: ['NO_DM'],
    run: null
}

metadata.run = (m, args, data) => {
    if(!args[1]) {
        OBUtil.missingArgs(m, metadata);
    } else {
        let reason = m.content.substring( `${bot.prefix}${path.parse(__filename).name} ${args[0]} `.length);

        OBUtil.parseTarget(m, 0, args[0], data.member).then((result) => {
            if(result && !['user', 'member', 'id'].includes(result.type)) {
                OBUtil.err(`You must specify a valid user.`, {m:m});
            } else {
                bot.mainGuild.fetchBan(result.id).then(() => {
                    OBUtil.err(`${result.mention} has already been banned.`, {m:m});
                }).catch(err => {
                    if(err.stack.match(/unknown ban/i)) {
                        let embed = new djs.MessageEmbed()
                        .setAuthor('Are you sure?', Assets.getEmoji('ICO_warn').url)
                        .setColor(bot.cfg.embed.default)
                        .setDescription(`The following user will be banned from the server: \n> ${result.mention} (${result.id})`)
                        .addField(`Reason`, reason);

                        m.channel.stopTyping(true);
                        m.channel.send('_ _', {embed: embed}).then(msg => {
                            OBUtil.confirm(m, msg).then(res => {
                                if(res === 1) {
                                    Memory.rban[result.id] = m.author;

                                    bot.mainGuild.members.ban(result.target, { reason: reason}).then(() => {
                                        let update = new djs.MessageEmbed()
                                        .setColor(bot.cfg.embed.okay)
                                        .setAuthor(`Successfully banned user`, Assets.getEmoji('ICO_okay').url)
                                        .setDescription(`${(result.type === 'id') ? `\`${result.target}\`` : result.target.toString()} has been banned.`)
                                        .addField(`Reason`, reason);
                    
                                        msg.edit({embed: update})//.then(bm => OBUtil.afterSend(bm, m.author.id))
                                    }).catch(err => OBUtil.err(err, {m:m}));
                                } else
                                if(res === 0) {
                                    let update = new djs.MessageEmbed()
                                    .setAuthor('Cancelled', Assets.getEmoji('ICO_load').url)
                                    .setColor(bot.cfg.embed.default)
                                    .setDescription('User has not been banned.')

                                    msg.edit({embed: update}).then(bm => OBUtil.afterSend(bm, m.author.id))
                                } else {
                                    let update = new djs.MessageEmbed()
                                    .setAuthor('Timed out', Assets.getEmoji('ICO_load').url)
                                    .setColor(bot.cfg.embed.default)
                                    .setDescription(`Sorry, you didn't respond in time. Please try again.`)

                                    msg.edit({embed: update}).then(bm => OBUtil.afterSend(bm, m.author.id))
                                }
                            }).catch(err => {
                                OBUtil.err(err, {m:m});
                            })
                        });
                    } else {
                        OBUtil.err(err, {m:m});
                    }
                })
            }
        });
    }
}

module.exports = new Command(metadata);

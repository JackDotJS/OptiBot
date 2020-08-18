const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    aliases: ['unlockdown'],
    short_desc: `Unlock ALL server channels.`,
    long_desc: `Unlocks ALL channels in the server.`,
    args: `[channel]`,
    authlvl: 3,
    flags: ['NO_DM', 'STRICT', 'NO_TYPER', 'LITE'],
    run: null
}

metadata.run = (m, args, data) => {
    let channels = [...bot.mainGuild.channels.cache
        .filter((channel) => channel.type === 'text' && !bot.cfg.channels.nomodify.some(id => [channel.id, channel.parentID].includes(id)))
        .sort((a,b) => a.rawPosition - b.rawPosition)
        .values()
    ];

    let embed = new djs.MessageEmbed()
    .setAuthor('Are you sure?', Assets.getEmoji('ICO_warn').url)
    .setColor(bot.cfg.embed.default)
    .setDescription(`ALL of the following channels will be unlocked: \n> ${channels.join('\n> ')}`)

    m.channel.send('_ _', {embed: embed}).then(msg => {
        OBUtil.confirm(m, msg).then(res => {
            if(res === 1) {
                embed = new djs.MessageEmbed()
                .setAuthor('Unlocking all channels...', Assets.getEmoji('ICO_wait').url)
                .setColor(bot.cfg.embed.default)

                msg.edit({embed:embed}).then((msg) => {
                    let logEntry = new LogEntry({channel: "moderation"})
                    .preLoad();

                    let i = 0;
                    let success = 0;
                    let fail = 0;
                    (function nextChannel() {
                        let channel = channels[i];

                        if (!channel.permissionOverwrites.get(bot.mainGuild.id).deny.has('SEND_MESSAGES')) {
                            log(`Skipping channel #${channel.name} (${channel.id}) since it has already been unlocked.`, 'info')
                            i++;
                            return nextChannel();
                        }

                        channel.updateOverwrite(bot.mainGuild.id, {SEND_MESSAGES:null}, `Channel unlocked by ${m.author.tag} (${m.author.id}) via ${bot.prefix}${data.input.cmd}`).then(() => {
                            success++;

                            if(i+1 >= channels.length) {
                                logEntry.setColor(bot.cfg.embed.default)
                                .setIcon(Assets.getEmoji('ICO_unlock').url)
                                .setTitle(`All Channels Unlocked`, `Channel Unlock Report`)
                                .addSection(`Successful Unlocks`, success, true)
                                .addSection(`Failed Unlocks`, fail, true)
                                .addSection(`Moderator Responsible`, m.author)
                                .addSection(`Command Location`, m)
                        
                                let embed = new djs.MessageEmbed()
                                .setAuthor(`All channels unlocked.`, Assets.getEmoji('ICO_okay').url)
                                .setColor(bot.cfg.embed.okay)
                                .addField(`Successful Unlocks`, success, true)
                                .addField(`Failed Unlocks`, fail, true)
                        
                                m.channel.stopTyping(true);
                                m.channel.send({embed: embed})//.then(bm => OBUtil.afterSend(bm, m.author.id));
                                logEntry.submit();
                            } else {
                                i++;
                                nextChannel();
                            }
                        }).catch(err => {
                            OBUtil.err(err);

                            fail++;
                            i++;
                            nextChannel();
                        })
                    })();
                });
            } else
            if(res === 0) {
                let update = new djs.MessageEmbed()
                .setAuthor('Cancelled', Assets.getEmoji('ICO_load').url)
                .setColor(bot.cfg.embed.default)
                .setDescription('No channels have been changed.')

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

module.exports = new Command(metadata);
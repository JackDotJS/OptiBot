const path = require(`path`);
const djs = require(`discord.js`);
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    aliases: ['slowmode', 'slow'],
    short_desc: `Set slowmode time in this channel.`,
    long_desc: `Manually sets interval for slowmode in the current channel.`,
    args: `<time>`,
    authlvl: 2,
    flags: ['NO_DM', 'NO_TYPER'],
    run: null
}

metadata.run = (m, args, data) => {
    if(!args[0]) {
        OBUtil.missingArgs(m, metadata);
    } else 
    if(bot.cfg.channels.nomodify.includes(m.channel.id) || bot.cfg.channels.nomodify.includes(m.channel.parentID)) {
        OBUtil.err('This channel is not allowed to be modified.', {m:m});
    } else {
        let time = OBUtil.parseTime(args[0]);

        if((time.ms / 1000) > 600) {
            OBUtil.err('Slowmode cannot exceed 10 minutes.', {m:m});
        } else 
        if((time.ms / 1000) < 0) {
            OBUtil.err('Slowmode cannot use negative values.', {m:m});
        } else 
        if(m.channel.rateLimitPerUser === (time.ms / 1000)) {
            OBUtil.err(`Slowmode is already ${(time.ms === 0) ? `disabled` : `set to ${time.string}`} in this channel.`, {m:m});
        } else {
            m.channel.setRateLimitPerUser((time.ms / 1000), `Slowmode set by ${m.author.tag} (${m.author.id})`).then(() => {
                let logEntry = new LogEntry({channel: "moderation"})
                .setColor(bot.cfg.embed.default)
                .setIcon(Assets.getEmoji('ICO_time').url)
                .setTitle(`Slowmode Time Updated`, `Slowmode Update Report`)
                .addSection(`Moderator Responsible`, m.author)
                .addSection(`Command Location`, m)
                .addSection(`New Slowmode Value`, (time.ms === 0) ? `Slowmode disabled.` : `${time.string}.`)
                .submit().then(() => {
                    let embed = new djs.MessageEmbed()
                    .setAuthor(`Slowmode ${(time.ms === 0) ? `disabled.` : `set to ${time.string}.`}`, Assets.getEmoji('ICO_okay').url)
                    .setColor(bot.cfg.embed.okay)
        
                    m.channel.send({embed: embed})//.then(bm => OBUtil.afterSend(bm, m.author.id));
                });
            }).catch(err => {
                OBUtil.err(err, {m:m})
            })
        }
    }
}

module.exports = new Command(metadata);
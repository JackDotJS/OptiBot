const path = require(`path`);
const djs = require(`discord.js`);
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    short_desc: `Force update OptiBot`,
    args: '[skip]',
    authlvl: 5,
    flags: ['NO_DM', 'NO_TYPER'],
    run: null
}

metadata.run = (m, args, data) => {
    function updateNow() {
        let logEntry = new LogEntry()
        .setColor(bot.cfg.embed.default)
        .setIcon(Assets.getEmoji('ICO_door').url)
        .setTitle(`OptiBot is being updated...`, `OptiBot Force Update Report`)
        .addSection(`Command Issuer`, m.author)
        .submit().then(() => {
            let embed = new djs.MessageEmbed()
            .setAuthor('Updating. See you soon!', Assets.getEmoji('ICO_door').url)
            .setColor(bot.cfg.embed.default);

            m.channel.send({embed: embed}).then(() => {
                bot.exit(17);
            });
        });
    }

    if(args[0] && args[0].toLowerCase() === 'skip') {
        return updateNow();
    }

    let embed = new djs.MessageEmbed()
    .setAuthor('Are you sure?', Assets.getEmoji('ICO_warn').url)
    .setColor(bot.cfg.embed.default)
    .setDescription(`OptiBot will be forcefully updated to the latest version available on GitHub`)

    m.channel.send('_ _', {embed: embed}).then(msg => {
        OBUtil.confirm(m, msg).then(res => {
            if(res === 1) {
                updateNow()
            } else
            if(res === 0) {
                let update = new djs.MessageEmbed()
                .setAuthor('Cancelled', Assets.getEmoji('ICO_load').url)
                .setColor(bot.cfg.embed.default)
                .setDescription('OptiBot has not been updated.')

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
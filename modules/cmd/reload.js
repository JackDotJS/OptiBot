const path = require(`path`);
const djs = require(`discord.js`);
const { Command, OBUtil, Memory, LogEntry, Assets } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    aliases: [`reset`],
    short_desc: `Reload OptiBot assets.`,
    long_desc: `Reloads OptiBot assets, such as commands, OptiBits, core classes, and images.`,
    authlvl: 5,
    flags: ['DM_OPTIONAL', 'NO_TYPER'],
    run: null
}

metadata.run = (m, args, data) => {
    log(`${m.author.tag} (${m.author.id}) requested asset update.`, 'info')

    let logEntry = new LogEntry()
    .setColor(bot.cfg.embed.default)
    .setIcon(Assets.getEmoji('ICO_info').url)
    .setTitle(`OptiBot Assets Reloaded`, `OptiBot Assets Reload Report`)
    .addSection(`Moderator Responsible`, m.author)
    .addSection(`Command Location`, m)
    .submit().then(() => {
        let embed = new djs.MessageEmbed()
        .setAuthor('Reloading assets...', Assets.getEmoji('ICO_load').url)
        .setColor(bot.cfg.embed.default)

        m.channel.send('_ _', {embed: embed}).then(bm => {
            let embed2 = new djs.MessageEmbed()
            .setColor(bot.cfg.embed.okay);
    
            Assets.load(1).then((time) => {
                embed2.setAuthor(`Commands successfully reset in ${time / 1000} seconds.`, Assets.getEmoji('ICO_okay').url)
                log(`Commands successfully reset in ${time / 1000} seconds.`, 'info')

                bot.setTimeout(() => {
                    bm.edit({embed: embed2})
                    .then(bm => OBUtil.afterSend(bm, m.author.id))
                    .catch(err => {
                        OBUtil.err(err, {m:m});
                    });
                }, 250);
            }).catch(err => {
                OBUtil.err(err, {m:m});
            });
        });
    });
}

module.exports = new Command(metadata);
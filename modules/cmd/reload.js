const path = require(`path`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./core/command.js`))
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    short_desc: `Reloads all commands and assets.`,
    authlevel: 4,
    tags: ['DM_OPTIONAL', 'INSTANT'],

    run: (m, args, data) => {
        let embed = new djs.RichEmbed()
        .setAuthor('Reloading assets...', bot.icons.find('ICO_wait'))
        .setColor(bot.cfg.embed.default);

        // todo: add option to only reload commands/images/icons separately
        // !reload cmd, !reload img, !reload icon, etc...

        log(`${m.author.tag} (${m.author.id}) requested asset update.`, 'info')

        m.channel.send('_ _', {embed: embed}).then(bm => {
            msgFinalizer(m.author.id, bm, bot, log);
            bot.loadAssets().then((time) => {
                let embed2 = new djs.RichEmbed()
                .setAuthor(`Assets successfully reloaded in ${time / 1000} seconds.`, bot.icons.find('ICO_okay'))
                .setColor(bot.cfg.embed.okay);

                log(`Assets successfully reloaded in ${time / 1000} seconds.`, 'info')

                bot.setTimeout(() => {
                    bm.edit({embed: embed2});
                }, 1000);
            })
        });
    }
})}
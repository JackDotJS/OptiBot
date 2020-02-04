const path = require(`path`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));
const errMsg = require(path.resolve(`./modules/util/simpleError.js`));
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    short_desc: `Reload commands and assets.`,
    usage: `["all"]`,
    authlevel: 4,
    tags: ['DM_OPTIONAL', 'INSTANT'],

    run: (m, args, data) => {
        let embed = new djs.RichEmbed()
        .setColor(bot.cfg.embed.default)

        if(args[0] === 'all') {
            embed.setAuthor('Reloading all assets...', bot.icons.find('ICO_wait'))
        } else {
            embed.setAuthor('Reloading commands...', bot.icons.find('ICO_wait'))
        }

        log(`${m.author.tag} (${m.author.id}) requested asset update.`, 'info')

        m.channel.send('_ _', {embed: embed})
        .then(bm => {
            bot.loadAssets(1).then((time) => {
                let embed2 = new djs.RichEmbed()
                
                .setColor(bot.cfg.embed.okay);

                if(args[0] === 'all') {
                    embed2.setAuthor(`Assets successfully reloaded in ${time / 1000} seconds.`, bot.icons.find('ICO_okay'))
                    log(`All assets successfully reloaded in ${time / 1000} seconds.`, 'info')
                } else {
                    embed2.setAuthor(`Commands successfully reloaded in ${time / 1000} seconds.`, bot.icons.find('ICO_okay'))
                    log(`Commands successfully reloaded in ${time / 1000} seconds.`, 'info')
                }

                bot.setTimeout(() => {
                    bm.edit({embed: embed2})
                    .then(bm => msgFinalizer(m.author.id, bm, bot, log))
                    .catch(err => {
                        m.channel.send({embed: errMsg(err, bot, log)})
                        .catch(e => { log(err.stack, 'error') });
                    });
                }, 1000);
            })
        }).catch(err => {
            m.channel.send({embed: errMsg(err, bot, log)})
            .catch(e => { log(err.stack, 'error') });
        });
    }
})}
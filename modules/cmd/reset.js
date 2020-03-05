const path = require(`path`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));
const erm = require(path.resolve(`./modules/util/simpleError.js`));
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    short_desc: `Reset commands (default), image assets, and/or deletable messages.`,
    usage: `["images"|"del"]`,
    authlevel: 4,
    tags: ['DM_OPTIONAL', 'INSTANT'],

    run: (m, args, data) => {
        let embed = new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)

        let type = 1;

        if(args[0] === 'images') {
            type = 2;
            embed.setAuthor('Resetting images and icons...', bot.icons.find('ICO_load'))
        } else 
        if(args[0] === 'del') {
            type = 3;
            embed.setAuthor('Resetting deletable messages...', bot.icons.find('ICO_load'))
        } else {
            embed.setAuthor('Resetting commands...', bot.icons.find('ICO_load'))
        }

        log(`${m.author.tag} (${m.author.id}) requested asset update.`, 'info')

        m.channel.send('_ _', {embed: embed}).then(bm => {
            let embed2 = new djs.MessageEmbed()
            .setColor(bot.cfg.embed.okay);

            if(type === 3) {
                let timeStart = new Date().getTime();
                bot.db.msg.remove({}, {multi:true}, (err, rm) => {
                    if(err) {
                        erm(err, bot, {m:m});
                    } else {
                        let time = new Date().getTime() - timeStart;
                        embed2.setAuthor(`Message cache reset in ${time / 1000} seconds.`, bot.icons.find('ICO_okay'))
                        log(`Message cache reset in ${time / 1000} seconds.`, 'info')

                        bot.setTimeout(() => {
                            bm.edit({embed: embed2})
                            .then(bm => msgFinalizer(m.author.id, bm, bot))
                            .catch(err => {
                                erm(err, bot, {m:m});
                            });
                        }, 1000);
                    }
                });
            } else {
                bot.loadAssets(type).then((time) => {
                    if(type === 1) {
                        embed2.setAuthor(`Commands successfully reset in ${time / 1000} seconds.`, bot.icons.find('ICO_okay'))
                        log(`Commands successfully reset in ${time / 1000} seconds.`, 'info')
                        
                    } else
                    if(type === 2) {
                        embed2.setAuthor(`Images successfully reset in ${time / 1000} seconds.`, bot.icons.find('ICO_okay'))
                        log(`All images successfully reset in ${time / 1000} seconds.`, 'info')
                    }
    
                    bot.setTimeout(() => {
                        bm.edit({embed: embed2})
                        .then(bm => msgFinalizer(m.author.id, bm, bot))
                        .catch(err => {
                            erm(err, bot, {m:m});
                        });
                    }, 1000);
                }).catch(err => {
                    erm(err, bot, {m:m});
                });
            }
        })
    }
})}
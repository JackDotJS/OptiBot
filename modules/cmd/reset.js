const path = require(`path`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));

const setup = (bot) => { 
    return new Command(bot, {
        name: path.parse(__filename).name,
        short_desc: `Reset commands (default), image assets, and/or deletable messages.`,
        args: `[images | del]`,
        authlvl: 5,
        flags: ['DM_OPTIONAL', 'NO_TYPER'],
        run: func
    })
}

const func = (m, args, data) => {
    const bot = data.bot;
    const log = data.log;

    let embed = new djs.MessageEmbed()
    .setColor(bot.cfg.embed.default)

    let type = 1;

    if(args[0] === 'images' || args[0] === 'img' || args[0] === 'image' || args[0] === 'icons' || args[0] === 'ico' || args[0] === 'icon') {
        type = 2;
        embed.setAuthor('Resetting images and icons...', bot.icons.find('ICO_load'))
    } else 
    if(args[0] === 'del' || args[0] === 'messages' || args[0] === 'msg' || args[0] === 'message') {
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
                    bot.util.err(err, bot, {m:m});
                } else {
                    let time = new Date().getTime() - timeStart;
                    embed2.setAuthor(`Message cache reset in ${time / 1000} seconds.`, bot.icons.find('ICO_okay'))
                    log(`Message cache reset in ${time / 1000} seconds.`, 'info')

                    bot.setTimeout(() => {
                        bm.edit({embed: embed2})
                        .then(bm => bot.util.responder(m.author.id, bm, bot))
                        .catch(err => {
                            bot.util.err(err, bot, {m:m});
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
                    .then(bm => bot.util.responder(m.author.id, bm, bot))
                    .catch(err => {
                        bot.util.err(err, bot, {m:m});
                    });
                }, 1000);
            }).catch(err => {
                bot.util.err(err, bot, {m:m});
            });
        }
    })
}

module.exports = setup
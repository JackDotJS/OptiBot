const path = require(`path`);
const djs = require(`discord.js`);
const { Command, OBUtil, Memory, LogEntry, Assets } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    aliases: [`reload`],
    short_desc: `Reset OptiBot assets.`,
    long_desc: `Resets commands (default), images, or React-Delete message cache.`,
    args: `[images | del]`,
    authlvl: 5,
    flags: ['DM_OPTIONAL', 'NO_TYPER'],
    run: null
}

metadata.run = (m, args, data) => {
    let embed = new djs.MessageEmbed()
    .setColor(bot.cfg.embed.default)

    let type = 1;

    if(args[0] === 'images' || args[0] === 'img' || args[0] === 'image' || args[0] === 'icons' || args[0] === 'ico' || args[0] === 'icon') {
        type = 2;
        embed.setAuthor('Resetting images and icons...', Assets.getEmoji('ICO_load').url)
    } else 
    if(args[0] === 'del' || args[0] === 'messages' || args[0] === 'msg' || args[0] === 'message') {
        type = 3;
        embed.setAuthor('Resetting deletable messages...', Assets.getEmoji('ICO_load').url)
    } else {
        embed.setAuthor('Resetting commands...', Assets.getEmoji('ICO_load').url)
    }

    log(`${m.author.tag} (${m.author.id}) requested asset update.`, 'info')

    let logEntry = new LogEntry()
    .setColor(bot.cfg.embed.default)
    .setIcon(Assets.getEmoji('ICO_info').url)
    .setTitle(`OptiBot Assets Reloaded (T${type})`, `OptiBot T${type} Assets Reset Report`)
    .addSection(`Moderator Responsible`, m.author)
    .addSection(`Command Location`, m)
    .submit().then(() => {
        m.channel.send('_ _', {embed: embed}).then(bm => {
            let embed2 = new djs.MessageEmbed()
            .setColor(bot.cfg.embed.okay);
    
            if(type === 3) {
                let timeStart = new Date().getTime();
                Memory.db.msg.remove({}, {multi:true}, (err, rm) => {
                    if (err) {
                        OBUtil.err(err, {m:m});
                    } else {
                        let time = new Date().getTime() - timeStart;
                        embed2.setAuthor(`React-Delete message cache reset in ${time / 1000} seconds.`, Assets.getEmoji('ICO_okay').url)
                        log(`Message cache reset in ${time / 1000} seconds.`, 'info')
    
                        bot.setTimeout(() => {
                            bm.edit({embed: embed2})
                            .then(bm => OBUtil.afterSend(bm, m.author.id))
                            .catch(err => {
                                OBUtil.err(err, {m:m});
                            });
                        }, 250);
                    }
                });
            } else {
                Assets.load(type).then((time) => {
                    if(type === 1) {
                        embed2.setAuthor(`Commands successfully reset in ${time / 1000} seconds.`, Assets.getEmoji('ICO_okay').url)
                        log(`Commands successfully reset in ${time / 1000} seconds.`, 'info')
                        
                    } else
                    if(type === 2) {
                        embed2.setAuthor(`Images successfully reset in ${time / 1000} seconds.`, Assets.getEmoji('ICO_okay').url)
                        log(`All images successfully reset in ${time / 1000} seconds.`, 'info')
                    }
    
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
            }
        });
    });
}

module.exports = new Command(metadata);
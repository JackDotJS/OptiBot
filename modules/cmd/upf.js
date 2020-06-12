const path = require(`path`);
const fs = require(`fs`);
const util = require(`util`);
const djs = require(`discord.js`);
const timeago = require("timeago.js");
const Command = require(path.resolve(`./modules/core/command.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    short_desc: `Force update <#${bot.cfg.faq.channel}> channel.`,
    long_desc: `Forcefully updates the <#${bot.cfg.faq.channel}> channel.`,
    args: `["reset"]`,
    authlvl: 4,
    flags: ['NO_DM', 'LITE'],

    run: (m, args, data) => {
        let md = fs.statSync(path.resolve(`./modules/util/faq.js`))
        let faq = bot.util.faq(bot);
        let channel = bot.guilds.cache.get(bot.cfg.faq.guild).channels.cache.get(bot.cfg.faq.channel);
        let timeStart = null;

        // in my experience, these two dates would sometimes get fucked up for some reason so idk i think taking whatevers the latest makes the most sense
        let time = (md.mtime > md.birthtime) ? md.mtime : md.birthtime;

        let cat = [];

        // todo: add confirmation stuff

        let embed = new djs.MessageEmbed()
        .setAuthor('Are you sure?', bot.icons.find('ICO_warn'))
        .setColor(bot.cfg.embed.default)
        .setDescription(`<#${bot.cfg.faq.channel}> entries will be refreshed. This may take a couple minutes`)

        m.channel.send('_ _', {embed: embed}).then(msg => {
            bot.util.confirm(m, msg, bot).then(res => {
                if(res === 1) {
                    let update = new djs.MessageEmbed()
                    .setColor(bot.cfg.embed.default)
                    .setAuthor('Reloading FAQ entries...', bot.icons.find('ICO_load'))

                    msg.edit({embed: update}).then((msg) => {
                        timeStart = new Date().getTime();
                        channel.bulkDelete(100).then(() => {
                            postPol(msg);
                        }).catch(err => {
                            log(err.stack, 'error');
                            planBthisfucker(msg);
                        });
                    }).catch((err) => bot.util.err(err, bot));
                } else
                if(res === 0) {
                    let update = new djs.MessageEmbed()
                    .setAuthor('Cancelled', bot.icons.find('ICO_load'))
                    .setColor(bot.cfg.embed.default)
                    .setDescription(`<#${bot.cfg.faq.channel}> has not been updated.`)

                    msg.edit({embed: update}).then(msg => { bot.util.responder(m.author.id, msg, bot); });
                } else {
                    let update = new djs.MessageEmbed()
                    .setAuthor('Timed out', bot.icons.find('ICO_load'))
                    .setColor(bot.cfg.embed.default)
                    .setDescription(`Sorry, you didn't respond in time. Please try again.`)

                    msg.edit({embed: update}).then(msg => { bot.util.responder(m.author.id, msg, bot); });
                }
            }).catch(err => {
                bot.util.err(err, bot, {m:m});
            })
        });

        function planBthisfucker(msg) {
            /**
             * discords api will flat out refuse to bulk
             * delete messages that are over 2 weeks old.
             * im sure the massive cunt nugget responsible
             * for that design is feeling real proud.
             * anyway, this alt method will just fetch all 
             * messages and delete them manually.
             * 
             * yknow, one by one.
             * 
             * with massive ratelimiting and everything.
             * 
             * :)
             */

            channel.messages.fetch({limit: 100}, true).then(ms => {
                let msgs = [...ms.values()];
                let i = 0;
                (function delmsg() {
                    msgs[i].delete().then(() => {
                        if(i+1 >= msgs.length) {
                            postPol(msg);
                        } else {
                            i++;
                            delmsg();
                        }
                    }).catch((err) => bot.util.err(err, bot, {m:m}));
                })();
            }).catch((err) => bot.util.err(err, bot, {m:m}));
        }

        let i = 0;
        function postPol(msg) {
            // NOW we can post the new FAQ
            channel.send({embed: faq[i].embed, files: faq[i].files}).then((pm) => {
                if(faq[i].type === 0) {
                    cat.push(`• [${faq[i].title}](${pm.url})<:space:704617016774098967>`) // blank emoji used for spacing
                }

                if(i+1 === faq.length) {
                    log(cat.join('\n').length)

                    let lastEmbed = new djs.MessageEmbed()
                    .setColor(bot.cfg.embed.default)
                    .setTitle(`Welcome to the FAQ!`)
                    .setDescription([
                        `We generally try to keep these answers as up-to-date as possible. On the off chance that an entry needs updating, please inform any moderator as soon as possible. Thank you!`,
                        ``,
                        `More answers can be found on OptiFine's website: https://optifine.net/faq.`,
                        ``,
                        `Reading through the official documentation might help with some issues: https://github.com/sp614x/optifine/tree/master/OptiFineDoc/doc`
                    ].join('\n'))
                    .addField(`Jump to Category`, cat.join('\n'))
                    .setFooter(`Last Modified Date: ${time.toUTCString()}`)
                    .setTimestamp(time);

                    channel.send({embed: lastEmbed}).then(() => {
                        embed = new djs.MessageEmbed()
                        .setColor(bot.cfg.embed.okay)
                        .setAuthor(`FAQ entries successfully updated in ${((new Date().getTime() - timeStart) / 1000).toFixed(2)} seconds.`, bot.icons.find('ICO_okay'))

                        msg.edit({embed: embed}).then((msg) => bot.util.responder(m.author.id, msg, bot)).catch((err) => bot.util.err(err, bot, {m:m}));
                    }).catch((err) => bot.util.err(err, bot, {m:m}));
                } else {
                    i++;
                    postPol(msg);
                }
            }).catch((err) => bot.util.err(err, bot, {m:m}));
        }
    }
})}
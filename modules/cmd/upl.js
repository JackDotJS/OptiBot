const path = require(`path`);
const fs = require(`fs`);
const util = require(`util`);
const djs = require(`discord.js`);
const timeago = require("timeago.js");
const Command = require(path.resolve(`./modules/core/command.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    short_desc: `Force update <#659313542540951552> channel.`,
    long_desc: `Forcefully updates the <#659313542540951552> channel.`,
    authlvl: 4,
    tags: ['NO_DM', 'LITE'],

    run: (m, args, data) => {
        let md = fs.statSync(path.resolve(`./modules/util/policies.js`))
        let policies = require(path.resolve(`./modules/util/policies.js`))(bot);
        let channel = bot.guilds.cache.get(bot.cfg.policies.guild).channels.cache.get(bot.cfg.policies.channel);
        let timeStart = new Date().getTime();

        // in my experience, these two dates would sometimes get fucked up for some reason so idk i think taking whatevers the latest makes the most sense
        let time = (md.mtime > md.birthtime) ? md.mtime : md.birthtime;

        let lastEmbed = new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .setTitle('Table of Contents')
        .setFooter(`Last Modified Date: ${time.toUTCString()}`)
        .setTimestamp(time);

        let itext = []
        let hcount = 0;

        // todo: add confirmation stuff

        //bot.util.confirm()

        let embed = new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .setAuthor('Reloading moderation policies...', bot.icons.find('ICO_load'))

        m.channel.send({embed: embed}).then((msg) => {
            channel.bulkDelete(100).then(() => {
                finallyPostShit(msg);
            }).catch(err => {
                log(err.stack, 'error');
                planBthisfucker(msg);
            });
        }).catch((err) => bot.util.err(err, bot));

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

            channel.messages.fetch().then(ms => {
                let msgs = [...ms.values()];
                let im = 0;
                (function delmsg() {
                    msgs[im].delete().then(() => {
                        if(im+1 >= msgs.length) {
                            finallyPostShit(msg);
                        } else {
                            im++;
                            delmsg();
                        }
                    }).catch((err) => bot.util.err(err, bot, {m:m}));
                })();
            }).catch((err) => bot.util.err(err, bot, {m:m}));
        }

        function finallyPostShit(msg) {
            // NOW we can post the new policies
            let i = 0;
            (function postPol() {
                bot.guilds.cache.get(bot.cfg.policies.guild).channels.cache.get(bot.cfg.policies.channel).send({embed: policies[i].embed, files: policies[i].files}).then((pm) => {
                    if(policies[i].type === 0) {
                        hcount++;
                        itext.push(`${hcount}. [${policies[i].title}](${pm.url})<:blank:677277454238351380>`)
                    } else
                    if(policies[i].title) {
                        itext.push(`　• ${policies[i].title}`)
                    }

                    if(i+1 === policies.length) {
                        log(itext.join('\n').length);
                        lastEmbed.setDescription(itext.join('\n'))

                        bot.guilds.cache.get(bot.cfg.policies.guild).channels.cache.get(bot.cfg.policies.channel).send({embed: lastEmbed}).then(() => {
                            embed = new djs.MessageEmbed()
                            .setColor(bot.cfg.embed.okay)
                            .setAuthor(`Policies successfully updated in ${((new Date().getTime() - timeStart) / 1000).toFixed(2)} seconds.`, bot.icons.find('ICO_okay'))

                            msg.edit({embed: embed}).then((msg) => bot.util.responder(m.author.id, msg, bot)).catch((err) => bot.util.err(err, bot, {m:m}));
                        }).catch((err) => bot.util.err(err, bot, {m:m}));
                    } else {
                        i++;
                        postPol();
                    }
                }).catch((err) => bot.util.err(err, bot, {m:m}));
            })();
        }
    }
})}
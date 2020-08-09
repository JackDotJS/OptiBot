const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const request = require('request');
const timeago = require("timeago.js");
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    short_desc: `Force update <#${bot.cfg.channels.rules}> channel.`,
    long_desc: `Forcefully updates the <#${bot.cfg.channels.rules}> channel with a given file.`,
    args: [
        `<attachment>`,
        `test <attachment>`
    ],
    authlvl: 4,
    flags: ['NO_DM', 'MOD_CHANNEL_ONLY', 'STRICT', 'DELETE_ON_MISUSE', 'LITE', 'STRICT_AUTH'],
    run: null
}

metadata.run = (m, args, data) => {
    if(m.attachments.size === 0 || (m.attachments.first().height !== null && m.attachments.first().height !== undefined) || !m.attachments.first().url.endsWith('.js')) {
        return OBUtil.err('You must upload a new set of rules as a valid file attachment.', {m:m});
    }

    let rules = [];
    let channel = bot.guilds.cache.get(bot.cfg.guilds.optibot).channels.cache.get(bot.cfg.channels.rules);
    let deleteOld = true;
    let time = 0;

    let firstURL = null;

    let embed = new djs.MessageEmbed()
    .setAuthor('Are you sure?', Assets.getEmoji('ICO_warn').url)
    .setColor(bot.cfg.embed.default)

    if(args[0] && args[0].toLowerCase() === 'test') {
        channel = m.channel;
        deleteOld = false;
        embed.setDescription(`(TEST) The given rules will be loaded in this channel. This action may take several minutes.`)
    } else {
        embed.setDescription(`The ${channel} channel will be completely reset and replaced with the given file. This action may take several minutes, and **cannot be undone.**`)
    }

    m.channel.send('_ _', {embed: embed}).then(msg => {
        OBUtil.confirm(m, msg).then(res => {
            if(res === 1) {
                request(m.attachments.first().url, (err, res, data) => {
                    if(err || !res || !data) {
                        OBUtil.err(err || new Error('Unable to download attachment.'), {m:m})
                    } else {
                        let update = new djs.MessageEmbed()
                        .setColor(bot.cfg.embed.default)
                        .setAuthor('Reloading server rules and guidelines...', Assets.getEmoji('ICO_load').url)

                        msg.edit({embed: update}).then((msg) => {
                            time = new Date();

                            rules = eval(data);

                            if(deleteOld) {
                                Memory.db.rules.remove({}, {}, (err) => {
                                    if(err) {
                                        OBUtil.err(err, {m:m});
                                    } else {
                                        channel.bulkDelete(100).then(() => {
                                            finallyPostShit(msg);
                                        }).catch(err => {
                                            OBUtil.err(err);
                                            planBthisfucker(msg);
                                        });
                                    }
                                });
                            } else {
                                finallyPostShit(msg);
                            }
                        }).catch((err) => OBUtil.err(err, {m:m}));
                    }
                });
            } else
            if(res === 0) {
                let update = new djs.MessageEmbed()
                .setAuthor('Cancelled', Assets.getEmoji('ICO_load').url)
                .setColor(bot.cfg.embed.default)
                .setDescription('Server rules have not been changed.')

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
                }).catch((err) => OBUtil.err(err, {m:m}));
            })();
        }).catch((err) => OBUtil.err(err, {m:m}));
    }

    function finallyPostShit(msg) {
        // NOW we can post the new rules
        let i = 0;
        (function postPol() {
            channel.send({embed: rules[i].embed, files: rules[i].files}).then((rm) => {
                function cont() {
                    if(i+1 === rules.length) {
                        postIndex();
                    } else {
                        i++;
                        postPol();
                    }
                }

                if(i === 0) {
                    firstURL = rm.url;
                }

                if(rules[i].kw && deleteOld) {
                    Memory.db.rules.insert({ id: rm.id, kw: rules[i].kw}, (err) => {
                        if(err) {
                            OBUtil.err(err, {m:m});
                        } else {
                            cont();
                        }
                    })
                } else {
                    cont();
                }
            }).catch((err) => OBUtil.err(err, {m:m}));
        })();

        function postIndex() {
            let lastEmbed = new djs.MessageEmbed()
                .setColor(bot.cfg.embed.default)
                .setDescription(`[Jump to start ☝️](${firstURL})`)
                .setFooter(`Last Modified Date: ${time.toUTCString()}`)
                .setTimestamp(time);

            channel.send({embed: lastEmbed}).then(() => {
                embed = new djs.MessageEmbed()
                .setColor(bot.cfg.embed.okay)
                .setAuthor(`Server rules successfully updated in ${((new Date().getTime() - time.getTime()) / 1000).toFixed(2)} seconds.`, Assets.getEmoji('ICO_okay').url)

                msg.edit({embed: embed}).then((msg) => OBUtil.afterSend(msg, m.author.id)).catch((err) => OBUtil.err(err, {m:m}));
            }).catch((err) => OBUtil.err(err, {m:m}));
        }
    }
}

module.exports = new Command(metadata);
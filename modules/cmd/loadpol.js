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
    short_desc: `Force update <#${bot.cfg.policies.channel}> channel.`,
    long_desc: `Forcefully updates the <#${bot.cfg.policies.channel}> channel with a given file.`,
    args: `<attachment>`,
    authlvl: 4,
    flags: ['NO_DM', 'MOD_CHANNEL_ONLY', 'STRICT', 'DELETE_ON_MISUSE', 'LITE', 'STRICT_AUTH'],
    run: null
}

metadata.run = (m, args, data) => {
    if(m.attachments.size === 0 || (m.attachments.first().height !== null && m.attachments.first().height !== undefined) || !m.attachments.first().url.endsWith('.js')) {
        return OBUtil.err('You must upload a new set of policies as a valid file attachment.', {m:m});
    }

    let policies = [];
    let channel = bot.guilds.cache.get(bot.cfg.policies.guild).channels.cache.get(bot.cfg.policies.channel);
    let time = 0;

    let itext = []
    let itext_trimmed = [];
    let hcount = 0;

    let embed = new djs.MessageEmbed()
    .setAuthor('Are you sure?', Assets.getEmoji('ICO_warn').url)
    .setColor(bot.cfg.embed.default)
    .setDescription(`The <#${bot.cfg.policies.channel}> channel will be completely reset and replaced with the given file. This action may take several minutes, and **cannot be undone.**`)

    m.channel.send('_ _', {embed: embed}).then(msg => {
        OBUtil.confirm(m, msg).then(res => {
            if(res === 1) {
                request(m.attachments.first().url, (err, res, data) => {
                    if(err || !res || !data) {
                        OBUtil.err(err || new Error('Unable to download attachment.'), {m:m})
                    } else {
                        let update = new djs.MessageEmbed()
                        .setColor(bot.cfg.embed.default)
                        .setAuthor('Reloading staff policies...', Assets.getEmoji('ICO_load').url)

                        msg.edit({embed: update}).then((msg) => {
                            time = new Date();

                            policies = eval(data);

                            Memory.db.pol.remove({}, {}, (err) => {
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
                        }).catch((err) => OBUtil.err(err, {m:m}));
                    }
                });
            } else
            if(res === 0) {
                let update = new djs.MessageEmbed()
                .setAuthor('Cancelled', Assets.getEmoji('ICO_load').url)
                .setColor(bot.cfg.embed.default)
                .setDescription('Staff policies has not been changed.')

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
        // NOW we can post the new policies
        let i = 0;
        (function postPol() {
            bot.guilds.cache.get(bot.cfg.policies.guild).channels.cache.get(bot.cfg.policies.channel).send({embed: policies[i].embed, files: policies[i].files}).then((pm) => {
                function cont() {
                    if(i+1 === policies.length) {
                        let temp = '';
                        for(let it = 0; it < itext.length; it++) {
                            temp += itext[it]+'\n';
                            
                            if(itext[it+1]) {
                                // check if next line is longer than the room we have left
                                if(itext[it+1].length > (2000-temp.length)) {
                                    itext_trimmed.push(temp);
                                    temp = '';
                                }
                            } else 
                            if (temp.length > 0) {
                                // no more lines left, push whatever we have now
                                itext_trimmed.push(temp);
                            }
    
                            if(it+1 === itext.length) {
                                postIndex();
                            }
                        }
                    } else {
                        i++;
                        postPol();
                    }
                }

                if(policies[i].type === 0) {
                    hcount++;
                    itext.push(`${hcount}. [${policies[i].title}](${pm.url})<:space:704617016774098967>`) // blank emoji used for spacing
                } else
                if(policies[i].title) {
                    // underscores with a zero width character in-between to prevent trimming
                    itext.push(`_​_　• [${policies[i].title}](${pm.url})<:space:704617016774098967>`) // blank emoji used for spacing
                }

                if(policies[i].kw) {
                    Memory.db.pol.insert({ id: pm.id, kw: policies[i].kw}, (err) => {
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

        let pi = 0;
        function postIndex() {
            let lastEmbed = new djs.MessageEmbed()
                .setColor(bot.cfg.embed.default)
                .setDescription(itext_trimmed[pi])
            
            if(pi === 0) {
                lastEmbed.setTitle(`Table of Contents`)
            }

            if(pi+1 === itext_trimmed.length) {
                lastEmbed.setFooter(`Last Modified Date: ${time.toUTCString()}`)
                .setTimestamp(time);
            } 

            bot.guilds.cache.get(bot.cfg.policies.guild).channels.cache.get(bot.cfg.policies.channel).send({embed: lastEmbed}).then(() => {
                if(pi+1 === itext_trimmed.length) {
                    embed = new djs.MessageEmbed()
                    .setColor(bot.cfg.embed.okay)
                    .setAuthor(`Policies successfully updated in ${((new Date().getTime() - time.getTime()) / 1000).toFixed(2)} seconds.`, Assets.getEmoji('ICO_okay').url)

                    msg.edit({embed: embed}).then((msg) => OBUtil.afterSend(msg, m.author.id)).catch((err) => OBUtil.err(err, {m:m}));
                } else {
                    pi++;
                    postIndex();
                }
            }).catch((err) => OBUtil.err(err, {m:m}));
        }
    }
}

module.exports = new Command(metadata);
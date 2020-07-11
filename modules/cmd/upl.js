const path = require(`path`);
const fs = require(`fs`);
const util = require(`util`);
const djs = require(`discord.js`);
const timeago = require("timeago.js");
const { Command, OBUtil, Memory } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    short_desc: `Force update <#${bot.cfg.policies.channel}> channel.`,
    long_desc: `Forcefully updates the <#${bot.cfg.policies.channel}> channel.`,
    authlvl: 4,
    flags: ['NO_DM', 'LITE'],
    run: null
}

metadata.run = (m, args, data) => {
    let md = fs.statSync(path.resolve(`./modules/util/policies.js`))
    let policies = require(path.resolve(`./modules/util/policies.js`))(bot);
    let channel = bot.guilds.cache.get(bot.cfg.policies.guild).channels.cache.get(bot.cfg.policies.channel);
    let timeStart = new Date().getTime();

    // in my experience, these two dates would sometimes get fucked up for some reason so idk i think taking whatevers the latest makes the most sense
    let time = (md.mtime > md.birthtime) ? md.mtime : md.birthtime;

    let itext = []
    let itext_trimmed = [];
    let hcount = 0;

    // todo: add confirmation stuff

    //OBUtil.confirm()

    let embed = new djs.MessageEmbed()
    .setColor(bot.cfg.embed.default)
    .setAuthor('Reloading moderation policies...', OBUtil.getEmoji('ICO_load').url)

    m.channel.send({embed: embed}).then((msg) => {
        channel.bulkDelete(100).then(() => {
            finallyPostShit(msg);
        }).catch(err => {
            OBUtil.err(err);
            planBthisfucker(msg);
        });
    }).catch((err) => OBUtil.err(err));

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
                if(policies[i].type === 0) {
                    hcount++;
                    itext.push(`${hcount}. [${policies[i].title}](${pm.url})<:space:704617016774098967>`) // blank emoji used for spacing
                } else
                if(policies[i].title) {
                    // underscores with a zero width character in-between to prevent trimming
                    itext.push(`_​_　• [${policies[i].title}](${pm.url})<:space:704617016774098967>`) // blank emoji used for spacing
                }

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
                    .setAuthor(`Policies successfully updated in ${((new Date().getTime() - timeStart) / 1000).toFixed(2)} seconds.`, OBUtil.getEmoji('ICO_okay').url)

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
const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const iso = require('iso-639-1')
const request = require('request');
const Command = require(path.resolve(`./modules/core/command.js`));
const errMsg = require(path.resolve(`./modules/util/simpleError.js`));
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    short_desc: `Translate any message into English.`,
    usage: `<text|message URL|^ shortcut>`,
    authlevel: 1,
    tags: ['DM_OPTIONAL'],

    run: (m, args, data) => {
        if (!args[0]) {
            let embed = new djs.RichEmbed()
            .setAuthor(`Usage:`, bot.icons.find('ICO_info'))
            .setDescription(`\`\`\`${data.cmd.metadata.usage}\`\`\``)
            .setColor(bot.cfg.embed.default);

            m.channel.send({embed: embed})
            .then(bm => msgFinalizer(m.author.id, bm, bot, log))
            .catch(err => {
                m.channel.send({embed: errMsg(err, bot, log)})
                .catch(e => { log(e.stack, 'error') });
            });
        } else {
            let translate = function(message, source) {
                request(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(message)}`, (err, res, data) => {
                    if (err || !res || !data || res.statusCode !== 200) {
                        m.channel.send({embed: errMsg(err || new Error('Failed to get a response from the Google Translate API.'), bot, log)})
                        .catch(e => { log(e.stack, 'error') });
                    } else {
                        let d = JSON.parse(data);
                        log(util.inspect(d));

                        let embed = new djs.RichEmbed()
                        .setAuthor(`Translated Message`, bot.icons.find('ICO_globe'))
                        .setDescription(d[0][0][0])
                        .setColor(bot.cfg.embed.default)
                        .addField('Detected Language', iso.getName(d[2]))
                        .addField('Message Source', `[Direct URL](${source})`)

                        m.channel.send({embed: embed})
                        .then(bm => msgFinalizer(m.author.id, bm, bot, log))
                        .catch(err => {
                            m.channel.send({embed: errMsg(err, bot, log)})
                            .catch(e => { log(e.stack, 'error') });
                        });

                        m.channel.send();
                    }
                });
            }

            if(args[0] === '^') {
                m.channel.fetchMessages({ limit: 5 }).then(msgs => {
                    let itr = msgs.values();
        
                    (function search() {
                        let thisID = itr.next();

                        if (thisID.done) {
                            let embed = new djs.RichEmbed()
                            .setColor(bot.cfg.embed.error)
                            .setAuthor(`Could not find a user.`, bot.icons.find('ICO_error'))
                            .setFooter('Note that this shortcut will skip yourself, and any Discord bot.');
        
                            m.channel.send({ embed: embed })
                            .then(bm => msgFinalizer(m.author.id, bm, bot, log))
                            .catch(err => {
                                m.channel.send({embed: errMsg(err, bot, log)})
                                .catch(e => { log(err.stack, 'error') });
                            });
                        } else
                        if ([m.author.id, bot.user.id].indexOf(thisID.value.author.id) === -1 && !thisID.value.author.bot) {
                            translate(thisID.value.cleanContent, thisID.value.url);
                        } else search();
                    })();
                }).catch(err => {
                    m.channel.send({embed: errMsg(err, bot, log)})
                    .catch(e => { log(e.stack, 'error') });
                });
            } else
            if(args[0].indexOf('discordapp.com') > -1) {
                let urls = m.content.match(/\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/gi);
    
                if(urls !== null) {
                    for(let link of urls) {
                        let seg = link.split(/(?<!\/)\/(?!\/)|(?<!\\)\\(?!\\)/g).reverse();
    
                        if(!isNaN(parseInt(seg[0])) && !isNaN(parseInt(seg[1])) && !isNaN(parseInt(seg[2]))) {
                            foundQuote(seg);
                            break;
                        }
                    }
    
                    function foundQuote(seg) {
                        let rg = seg[2];
                        let rc = seg[1];
                        let rm = seg[0];
    
                        bot.guilds.get(rg).channels.get(rc).fetchMessage(rm).then(msg => {
                            translate(msg.cleanContent, msg.url);
                        }).catch(err => {
                            log(err.stack, 'error');
                        });
                    }
                }
            } else {
                translate(m.cleanContent.substring(`${bot.prefix}${data.cmd.metadata.name} `.length), m.url);
            }
        }
    }
})}
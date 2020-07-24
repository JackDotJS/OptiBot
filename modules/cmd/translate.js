const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const iso = require('iso-639-1')
const request = require('request');
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    short_desc: `Translate any message into English.`,
    args: `<text | discord message>`,
    authlvl: 1,
    flags: ['DM_OPTIONAL'],
    run: null
}

metadata.run = (m, args, data) => {
    if (!args[0]) {
        OBUtil.missingArgs(m, metadata);
    } else {
        let translate = function(message, source) {
            request(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(message)}`, (err, res, data) => {
                if (err || !res || !data || res.statusCode !== 200) {
                    OBUtil.err(err || new Error('Failed to get a response from the Google Translate API.'), {m:m})
                } else {
                    let d = JSON.parse(data);
                    log(util.inspect(d));

                    let embed = new djs.MessageEmbed()
                    .setAuthor(`Translated Message`, Assets.getEmoji('ICO_globe').url)
                    .setDescription(d[0][0][0])
                    .setColor(bot.cfg.embed.default)
                    .addField('Detected Language', iso.getName(d[2]))
                    .addField('Message Source', `[Direct URL](${source})`)

                    m.channel.send({embed: embed}).then(bm => OBUtil.afterSend(bm, m.author.id));
                }
            });
        }

        OBUtil.parseTarget(m, 1, args[0], data.member).then(result => {
            if(result && result.type === 'message') {
                translate(result.target.cleanContent, result.target.url);
            } else 
            if(result && result.type === 'notfound') {
                OBUtil.err('Could not find a message to translate.', {m:m});
            } else {
                translate(m.cleanContent.substring(`${bot.prefix}${metadata.name} `.length), m.url);
            }
        }).catch(err => {
            OBUtil.err(err, {m:m});
        });
    }
}

module.exports = new Command(metadata);
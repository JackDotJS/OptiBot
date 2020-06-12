const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const iso = require('iso-639-1')
const request = require('request');
const Command = require(path.resolve(`./modules/core/command.js`));

const setup = (bot) => { 
    return new Command(bot, {
        name: path.parse(__filename).name,
        short_desc: `Translate any message into English.`,
        args: `<text | discord message>`,
        authlvl: 1,
        flags: ['DM_OPTIONAL'],
        run: func
    });
}

const func = (m, args, data) => {
    const bot = data.bot;
    const log = data.log;

    if (!args[0]) {
        data.cmd.noArgs(m);
    } else {
        let translate = function(message, source) {
            request(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(message)}`, (err, res, data) => {
                if (err || !res || !data || res.statusCode !== 200) {
                    bot.util.err(err || new Error('Failed to get a response from the Google Translate API.'), bot, {m:m})
                } else {
                    let d = JSON.parse(data);
                    log(util.inspect(d));

                    let embed = new djs.MessageEmbed()
                    .setAuthor(`Translated Message`, bot.icons.find('ICO_globe'))
                    .setDescription(d[0][0][0])
                    .setColor(bot.cfg.embed.default)
                    .addField('Detected Language', iso.getName(d[2]))
                    .addField('Message Source', `[Direct URL](${source})`)

                    m.channel.send({embed: embed}).then(bm => bot.util.responder(m.author.id, bm, bot));
                }
            });
        }

        bot.util.target(m, args[0], bot, {type: 1, member: data.member}).then(result => {
            if(result && result.type === 'message') {
                translate(result.target.cleanContent, result.target.url);
            } else 
            if(result && result.type === 'notfound') {
                bot.util.err('Could not find a message to translate.', bot, {m:m});
            } else {
                translate(m.cleanContent.substring(`${bot.prefix}${data.input.cmd} `.length), m.url);
            }
        }).catch(err => {
            bot.util.err(err, bot, {m:m});
        });
    }
}

module.exports = setup;
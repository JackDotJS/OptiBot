const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const cid = require('caller-id');

/**
 * Creates a simple, pre-formatted error message.
 * 
 * @param {(Error|String)} err The error message or object.
 * @param bot OptiBot
 */

module.exports = (err, bot, data = {}) => {
    const log = bot.log;
    let call = cid.getData();
    let file;
    let line;
    if(!data.file) file = (call.evalFlag) ? 'eval()' : call.filePath.substring(call.filePath.lastIndexOf('\\')+1)
    if(!data.line) line = call.lineNumber;

    let embed = new djs.MessageEmbed()
    .setColor(bot.cfg.embed.error)

    if(err instanceof Error) {
        log(err.stack, 'error', file, line);

        let loc = `${file}:${line}`;

        if(!call.evalFlag) {
            let match = err.stack.match(new RegExp(`${file.replace('.', '\\.')}:\\d+:\\d+`));

            log(match);

            if(match) {
                loc = `${match[0]}`;
            }
        }

        embed.setAuthor('Something went wrong.', bot.icons.find('ICO_error'))
        .setTitle(bot.cfg.messages.error[~~(Math.random() * bot.cfg.messages.error.length)])
        .setDescription(`\`\`\`diff\n-[${loc}] ${err}\`\`\``);
    } else {
        embed.setAuthor(err, bot.icons.find('ICO_error'))
    }

    // log(util.inspect(data));

    if(data.m) {
        data.m.channel.send({embed: embed}).then(bm => {
            bot.util.responder(data.m.author.id, bm, bot)
        }).catch(e => log(e.stack, 'error'));
    } else {
        return embed;
    }
}
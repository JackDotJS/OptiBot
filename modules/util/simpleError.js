const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const cid = require('caller-id');
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));

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

        embed.setAuthor('Something went wrong while doing that. Oops.', bot.icons.find('ICO_error'))
        .setDescription(`\`\`\`diff\n-[${file}:${line}] ${err}\`\`\` \nIf this continues, please contact <@181214529340833792> or <@251778569397600256>`);
    } else {
        embed.setAuthor(err, bot.icons.find('ICO_error'))
    }

    log(util.inspect(data));

    if(data.m) {
        data.m.channel.send({embed: embed}).then(bm => {
            msgFinalizer(data.m.author.id, bm, bot)
        }).catch(e => log(e.stack, 'error'));
    } else {
        return embed;
    }
}
const djs = require(`discord.js`);
const cid = require('caller-id');

/**
 * Creates a simple, pre-formatted error message.
 * 
 * @param {(Error|String)} err The error message or object.
 * @param bot OptiBot
 */

module.exports = (err, bot, log, file, line) => {
    let call = cid.getData();
    if(!file) file = (call.evalFlag) ? 'eval()' : call.filePath.substring(call.filePath.lastIndexOf('\\')+1)
    if(!line) line = call.lineNumber;

    let embed = new djs.RichEmbed()
    .setColor(bot.cfg.embed.error)

    if(err instanceof Error) {
        log(err.stack, 'error', file, line);

        embed.setAuthor('Something went wrong while doing that. Oops.', bot.icons.find('ICO_error'))
        .setDescription(`\`\`\`diff\n-[${file}:${line}] ${err}\`\`\` \nIf this continues, please contact <@181214529340833792> or <@251778569397600256>`);
        return embed;
    } else {
        embed.setAuthor(err, bot.icons.find('ICO_error'))
        return embed;
    }
}
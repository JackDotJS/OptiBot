const Memory = require('../OptiBotMemory.js');
const djs = require('discord.js');
const Assets = require('../OptiBotAssetsManager.js');
const OptiBotUtilities = require('../OptiBotUtil');

const bot = Memory.core.client;
const log = bot.log;

const embed = new djs.MessageEmbed()
  .setColor(bot.cfg.embed.error);

/**
     * Creates a simple, pre-formatted error message.
     *
     * @param {(Error|String)} err The error message or object.
     * @param {OptiBot} [bot] OptiBot
     */
module.exports = (err, data = {}) => {
  if (err instanceof Error) {
    log(err.stack, 'error');

    const lines = err.stack.split('\n');

    let formatted = [
      err.toString()
    ];

    if (bot.mode < 2) {
      for (const line of lines) {
        if (line.includes('node_modules')) break;

        let file = line.match(new RegExp(`${Memory.core.root.drive}\\[^,]+\\d+:\\d+`));
        if (!file) continue;
        file = file[0];

        let trace = line.match(/(?<=at\s)[^\r\n\t\f\v(< ]+/);
        if (trace) trace = trace[0];

        let evalTrace = line.match(/(?<=<anonymous>):\d+:\d+/);
        if (evalTrace) evalTrace = evalTrace[0];

        let str = '';

        const fileshort = file.replace(Memory.core.root.dir, '~');

        if (trace && trace !== file) {
          if (trace === 'eval') {
            str += trace + evalTrace;
            formatted.push(str);
            formatted.push(fileshort);
          } else if (evalTrace) {
            str += `${trace} (at eval${evalTrace}, ${fileshort})`;
            formatted.push(str);
          } else {
            str += `${trace} (${fileshort})`;
            formatted.push(str);
          }
        } else {
          str += fileshort;
          formatted.push(str);
        }
      }

      formatted = [...new Set(formatted)];
    }

    embed.setAuthor('Something went wrong.', Assets.getEmoji('ICO_error').url)
      .setTitle(bot.cfg.messages.error[~~(Math.random() * bot.cfg.messages.error.length)])
      .setDescription(`\`\`\`diff\n- ${formatted.join('\n-   at ')}\`\`\``);
  } else {
    embed.setAuthor(err, Assets.getEmoji('ICO_error').url);
  }

  // log(util.inspect(data));

  if (data.m) {
    data.m.channel.send({ embed: embed }).then(bm => {
      OptiBotUtilities.afterSend(bm, data.m.author.id);
    }).catch(e => log(e.stack, 'error'));
  } else {
    return embed;
  }
};
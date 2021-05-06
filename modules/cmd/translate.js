const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const iso = require(`iso-639-1`);
const request = require(`request`);
const { Command, memory, Assets } = require(`../core/modules.js`);

const bot = memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  description: {
    short: `Translate a message into English.`
  },
  args: [
    `<text>`,
    `<discord message>`
  ],
  dm: true,
  flags: [ `PERMS_REQUIRED`, `LITE` ],
  run: null
};

metadata.run = (m, args, data) => {
  if (!args[0]) return bot.util.missingArgs(m, metadata);

  const translate = function (message, source) {
    request(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(message)}`, (err, res, data) => {
      if (err || !res || !data || res.statusCode !== 200) {
        bot.util.err(err || new Error(`Failed to get a response from the Google Translate API.`), { m });
      } else {
        const d = JSON.parse(data);
        log(util.inspect(d));

        const embed = new djs.MessageEmbed()
          .setAuthor(`Translated Message`, Assets.getEmoji(`ICO_globe`).url)
          .setDescription(d[0][0][0])
          .setColor(bot.cfg.colors.default)
          .addField(`Detected Language`, iso.getName(d[2]))
          .addField(`Message Source`, `[Direct URL](${source})`);

        bot.send(m, { embed });
      }
    });
  };

  bot.util.parseTarget(m, 1, args[0], data.member).then(result => {
    if (result && result.type === `message`) {
      translate(result.target.cleanContent, result.target.url);
    } else if (result && result.type === `notfound`) {
      bot.util.err(`Could not find a message to translate.`, { m });
    } else {
      translate(m.cleanContent.substring(`${bot.prefix}${metadata.name} `.length), m.url);
    }
  }).catch(err => {
    bot.util.err(err, { m });
  });
};

module.exports = new Command(metadata);
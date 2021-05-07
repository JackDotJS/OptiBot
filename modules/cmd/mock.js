const path = require(`path`);
const { Command, memory } = require(`../core/modules.js`);

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  description: {
    short: `MoCkInG tOnE translator.`,
    long: `Rewrites a message with a mOcKiNg tOnE. In other words, this will pseudo-randomize the capitalization of each letter in the given text.`
  },
  args: `<text | discord message>`,
  dm: true,
  dperm: `SEND_MESSAGES`,
  run: null
};


metadata.run = (m, args, data) => {
  if (!args[0]) return bot.util.missingArgs(m, metadata);

  const translate = function (message) {
    if ((Math.random() * 100) < 1) {
      // 1% chance of UwU
      bot.send(m, bot.util.owo(message));
    } else {
      let newStr = ``;

      for (let i = 0; i < message.length; i++) {
        let thisChar = message.charAt(i);

        let fss = i;

        fss ^= fss >>> 16;
        fss ^= fss >>> 8;
        fss ^= fss >>> 4;
        fss ^= fss >>> 2;
        fss ^= fss >>> 1;
        fss = fss & 1;


        if (fss) {
          thisChar = thisChar.toUpperCase();
        } else {
          thisChar = thisChar.toLowerCase();
        }

        newStr += thisChar;

        if (i + 1 === message.length) {
          bot.send(m, newStr);
        }
      }
    }
  };

  bot.util.parseTarget(m, 1, args[0], data.member).then(result => {
    if (result && result.type === `message`) {
      translate(result.target.cleanContent);
    } else {
      translate(m.cleanContent.substring(`${bot.prefix}${metadata.name} `.length));
    }
  }).catch(err => {
    bot.util.err(err, { m });
  });
};

module.exports = new Command(metadata);
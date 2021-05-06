const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const { Command, memory } = require(`../core/modules.js`);

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  aliases: [`targetuser`, `targettest`],
  description: {
    short: `Test OptiBot's targeting utility.`,
    long: `Gives the raw output of OptiBot's targeting utility.`
  },
  args: [
    `0 [discord member]`,
    `1 [discord message]`
  ],
  dm: true,
  flags: [ `PERMS_REQUIRED` ],
  run: null
};

metadata.run = (m, args, data) => {
  if (!Number.isInteger(parseInt(args[0]))) {
    return bot.util.missingArgs(m, metadata);
  }

  bot.util.parseTarget(m, parseInt(args[0]), args[1], data.member).then((result) => {
    const text = util.inspect(result);

    if (text.length > 1950) {
      return bot.send(m, { files: [ new djs.MessageAttachment(Buffer.from(util.inspect(result)), `target.txt`) ] });
    }

    bot.send(m, `\`\`\`javascript\n${util.inspect(result)}\`\`\``);

  }).catch(err => bot.util.err(err, { m }));
};

module.exports = new Command(metadata);
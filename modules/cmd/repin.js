const path = require(`path`);
const djs = require(`discord.js`);
const { Command, memory, Assets } = require(`../core/optibot.js`);

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  short_desc: `Move a pinned message to the top.`,
  long_desc: `Moves a given pinned message to the top by unpinning and immediately pinning it again. Only works if the given message has already been pinned.`,
  args: `<discord message>`,
  authlvl: 2,
  flags: [`DM_OPTIONAL`, `LITE`],
  run: null
};

metadata.run = (m, args, data) => {
  if (!args[0]) return bot.util.missingArgs(m, metadata);

  bot.util.parseTarget(m, 1, args[0], data.member).then(result => {
    if (result && result.type === `message`) {
      if (!result.target.pinned) {
        bot.util.err(`That message is not pinned.`, { m });
      } else {
        result.target.unpin().then(() => {
          result.target.pin().then(() => {
            const embed = new djs.MessageEmbed()
              .setAuthor(`Pinned message successfully moved.`, Assets.getEmoji(`ICO_okay`).url)
              .setColor(bot.cfg.embed.okay);

            bot.send(m, { embed });
          }).catch(err => {
            bot.util.err(err, { m });
          });
        }).catch(err => {
          bot.util.err(err, { m });
        });
      }
    } else {
      bot.util.err(`You must specify a valid message.`, { m });
    }
  }).catch(err => {
    bot.util.err(err, { m });
  });
};

module.exports = new Command(metadata);
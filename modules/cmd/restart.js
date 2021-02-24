const path = require(`path`);
const djs = require(`discord.js`);
const { Command, memory, LogEntry, Assets } = require(`../core/optibot.js`);

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  short_desc: `Restart OptiBot.`,
  authlvl: 3,
  flags: [`NO_DM`, `NO_TYPER`, `LITE`],
  run: null
};

metadata.run = m => {
  new LogEntry()
    .setColor(bot.cfg.embed.default)
    .setIcon(Assets.getEmoji(`ICO_door`).url)
    .setTitle(`OptiBot is now restarting...`, `OptiBot Restart Report`)
    .addSection(`Command Issuer`, m.author)
    .submit().then(async () => {
      const embed = new djs.MessageEmbed()
        .setAuthor(`Restarting...`, await Assets.getIcon(`ICO_loading`, bot.cfg.embed.default))
        .setColor(bot.cfg.embed.default);

      m.channel.send(embed).then((msg) => {
        if(msg.channel.type === `dm`) {
          return bot.exit(16);
        }

        process.send({ 
          t: `OB_RESTART`,
          c: {
            guild: msg.guild.id,
            channel: msg.channel.id,
            message: msg.id,
            author: m.author.id
          }
        }, (err) => {
          if(err) bot.util.err(err.stack, {m});
          bot.exit(16);
        });
      }).catch(err => {
        bot.util.err(err.stack, {m});
        bot.exit(16);
      });
    });
};

module.exports = new Command(metadata);
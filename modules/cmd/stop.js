const path = require(`path`);
const djs = require(`discord.js`);
const { Command, memory, LogEntry, Assets } = require(`../core/optibot.js`);

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  short_desc: `Shut down OptiBot.`,
  aliases: [ `exit` ],
  authlvl: 4,
  flags: [`NO_DM`, `NO_TYPER`, `LITE`],
  run: null
};

metadata.run = async m => {
  new LogEntry()
    .setColor(bot.cfg.embed.default)
    .setIcon(await Assets.getIcon(`ICO_door`, bot.cfg.embed.default))
    .setTitle(`OptiBot is now shutting down...`, `OptiBot Exit Report`)
    .addSection(`Command Issuer`, m.author)
    .submit().then(async () => {
      const embed = new djs.MessageEmbed()
        .setAuthor(`Shutting down. Goodbye!`, await Assets.getEmoji(`ICO_door`, bot.cfg.embed.default))
        .setColor(bot.cfg.embed.default);

      m.channel.send(embed).then(() => {
        bot.exit();
      });
    });
};

module.exports = new Command(metadata);
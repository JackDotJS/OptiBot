const path = require(`path`);
const djs = require(`discord.js`);
const { Command, memory, LogEntry, Assets } = require(`../core/optibot.js`);

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  aliases: [ `exit` ],
  description: {
    short: `Shut down OptiBot.`,
  },
  dm: false,
  flags: [ `PERMS_REQUIRED`, `LITE` ],
  run: null
};

metadata.run = async m => {
  new LogEntry()
    .setColor(bot.cfg.colors.default)
    .setIcon(await Assets.getIcon(`ICO_door`, bot.cfg.colors.default))
    .setTitle(`OptiBot is now shutting down...`, `OptiBot Exit Report`)
    .addSection(`Command Issuer`, m.author)
    .submit().then(async () => {
      const embed = new djs.MessageEmbed()
        .setAuthor(`Shutting down. Goodbye!`, await Assets.getIcon(`ICO_door`, bot.cfg.colors.default))
        .setColor(bot.cfg.colors.default);

      m.channel.send(embed).then(() => {
        bot.exit();
      });
    });
};

module.exports = new Command(metadata);
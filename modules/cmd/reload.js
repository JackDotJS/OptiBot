const path = require(`path`);
const djs = require(`discord.js`);
const { Command, memory, LogEntry, Assets } = require(`../core/optibot.js`);

const bot = memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  aliases: [`reset`],
  short_desc: `Reload OptiBot assets.`,
  long_desc: `Reloads OptiBot assets, such as commands, OptiBits, core classes, and images.`,
  authlvl: 5,
  flags: [`DM_OPTIONAL`, `NO_TYPER`, `LITE`],
  run: null
};

metadata.run = m => {
  log(`${m.author.tag} (${m.author.id}) requested asset update.`, `info`);

  new LogEntry()
    .setColor(bot.cfg.embed.default)
    .setIcon(Assets.getEmoji(`ICO_info`).url)
    .setTitle(`OptiBot Assets Reloaded`, `OptiBot Assets Reload Report`)
    .addSection(`Moderator Responsible`, m.author)
    .addSection(`Command Location`, m)
    .submit().then(async () => {
      const embed = new djs.MessageEmbed()
        .attachFiles([
          new djs.MessageAttachment(await Assets.getIcon(`ICO_loading`, bot.cfg.embed.default), `icon.gif`)
        ])
        .setAuthor(`Reloading assets...`, `attachment://icon.gif`)
        .setColor(bot.cfg.embed.default);

      bot.send(m, { embed, delayControl: true }).then(bres => {
        const msg = bres.msg;

        const embed2 = new djs.MessageEmbed()
          .setColor(bot.cfg.embed.okay);

        Assets.load(1).then((time) => {
          embed2.setAuthor(`Assets successfully reset in ${time / 1000} seconds.`, Assets.getEmoji(`ICO_okay`).url);
          log(`Assets successfully reset in ${time / 1000} seconds.`, `info`);

          bot.setTimeout(() => {
            msg.edit({ embed: embed2 }).then(() => bres.addControl);
          }, 250);
        }).catch(err => {
          bot.util.err(err, { m });
        });
      });
    });
};

module.exports = new Command(metadata);
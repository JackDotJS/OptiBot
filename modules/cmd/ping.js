const path = require(`path`);
const djs = require(`discord.js`);
const { Command, memory, Assets } = require(`../core/optibot.js`);

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  aliases: [`latency`, `pong`],
  short_desc: `Measure bot latency and response lag.`,
  authlvl: 1,
  flags: [`DM_OPTIONAL`, `NO_TYPER`],
  run: null
};

metadata.run = (m, args, data) => {
  const embed = new djs.MessageEmbed()
    .setAuthor((data.input.cmd === `pong`) ? `Pong...` : `Ping...`, Assets.getEmoji(`ICO_wifi`).url)
    .setColor(bot.cfg.embed.default)
    .setDescription(`API Latency: ... \nMessage Latency: ...`);

  const timeStart = new Date().getTime();
  bot.send(m, { embed, delayControl: true }).then(bres => {
    const msg = bres.msg;
    
    const timeTaken = new Date().getTime() - timeStart;
    bot.setTimeout(() => {
      const desc = [];
      const api = Math.round(bot.ws.ping);
      const message = timeTaken;

      if (api < 100) {
        desc.push(`API Latency: ${api.toLocaleString()}ms (Great)`);
      } else if (api < 200) {
        desc.push(`API Latency: ${api.toLocaleString()}ms (Good)`);
      } else if (api < 700) {
        desc.push(`API Latency: ${api.toLocaleString()}ms (Okay)`);
      } else if (api < 2000) {
        desc.push(`API Latency: ${api.toLocaleString()}ms (Bad)`);
      } else if (api >= 2000) {
        desc.push(`API Latency: ${api.toLocaleString()}ms (Awful)`);
      }

      if (message < 100) {
        desc.push(`Message Latency: ${message.toLocaleString()}ms (Great)`);
      } else if (message < 200) {
        desc.push(`Message Latency: ${message.toLocaleString()}ms (Good)`);
      } else if (message < 700) {
        desc.push(`Message Latency: ${message.toLocaleString()}ms (Okay)`);
      } else if (message < 2000) {
        desc.push(`Message Latency: ${message.toLocaleString()}ms (Bad)`);
      } else if (message >= 2000) {
        desc.push(`Message Latency: ${message.toLocaleString()}ms (Awful)`);
      }

      embed.author.name = (data.input.cmd === `pong`) ? `Ping!` : `Pong!`;
      embed.description = desc.join(`\n`);
      msg.edit(embed).then(() => bres.addControl).catch(err => {
        bot.util.err(err, { m });
      });
    }, 1000);
  });
};

module.exports = new Command(metadata);
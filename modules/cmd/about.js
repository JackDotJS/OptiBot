const path = require(`path`);
const djs = require(`discord.js`);
const { Command, memory, Assets } = require(`../core/modules.js`);

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  description: {
    short: `A quick introduction to OptiBot.`,
    long: `Provides a quick introduction to OptiBot.`
  },
  dm: true,
  flags: [ `BOT_CHANNEL_ONLY`, `LITE` ],
  run: null
};

metadata.run = async (m, args, data) => {
  const desc = data.cfg.splash[~~(Math.random() * data.cfg.splash.length)];

  const embed = new djs.MessageEmbed()
    .setColor(data.cfg.colors.default)
    .setAuthor(`About`, await Assets.getIcon(`ICO_info`, data.cfg.colors.default))
    .setThumbnail(bot.user.displayAvatarURL({ format: `png`, size: 64 }))
    .setTitle(`The official OptiFine Discord server bot. \n\n`)
    .setDescription(desc.join(`\n`))
    .addField(`View Commands`, `\`\`\`${data.cfg.prefixes[0]}help\`\`\``, true)
    .addField(`View Details`, `\`\`\`${data.cfg.prefixes[0]}help <command>\`\`\``, true)
    .setFooter([
      `Version: ${bot.version}`,
      `Session Uptime: ${uptime(process.uptime() * 1000)}`
    ].join(`\n`));

  bot.send(m, { embed });
};

function uptime(ut) {
  const seconds = (ut / 1000).toFixed(1);
  const minutes = (ut / (1000 * 60)).toFixed(1);
  const hours = (ut / (1000 * 60 * 60)).toFixed(1);
  const days = (ut / (1000 * 60 * 60 * 24)).toFixed(1);

  if (seconds < 60) {
    return seconds + ` Seconds`;
  } else if (minutes < 60) {
    return minutes + ` Minutes`;
  } else if (hours < 24) {
    return hours + ` Hours`;
  } else {
    return days + ` Days`;
  }
}

module.exports = new Command(metadata);
const path = require(`path`);
const djs = require(`discord.js`);
const { Command, memory, Assets } = require(`../core/modules.js`);

const bot = memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  description: {
    short: `A quick introduction to Vector.`,
    long: `Provides a quick introduction to Vector.`
  },
  dm: true,
  flags: [ `LITE` ],
  dperm: `SEND_MESSAGES`,
  run: null
};

metadata.run = async (m, args, data) => {
  const embed = new djs.MessageEmbed()
    .setColor(data.gcfg.colors.default)
    .setAuthor(`About`, await Assets.getIcon(`ICO_info`, data.gcfg.colors.default))
    .setThumbnail(bot.user.displayAvatarURL({ format: `png`, size: 64 }))
    .setTitle(`Vector: The Server Management Bot`)
    .setURL(`https://github.com/JackDotJS/vector-bot`)
    .setDescription(data.gcfg.splash[~~(Math.random() * data.gcfg.splash.length)])
    .addField(`List Commands`, `\`\`\`${data.gcfg.commands.prefixes[0]}help\`\`\``, true)
    .addField(`Command Information`, `\`\`\`${data.gcfg.commands.prefixes[0]}help <command>\`\`\``, true)
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
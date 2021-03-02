const path = require(`path`);
const djs = require(`discord.js`);
const { Command, memory, Assets } = require(`../core/optibot.js`);

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

metadata.run = async (m) => {
  const devsSorted = bot.mainGuild.roles.cache.get(bot.cfg.roles.botdev).members
    .sort((a, b) => a.joinedTimestamp - b.joinedTimestamp)
    .map(member => member.toString());

  const developers = devsSorted.reduce((str, one, i, arr) => {
    if(i+1 === arr.length) {
      str += `, and ${one}`;
    } else {
      str += `, ${one}`;
    }

    return str;
  });

  const desc = [
    `Developed and maintained by ${developers} out of love for a great community.`,
  ];

  const embed = new djs.MessageEmbed()
    .setColor(bot.cfg.embed.default)
    .setAuthor(`About`, await Assets.getIcon(`ICO_info`, bot.cfg.embed.default))
    .setThumbnail(bot.user.displayAvatarURL({ format: `png`, size: 64 }))
    .setTitle(`The official OptiFine Discord server bot. \n\n`)
    .setDescription(desc.join(`\n`))
    .addField(`View Commands`, `\`\`\`${bot.prefix}help\`\`\``, true)
    .addField(`View Details`, `\`\`\`${bot.prefix}help <command>\`\`\``, true)
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
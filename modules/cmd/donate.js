const path = require(`path`);
const djs = require(`discord.js`);
const { Command, memory, Assets } = require(`../core/modules.js`);

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  description: {
    short: `Show OptiFine donation information.`,
    long: `Shows information about OptiFine donations.`
  },
  guilds: [ bot.cfg.guilds.optifine ],
  dm: false,
  flags: [ `LITE` ],
  run: null
};

metadata.run = m => {
  const now = new Date();
  const birthdate = new Date(`April 8, 2011 12:00:00`);
  let years = now.getUTCFullYear() - birthdate.getUTCFullYear();

  const month_now = now.getUTCMonth();
  const month_birth = birthdate.getUTCMonth();

  if (month_birth > month_now || (month_birth === month_now && birthdate.getUTCDate() > now.getUTCDate())) {
    years--;
  }

  const embed = new djs.MessageEmbed()
    .setColor(bot.cfg.colors.default)
    .setAuthor(`OptiFine Donations`, Assets.getEmoji(`ICO_heart`).url)
    .setTitle(`https://optifine.net/donate`)
    .setDescription(`OptiFine has been created, developed, and maintained solely by <@202558206495555585> for ${years} whole years and counting. Please consider donating to support the mod's continued development!\n\nFor a one-time donation of $10 USD, you'll (optionally) receive a customizable in-game cape, visible to all other OptiFine players, all in recognition of your awesomeness!`)
    .setFooter(`Thank you for your consideration!`);

  bot.send(m, { embed });
};

module.exports = new Command(metadata);
const util = require(`util`);
const path = require(`path`);
const djs = require(`discord.js`);
const fetch = require(`node-fetch`);
const { Command, memory, Assets } = require(`../core/optibot.js`);

const bot = memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  aliases: [`verify`, `donator`],
  description: {
    short: `Verify donator status.`,
    long: [
      `Verifies your donator status. If successful, this will grant you the donator role, and reset your donator token in the process.`,
      ``,
      `You can find your donator token by logging in through the website, at https://optifine.net/login. Look at the bottom of the page for a string of random characters (see picture for example).`,
      ``,
      `__**!!! Your account password is NOT your token !!!**__`,
      `__**!!! Your donation ID is NOT your token !!!**__`,
    ].join(`\n`)
  },
  args: `<e-mail> <token>`,
  guilds: [ bot.cfg.guilds.optifine ],
  dm: true,
  image: `IMG_token`,
  flags: [ `DM_ONLY`, `STRICT`, `DELETE_ON_MISUSE`, `NO_LOGGING_ARGS`, `LITE` ]
};

const exec = async (m, args, data) => {
  if (!args[0]) {
    return bot.util.missingArgs(m, metadata);
  }
  
  if (args[0].indexOf(`@`) < 0 && args[0].indexOf(`.`) < 0) {
    return bot.util.err(`You must specify a valid e-mail address.`, { m });
  } 
  
  if (!args[1]) {
    return bot.util.err(`You must specify your donator token.`, { m });
  }

  const res = await fetch(
    `https://optifine.net/validateToken?e=` + encodeURIComponent(args[0]) + `&t=` + encodeURIComponent(args[1]),
    { headers: { 'User-Agent': `optibot` } }
  ).catch(err => bot.util.err(err));

  if (res == null || res.status !== 200) return bot.util.err(new Error(`Failed to get a response from the OptiFine API`), { m });

  const body = await res.text();

  if (body === `true`) {
    await data.member.roles.add([bot.cfg.roles.donator, bot.cfg.roles.donatorColor], `Donator status verified.`);

    const embed = new djs.MessageEmbed()
      .setColor(bot.cfg.embed.okay)
      .setAuthor(`Thank you for your contribution! Your donator role has been granted.`, Assets.getEmoji(`ICO_okay`).url);

    m.channel.send({ embed: embed });
  } else {
    const embed = bot.util.err(`Invalid credentials.`)
      .setDescription(`Make sure that your token and e-mail are the same as what you see on https://optifine.net/login.`);

    m.channel.send({ embed: embed });
  }
};

module.exports = new Command(metadata, exec);
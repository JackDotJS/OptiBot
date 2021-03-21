const path = require(`path`);
const { Command, memory } = require(`../core/optibot.js`);

const bot = memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  description: {
    short: `Calculate OptiBot's per-channel mod/posting rules.`,
    long: `Calculates per-channel custom modification and posting rules as defined in OptiBot's config.json. \n\nDeveloper note: The current implementation of this command was meant to be a temporary testing thing which only posts the result to the bot's console log. While it's still meant for development only, I want to expand on this and have it post a regular message at some point, simply cus it's a bit easier to work with. -Jack`
  },
  dm: true,
  flags: [ `PERMS_REQUIRED` ],
  run: null
};

metadata.run = m => {
  const channels = [...bot.guilds.cache.get(bot.cfg.guilds.optifine).channels.cache.values()].filter((c) => c.type === `text`).sort((a, b) => a.rawPosition - b.rawPosition);
  const lines = [];

  for (const i in channels) {
    const channel = channels[i];

    let str = `#${channel.name} (${channel.id})`;

    if (bot.cfg.channels.bot.some(id => [channel.id, channel.parentID].includes(id))) {

      str += `\n- bot channel`;
    }

    if (bot.cfg.channels.staff.some(id => [channel.id, channel.parentID].includes(id))) {
      str += `\n- staff channel`;
    }

    if (bot.cfg.channels.blacklist.some(id => [channel.id, channel.parentID].includes(id))) {
      str += `\n- blacklisted`;
    }

    if (bot.cfg.channels.nomodify.some(id => [channel.id, channel.parentID].includes(id))) {
      str += `\n- no modification`;
    }

    if (str === `#${channel.name} (${channel.id})`) {
      str += `\n-`;
    }

    str += `\n`;

    lines.push(str);

    if (parseInt(i) + 1 >= channels.length) {
      log(lines.join(`\n`), `info`);
      m.channel.send(`channels perms calculated`);
    }
  }
};

module.exports = new Command(metadata);
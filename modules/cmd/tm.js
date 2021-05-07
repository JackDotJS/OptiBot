const path = require(`path`);
const djs = require(`discord.js`);
const { Command, memory, Assets } = require(`../core/modules.js`);

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  aliases: [`thanos`, `method`, `binarysplit`],
  description: {
    short: `Show a quick guide for *The Thanos Method!™️*`,
    long: `Provides a quick guide to find incompatible Minecraft mods.`
  },
  dm: true,
  flags: [ `LITE` ],
  dperm: `SEND_MESSAGES`,
  run: null
};

metadata.run = m => {
  const embed = new djs.MessageEmbed()
    .setColor(bot.cfg.colors.default)
    .setAuthor(`The Thanos Method!™️`, Assets.getEmoji(`ICO_snap`).url)
    .addField(`What the heck is it?`, `*The Thanos Method!™️* (more accurately known as a binary split) is a debugging technique used to find mods that are incompatible with OptiFine.`)
    .addField(`How does it work?`, `*The Thanos Method!™️* is simple. To find conflicting mods, split your mods folder into 2 groups. Remove one group, and test in-game. Keep the group that has the problem, and repeat until no more mods can be removed without the issue disappearing. Thanks to *The Thanos Method!™️*, you can now report the incompatible mods on GitHub!`)
    .setFooter(`"The Thanos Method!" is not actually trademarked or even remotely considered an official name. \n\nplease don't sue me i just thought it was funny`);

  bot.send(m, { embed });
};

module.exports = new Command(metadata);
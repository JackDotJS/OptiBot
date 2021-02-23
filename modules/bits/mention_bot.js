const { OptiBit, Assets, memory } = require(`../core/optibot.js`);

const bot = memory.core.client;

const metadata = {
  name: `Bot Mention Reactor`,
  description: `Adds a reaction to a given message when OptiBot is directly @mentioned.`,
  usage: `Simply mention <@${bot.user.id}>`,
  priority: 0,
  concurrent: true,
  authlvl: 0,
  flags: [`DM_OPTIONAL`, `HIDDEN`],
  validator: null,
  executable: null
};

metadata.validator = m => m.mentions.has(bot.user, {ignoreRoles: true, ignoreEveryone: true});

metadata.executable = m => m.react(Assets.getEmoji(`pinged`));

module.exports = new OptiBit(metadata);
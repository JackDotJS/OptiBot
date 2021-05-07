const ob = require(`../core/modules.js`);
const util = require(`util`);

const bot = ob.memory.core.client;
const log = ob.log;

module.exports = async (m) => {
  if (!bot.available) return;
  if (m.author.bot || m.author.system || m.type !== `DEFAULT` || m.system) return;

  if (ob.memory.users.indexOf(m.author.id) === -1) {
    ob.memory.users.push(m.author.id);

    const profile = await bot.profiles.get(m.author.id);

    profile.edata.lastSeen = new Date().getTime();
    bot.profiles.update(profile);
  }

  const gcfg = await bot.util.getGuildConfig(m.guild);
  const input = await bot.util.parseInput(m.content, gcfg);

  if (input.valid) return bot.util.handleCommand(m, input, gcfg);

  /////////////////////////////////////////////////////////////
  // AUTO-COMMAND HANDLER
  /////////////////////////////////////////////////////////////
};
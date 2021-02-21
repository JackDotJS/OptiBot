const util = require(`util`);
const ob = require(`../core/OptiBot.js`);

const bot = ob.memory.core.client;
const log = ob.log;

module.exports = (bot, oldg, newg) => {
  if (oldg.available === false && newg.available === true) {
    log(`Guild available! \n"${newg.name}" has recovered. \nGuild ID: ${newg.id}`, `warn`);
    if (newg.id === bot.cfg.guilds.optifine) {
      ob.memory.core.bootFunc();
    }
  }
};
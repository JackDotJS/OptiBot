const util = require(`util`);
const ob = require(`../core/OptiBot.js`);

const bot = ob.memory.core.client;
const log = ob.log;

module.exports = (bot, members, guild) => {
  log(`Guild member chunk received. \nSize: ${members.size}\nGuild: ${guild.name} (${guild.id})`);
};
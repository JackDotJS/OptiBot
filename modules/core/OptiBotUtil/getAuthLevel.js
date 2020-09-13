const djs = require('discord.js');
const Memory = require('../OptiBotMemory.js');

const bot = Memory.core.client;
const log = bot.log;

module.exports = (member, ignoreElevated) => {
  /**
         * Authorization Level
         *
         * -1 = Muted Member (DM ONLY)
         * 0 = Normal Member
         * 1 = Advisor
         * 2 = Jr. Moderator
         * 3 = Moderator
         * 4 = Administrator
         * 5 = Bot Developer
         */

  if (member.constructor === djs.User) {
    log('expected object type member, got user instead', 'warn');
    if (bot.cfg.superusers.includes(member.id) && !ignoreElevated) {
      return 5;
    }
  } else if (member != null && member.constructor === djs.GuildMember) {
    if (member.roles.cache.has(bot.cfg.roles.botdev) && !ignoreElevated) return 5;
    if (member.permissions.has('ADMINISTRATOR')) return 4;
    if (member.roles.cache.has(bot.cfg.roles.moderator)) return 3;
    if (member.roles.cache.has(bot.cfg.roles.jrmod)) return 2;
    if (member.roles.cache.has(bot.cfg.roles.advisor)) return 1;
    if (member.roles.cache.has(bot.cfg.roles.muted)) return -1;
  }

  return 0;
};
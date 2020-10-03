const cid = require('caller-id');
const util = require('util');
const ob = require('../modules/core/OptiBot.js');

const log = (message, level, file, line) => {
  const call = cid.getData();
  if (!file) file = (call.evalFlag) ? 'eval()' : call.filePath.substring(call.filePath.lastIndexOf('\\') + 1);
  if (!line) line = call.lineNumber;

  try {
    process.send({
      type: 'log',
      message: message,
      level: level,
      misc: `${file}:${line}`
    });
  }
  catch (e) {
    try {
      process.send({
        type: 'log',
        message: util.inspect(message),
        level: level,
        misc: `${file}:${line}`
      });
    }
    catch (e2) {
      log(e);
      log(e2);
    }
  }


};

module.exports = (bot, old, mem) => {
  if (bot.pause) return;
  if (mem.guild.id !== bot.cfg.guilds.optifine) return;
  if (mem.user.bot) return;

  for (const i in ob.Memory.mods) {
    const mod = ob.Memory.mods[i];
    if (mod.id === mem.id) {
      if (mod.status !== mem.presence.status || (mem.lastMessage && mem.lastMessage.createdTimestamp !== mod.last_message)) {
        log('moderator updated');
        log('OLD');
        log(mod.status);
        log('NEW');
        log(mem.presence.status);

        ob.Memory.mods[i].status = mem.presence.status;
        ob.Memory.mods[i].last_message = (mem.lastMessage) ? mem.lastMessage.createdTimestamp : mod.last_message;
      }
    }
  }
};
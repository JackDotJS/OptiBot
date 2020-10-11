const cid = require('caller-id');
const util = require('util');
const ob = require('../core/OptiBot.js');

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

module.exports = (bot, oldg, newg) => {
  if (oldg.available === false && newg.available === true) {
    log(`Guild available! \n"${newg.name}" has recovered. \nGuild ID: ${newg.id}`, 'warn');
    if (newg.id === bot.cfg.guilds.optifine) {
      ob.Memory.core.bootFunc();
    }
  }
};
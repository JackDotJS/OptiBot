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

module.exports = (bot, id, guilds) => {
  log(`Shard WebSocket ready. \nShard ID: ${id} \nUnavailable Guilds: ${(guilds) ? '\n' + [...guilds].join('\n') : 'None.'}`, 'info');
  log(util.inspect(bot.ws));
  ob.OBUtil.setWindowTitle();
  ob.Memory.presenceRetry = 0;
};
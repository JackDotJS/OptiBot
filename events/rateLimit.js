const cid = require('caller-id');
const util = require('util');

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

module.exports = (bot, rl) => {
  const rlInfo = [
    `Timeout: ${rl.timeout}`,
    `Request Limit: ${rl.limit}`,
    `HTTP Method: ${rl.method}`,
    `Path: ${rl.path}`,
    `Route: ${rl.route}`
  ].join('\n');

  log('OptiBot is being ratelimited! \n' + rlInfo, 'warn');
};
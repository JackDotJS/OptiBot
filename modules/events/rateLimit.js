const util = require(`util`);
const ob = require(`../core/OptiBot.js`);

const bot = ob.memory.core.client;
const log = ob.log;

module.exports = (rl) => {
  const rlInfo = [
    `Timeout: ${rl.timeout}`,
    `Request Limit: ${rl.limit}`,
    `HTTP Method: ${rl.method}`,
    `Path: ${rl.path}`,
    `Route: ${rl.route}`
  ].join(`\n`);

  log(`OptiBot is being ratelimited! \n` + rlInfo, `warn`);
};
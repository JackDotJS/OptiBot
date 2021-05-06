const util = require(`util`);
const ob = require(`../core/modules.js`);

const bot = ob.memory.core.client;
const log = ob.log;

module.exports = (event, id) => {
  log(`Shard WebSocket disconnected. \nShard ID: ${id} \nEvent Code: ${event.code} (${getCodeName(event.code)})`, `warn`);
  bot.util.setWindowTitle();
};

function getCodeName(code) {
  if (code >= 0 && code <= 999) {
    return `Reserved`;
  } else if (code === 1000) {
    return `Normal Closure`;
  } else if (code === 1001) {
    return `Going Away`;
  } else if (code === 1002) {
    return `Protocol Error`;
  } else if (code === 1003) {
    return `Unsupported Data`;
  } else if (code === 1004) {
    return `Reserved`;
  } else if (code === 1005) {
    return `No Status Received`;
  } else if (code === 1006) {
    return `Abnormal Closure`;
  } else if (code === 1007) {
    return `Invalid Frame Payload Data`;
  } else if (code === 1008) {
    return `Policy Violation`;
  } else if (code === 1009) {
    return `Message Too Big`;
  } else if (code === 1010) {
    return `Missing Extension`;
  } else if (code === 1011) {
    return `Internal Error`;
  } else if (code === 1012) {
    return `Service Restart`;
  } else if (code === 1013) {
    return `Try Again Later`;
  } else if (code === 1014) {
    return `Bad Gateway`;
  } else if (code === 1015) {
    return `TLS Handshake`;
  } else if (code >= 1016 && code <= 3999) {
    return `Reserved`;
  } else if (code === 4000) {
    return `DISCORD: Unknown Error`;
  } else if (code === 4001) {
    return `DISCORD: Unknown Opcode`;
  } else if (code === 4002) {
    return `DISCORD: Decode Error`;
  } else if (code === 4003) {
    return `DISCORD: Not Authenticated`;
  } else if (code === 4004) {
    return `DISCORD: Authentication Failed`;
  } else if (code === 4005) {
    return `DISCORD: Already Authenticated`;
    // there is no code 4006 for some reason https://discordapp.com/developers/docs/topics/opcodes-and-status-codes
  } else if (code === 4007) {
    return `DISCORD: Invalid Sequence`;
  } else if (code === 4008) {
    return `DISCORD: Rate Limited`;
  } else if (code === 4009) {
    return `DISCORD: Session Timed Out`;
  } else if (code === 4010) {
    return `DISCORD: Invalid Shard`;
  } else if (code === 4011) {
    return `DISCORD: Sharding Required`;
  } else if (code === 4012) {
    return `DISCORD: Invalid API Version`;
  } else if (code === 4013) {
    return `DISCORD: Invalid Intent`;
  } else if (code === 4014) {
    return `DISCORD: Disallowed Intent`;
  } else {
    return `Unknown`;
  }
}
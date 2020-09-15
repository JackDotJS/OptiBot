const Memory = require('../OptiBotMemory.js');
const bot = Memory.core.client;

module.exports = (text) => {
  if (text !== undefined) Memory.wintitle = text;

  function statusName(code) {
    if (code === 0) return 'READY';
    if (code === 1) return 'CONNECTING';
    if (code === 2) return 'RECONNECTING';
    if (code === 3) return 'IDLE';
    if (code === 4) return 'NEARLY';
    if (code === 5) return 'DISCONNECTED';
  }

  const wintitle = [
    `OptiBot ${bot.version}`,
    `OP Mode ${bot.mode}`,
  ];

  if (bot.ws) {
    let code = bot.ws.status;

    if (bot.ws.shards.size > 0) code = bot.ws.shards.first().status;

    wintitle.push(
      `${Math.round(bot.ws.ping)}ms`,
      `WS Code ${code} (${statusName(code)})`
    );
  } else {
    wintitle.push(
      '-0ms',
      `WS Code 3 (${statusName(3)})`
    );
  }

  if (typeof Memory.wintitle === 'string') wintitle.push(Memory.wintitle);

  process.title = wintitle.join(' | ');
};
function statusName(code) {
    if(code === 0) return 'READY';
    if(code === 1) return 'CONNECTING';
    if(code === 2) return 'RECONNECTING';
    if(code === 3) return 'IDLE';
    if(code === 4) return 'NEARLY';
    if(code === 5) return 'DISCONNECTED';
}

module.exports = {
    interval: 1000,
    fn: (bot, log) => {
        process.title = `OptiBot ${bot.version} | ${Math.round(bot.ws.ping)}ms | Status Code ${bot.ws.status} (${statusName(bot.ws.status)})`;
    }
}
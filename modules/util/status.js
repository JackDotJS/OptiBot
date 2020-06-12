module.exports = (bot, type) => {
    let pr = {
        status: 'online',
        activity: {
            name: null,
            type: null
        }
    }

    if (type === -1) {
        // shutting down
        pr.status = 'invisible';
    } else
    if (type === 0) {
        // loading assets
        pr.status = 'idle';
        pr.activity.type = 'WATCHING';
        pr.activity.name = 'assets load 🔄';
    } else
    if (type === 1) {
        // default state
        if(bot.mode === 0) {
            // code mode
            pr.status = 'dnd';
            pr.activity.type = 'PLAYING';
            pr.activity.name = 'Code Mode 💻';
        } else 
        if(bot.mode === 1 || bot.memory.bot.locked) {
            // ultralight mode and mod mode
            pr.status = 'dnd';
            pr.activity.type = 'PLAYING';
            pr.activity.name = 'Mod Mode 🔒';
        } else 
        if (bot.mode === 2) {
            // lite mode
            pr.status = 'idle';
            pr.activity.type = 'PLAYING';
            pr.activity.name = 'Lite Mode ⚠️';
        } else {
            // normal
            pr.status = 'online';
        }
    } else
    if (type === 2) {
        // cooldown active
        pr.status = 'idle';
    }

    if(pr.activity.name === null || pr.activity.type === null) {
        delete pr.activity;
    }

    bot.memory.presence = pr;
    bot.user.setPresence(pr);
}
const fs = require(`fs`);
const util = require(`util`);

const djs = require(`discord.js`);
const path = require(`path`);

const Memory = require('./OptiBotMemory.js');
const OBUtil = require('./OptiBotUtil.js');

module.exports = class OptiBot extends djs.Client {
    constructor (options, mode, log) {
        super(options);
        
        const keys = require(path.resolve('./cfg/keys.json'));
        const cfg = require(path.resolve('./cfg/config.json'));
        const version = require(path.resolve('./package.json')).version;
        const prefix = (mode === 0) ? cfg.prefixes.debug[0] : cfg.prefixes.default[0]; // first in array is always default, but all others will be accepted during real usage.

        let exit = new Date()
        exit.setUTCHours(8, 0, 0, 0); // 8 AM = 1 AM US Pacific, 4 AM US Eastern

        if(exit.getTime() - new Date().getTime() < 0) {
            exit.setUTCDate(exit.getUTCDate()+1)
        }

        this.keys = keys;
        this.log = log;
        this.cfg = cfg;
        this.mode = 0;
        this.pause = true;
        this.exitTime = exit;
        this.locked = (mode === 0 || mode === 1);
        this.prefix = prefix;
        this.prefixes = (mode === 0) ? cfg.prefixes.debug : cfg.prefixes.default;
        this.version = version;
        
        Memory.core.client = this;

        Object.defineProperty(this, 'mainGuild', {
            get: () => {
                return this.guilds.cache.get(this.cfg.guilds.optifine);
            }
        });

        /* this.setTimeout(() => {
            this.pause = true;
            this.setBotStatus(-1)

            let logEntry = new LogEntry({time: new Date()})
            .setColor(this.cfg.embed.default)
            .setIcon(Assets.getEmoji('ICO_door').url)
            .setTitle(`OptiBot is now restarting...`, `OptiBot Restart Report`)
            .submit().then(() => {
                let maxPauseTime = 30000;
                let minPauseTime = 5000;
                let pauseTime = minPauseTime;

                let li = new Date().getTime() - Memory.li;

                if(li > maxPauseTime) pauseTime = minPauseTime;
                if(li < minPauseTime) pauseTime = maxPauseTime;
                if(li < maxPauseTime && li > minPauseTime) pauseTime = li/(1000);

                log(`Restarting in ${(pauseTime/(1000)).toFixed(1)} seconds...`, 'warn');

                this.setTimeout(() => {
                    this.exit(18)
                }, pauseTime);
            });
        }, exit.getTime() - new Date().getTime()) */
    }

    exit(code = 0) {

        /**
         * 0 = standard shutdown
         * 1 = error/crash
         * 16 = requested restart
         * 17 = requested update
         * 18 = scheduled restart
         */

        this.destroy()
        OBUtil.setWindowTitle('Shutting down...')

        setTimeout(() => {
            process.exit(code);
        }, 500);
    }

    setBotStatus(type) {
        const bot = this;
        
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
            if(bot.mode === 1 || bot.locked) {
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
    
        Memory.presence = pr;
        bot.user.setPresence(pr);
    }
}
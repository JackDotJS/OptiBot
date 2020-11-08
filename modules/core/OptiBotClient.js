const fs = require('fs');
const util = require('util');

const djs = require('discord.js');
const path = require('path');

const Memory = require('./OptiBotMemory.js');
const OBUtil = require('./OptiBotUtil.js');

module.exports = class OptiBot extends djs.Client {
  constructor(options, mode, log) {
    super(options);

    // i dont know why these things wont work without path.resolve (yes, even with the correct path)
    // fuck you, node

    let cfg = require(path.resolve('./cfg/config.json'));

    if (mode === 0) {
      // Load the real config first, but if the debug config has properties that differ from the real config, overwrite them to use the debug properties
      const cfg_d = require(path.resolve('./cfg/config_debug.json'));

      cfg = Object.assign(cfg, cfg_d);
    }

    const exit = new Date();
    exit.setUTCHours(8, 0, 0, 0); // 8 AM = 1 AM US Pacific, 4 AM US Eastern

    if (exit.getTime() - new Date().getTime() < 0) {
      exit.setUTCDate(exit.getUTCDate() + 1);
    }

    this.keys = require(path.resolve('./cfg/keys.json'));
    this.log = log;
    this.cfg = cfg;
    this.mode = mode;
    this.pause = true;
    this.exitTime = exit;
    this.locked = (mode === 0 || mode === 1);
    this.prefix = cfg.prefixes[0]; // first in array is always default, but all others will be accepted during real usage.
    this.prefixes = cfg.prefixes;
    this.version = require(path.resolve('./package.json')).version;

    Memory.core.client = this;

    Object.defineProperty(this, 'mainGuild', {
      get: () => {
        return this.guilds.cache.get(this.cfg.guilds.optifine);
      }
    });
  }

  exit(code = 0) {

    /**
         * 0 = standard shutdown
         * 1 = error/crash
         * 16 = requested restart
         * 17 = requested update
         * 18 = scheduled restart
         */

    this.destroy();
    OBUtil.setWindowTitle('Shutting down...');

    setTimeout(() => {
      process.exit(code);
    }, 500);
  }

  setBotStatus(type) {
    const bot = this;

    const pr = {
      status: 'online',
      activity: {
        name: null,
        type: null
      }
    };

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
      if (bot.mode === 0) {
        // code mode
        pr.status = 'dnd';
        pr.activity.type = 'PLAYING';
        pr.activity.name = 'Code Mode 💻';
      } else
      if (bot.mode === 1 || bot.locked) {
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
        pr.activity.type = 'LISTENING';
        pr.activity.name = `${bot.prefix}about`;
      }
    } else
    if (type === 2) {
      // cooldown active
      pr.status = 'idle';
    }

    if (pr.activity.name === null || pr.activity.type === null) {
      delete pr.activity;
    }

    Memory.presence = pr;
    bot.user.setPresence(pr);
  }
};

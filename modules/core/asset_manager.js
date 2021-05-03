const fs = require(`fs`);
const util = require(`util`);
const chokidar = require(`chokidar`);
const djs = require(`discord.js`);
const path = require(`path`);
const Jimp = require(`jimp`);
const gwrap = require(`gifwrap`);

const memory = require(`./memory.js`);
const Command = require(`./command.js`);
const OptiBit = require(`./bit.js`);

module.exports = class OptiBotAssetsManager {
  constructor() {
    throw new Error(`Why are you doing this? (Cannot instantiate this class.)`);
  }

  static async load(tier = 0) {
    /**
     * type
     * 
     * 0 = everything
     * 1 = commands, optibits, utilities, and images
     * 2 = only images
     */

    const bot = memory.core.client;
    const log = bot.log;

    log(`Loading assets...`, `info`);

    bot.setStatus(`LOADING`);
    bot.available = false;

    const timeStart = new Date().getTime();

    // stages = important stuff, runs first and foremost
    // stagesNE = secondary, non-essential stages. continues to run AFTER returning

    const stages = [];
    const stagesNE = [];
    let totals = 0;
    let errors = 0;
    let errorsNE = 0;
    let done = 0;
    let skipped = 0;
    let skippedNE = 0;

    stages.push({
      name: `File System Watcher`,
      tiers: [true, false, false],
      load: () => {
        return new Promise((resolve, reject) => {
          const watcher = chokidar.watch([
            `./modules/cmd`,
            `./modules/events`,
            `./modules/util`
          ], { persistent: false });

          watcher.on(`change`, modpath => {
            log(`module updated: "${modpath}"`);

            const rpath = path.resolve(modpath);
            if (memory.assets.needReload.includes(rpath)) return;

            log(`Adding module "${rpath}" to refresh list.`, `warn`);
            memory.assets.needReload.push(rpath);
          });

          watcher.on(`error`, (err) => {
            bot.util.err(err);
          });

          watcher.on(`ready`, () => {
            resolve();
          });
        });
      }
    });

    stages.push({
      name: `Module Cache Remover`,
      tiers: [false, true, false],
      load: async () => {
        for (const moddir of memory.assets.needReload) {
          log(`Invalidating cache for module: ${moddir}`, `warn`);

          delete require.cache[require.resolve(moddir)];
        }

        return;
      }
    });

    stages.push({
      name: `Command Loader`,
      tiers: [true, true, false],
      load: async () => {
        const commands = fs.readdirSync(`./modules/cmd`, { withFileTypes: true });

        memory.assets.commands = [];

        for(const i in commands) {
          const cmd = commands[i];
          log(cmd);
          if (cmd == null || !cmd.isFile() || !cmd.name.endsWith(`.js`)) continue;
          
          log(`processing: ./modules/cmd/${cmd.name}`);
          
          const newcmd = require(`../cmd/${cmd.name}`);
          
          if (newcmd.constructor !== Command) continue;
          
          if (bot.mode === 1 && !newcmd.metadata.flags[`LITE`]) {
            log(`Unable to load command "${newcmd.metadata.name}" due to Lite mode.`, `warn`);
            continue;
          }
          
          if (newcmd.metadata.aliases.length > 0) {
          
            // fucking ughhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh
            // hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh
            // hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh
          
            for(const alias of newcmd.metadata.aliases) {
              for(const ecmd of memory.assets.commands) {
                if (alias === ecmd.metadata.name) {
                  throw new Error(`Failed to load command, conflicting names/aliases: "${alias}" (${newcmd.metadata.name}.js) === "${ecmd.metadata.name}" (${ecmd.metadata.name}.js)`);
                } else
                if (ecmd.metadata.aliases.length > 0) {
                  for(const ecmd_alias of ecmd.metadata.aliases) {
                    if (alias === ecmd_alias) {
                      throw new Error(`Failed to load command, conflicting names/aliases: "${alias}" (${newcmd.metadata.name}.js) === "${ecmd_alias}" (${ecmd.metadata.name}.js)`);
                    }
                  }
                }
              }
            }
          }

          memory.assets.commands.push(newcmd);
          
          log(`Command registered: ${newcmd.metadata.name}`);
        }

        return;
      }
    });

    stages.push({
      name: `Event Handler Loader`,
      tiers: [true, true, false],
      load: async () => {
        const events = fs.readdirSync(`./modules/events/`);

        for (const file of events) {
          const name = file.split(`.`)[0];
          bot.removeAllListeners(name); // ensures we dont attach multiple handlers to the same event after reloading
          bot.on(name, require(`../events/${file}`));
          log(`Loaded event handler: ${name}`);
        }

        return;
      }
    });

    stagesNE.push({
      name: `Muted Member Pre-cacher`,
      tiers: [true, false, false],
      load: () => {
        return new Promise((resolve, reject) => {
          memory.db.profiles.find({ 'edata.mute': { $exists: true }, format: 3 }, async (err, docs) => {
            if (err) return reject(err);

            if (docs.length === 0) {
              return resolve();
            }

            for (const profile of docs) {
              if (profile.edata.mute.end !== null) continue;

              const exp = profile.edata.mute.end;
              const remaining = exp - new Date().getTime();

              if (exp > bot.exitTime.getTime()) continue;

              const unmute = async () => {
                try {
                  await bot.util.unmuter(profile.id);
                }
                catch (err) {
                  bot.util.err(err);
                }

                return;
              };

              if (remaining < (1000 * 60)) {
                log(`Unmuting user ${profile.id} due to expired (or nearly expired) mute.`, `info`);

                await unmute();
              } else {
                log(`Scheduling ${profile.id} for unmute today. (${(remaining / (1000 * 60))} hours from now)`, `info`);
                memory.mutes.push({
                  id: profile.id,
                  time: bot.setTimeout(async () => {
                    await unmute();
                  }, remaining)
                });
              }
            }

            resolve();
          });
        });
      }
    });

    stagesNE.push({
      name: `Scheduled Task Loader`,
      tiers: [true, false, false],
      load: async () => {
        const tasks = fs.readdirSync(`./modules/tasks`, { withFileTypes: true });

        // todo: add support for scheduled tasks via database

        for (const i in tasks) {
          if (tasks[i] == null || !tasks[i].isFile() || !tasks[i].name.endsWith(`.js`)) continue;

          const task = require(`../tasks/${tasks[i].name}`);

          if (bot.mode === 1 && !task.lite) {
            log(`Unable to load task "${tasks[i]}" due to Lite mode.`, `warn`);
            continue;
          }

          if (task.repeat) {
            bot.setInterval(() => {
              task.fn();
            }, (task.interval));
          } else {
            bot.setTimeout(() => {
              task.fn();
            }, (task.time));
          }
        }

        return; 
      }
    });

    stagesNE.push({
      name: `Pinned Message Pre-Cacher`,
      tiers: [true, false, false],
      load: async () => {

        //if (bot.mode === 0) return resolve();

        const channels = bot.channels.cache.filter((c) => c.type === `text` && c.viewable).sort((a,b) => a.rawPosition - b.rawPosition).array();

        for (const channel of channels) {
          log(`fetching pinned messages from channel: #${channel.name} (${channel.id})`);

          await channel.messages.fetchPinned(true);
        }

        return;
      }
    });

    totals = stages.length + stagesNE.length;

    for (const stage of stages) {
      log(`Loading assets... ${Math.round((100 * done) / totals)}%`, `info`);

      log(`done/totals = ${done}/${totals}`);
      log(`stage.tiers[tier] = ${stage.tiers[tier]}`);

      if (!stage.tiers[tier]) {
        log(`Skipping stage "${stage.name}"`);
        done++;
        skipped++;
        continue;
      }

      try {
        log(`Starting primary stage "${stage.name}"`, `info`);

        const stageStart = new Date().getTime();
        await stage.load();
        const stageTime = (new Date().getTime() - stageStart) / 333;
        log(`"${stage.name}" cleared in ${stageTime} second(s).`);

        done++;
        

        log(`done/totals = ${done}/${totals}`);
      }
      catch(err) {
        bot.util.err(err);

        done++;
        errors++;
      }
    }

    log(`Primary Assets loaded with ${errors} error(s)!`, `info`);
    log([
      `Primary Asset Loader finished.`,
      `Stages: ${stages.length}`,
      `Skipped: ${skipped}`,
      `Errors: ${errors}`
    ].join(`\n`));

    bot.available = true;

    (async () => {
      // load secondary stages separately
      for (const stage of stagesNE) {
        log(`Loading assets... ${Math.round((100 * done) / totals)}%`, `info`);

        log(`done/totals = ${done}/${totals}`);
        log(`stage.tiers[${tier}] = ${stage.tiers[tier]}`);
  
        if (!stage.tiers[tier]) {
          log(`Skipping async stage "${stage.name}"`);
          done++;
          skippedNE++;
          continue; 
        }

        try {
          log(`Starting secondary stage "${stage.name}"`, `info`);
          const stageStart = new Date().getTime();
          await stage.load();
          const stageTime = (new Date().getTime() - stageStart) / 1000;
          log(`"${stage.name}" cleared in ${stageTime} second(s).`);

          done++;
        }
        catch(err) {
          bot.util.err(err);
          done++;
          errorsNE++;
        }
      }

      log(`Secondary Assets loaded with ${errorsNE} error(s)!`, `info`);
      log(`Encountered ${errors + errorsNE} total error(s) during setup.`, `info`);
      log([
        `Secondary Asset Loader finished.`,
        `Stages: ${stagesNE.length}`,
        `Skipped: ${skippedNE}`,
        `Errors: ${errorsNE}`,
        `Total Stages: ${totals}`,
        `Total Skipped: ${skipped + skippedNE}`,
        `Total Errors: ${errors + errorsNE}`
      ].join(`\n`));
    })();

    return (new Date().getTime() - timeStart);
  }

  static fetchCommand(query) {
    const bot = memory.core.client;
    const log = bot.log;

    return new Promise((resolve, reject) => {
      let i1 = 0;
      (function checkName() {
        if (query.toLowerCase() === memory.assets.commands[i1].metadata.name) {
          resolve(memory.assets.commands[i1]);
        } else
        if (memory.assets.commands[i1].metadata.aliases.length > 0) {
          let i2 = 0;
          (function checkAliases() {
            if (query.toLowerCase() === memory.assets.commands[i1].metadata.aliases[i2]) {
              resolve(memory.assets.commands[i1]);
            } else
            if (i2 + 1 === memory.assets.commands[i1].metadata.aliases.length) {
              if (i1 + 1 === memory.assets.commands.length) {
                resolve();
              } else {
                i1++;
                checkName();
              }
            } else {
              i2++;
              checkAliases();
            }
          })();
        } else
        if (i1 + 1 === memory.assets.commands.length) {
          resolve();
        } else {
          i1++;
          checkName();
        }
      })();
    });
  }

  static getCommand(query) {
    const bot = memory.core.client;
    const log = bot.log;

    if (!query) return null;

    query = query.toLowerCase();

    for (const cmd of memory.assets.commands) {
      if (query === cmd.metadata.name) return cmd;

      if (cmd.metadata.aliases.length > 0) {
        for (const alias of cmd.metadata.aliases) {
          if (query === alias) return cmd;
        }
      }
    }

    return null;
  }

  static getEmoji(query) {
    const bot = memory.core.client;
    const log = bot.log;

    let result;

    if (Number.isInteger(parseInt(query))) {
      result = bot.emojis.cache.get(query);
    } else {
      result = bot.emojis.cache.find(emoji => emoji.name.toLowerCase() === query.toLowerCase());
    }

    if (result) return result;
    return bot.emojis.cache.get(bot.cfg.emoji.default);
  }

  static async getIcon(query, color = `#FFFFFF`, rotate = 0) {
    const bot = memory.core.client;
    const log = bot.log;

    for (const item of memory.assets.icons) {
      if (item.q === query && item.c === color && item.r === rotate) {
        return item.u;
      }
    }

    // item does not exist in cache

    // somewhat basic cache system, only lasts while the bot is online
    // should this be made to cache urls to a persistent database?
    const submit = async (data, ext) => {
      const cachemsg = await bot.send(bot.channels.cache.get(bot.cfg.env.cacheID), { files: [ new djs.MessageAttachment(data, `image.${ext}`) ] });

      memory.assets.icons.push({
        q: query,
        c: color,
        r: rotate,
        u: cachemsg.msg.attachments.first().url
      });

      return cachemsg.msg.attachments.first().url;
    };

    const masks = fs.readdirSync(`./assets/icon`);
    let mask;

    for (const filename of masks) {
      if (filename.substring(0, filename.lastIndexOf(`.`)).toLowerCase() === query.toLowerCase()) {
        log(`match`);

        if (filename.endsWith(`.gif`)) {
          mask = await gwrap.GifUtil.read(`./assets/icon/${filename}`);
          break;
        }

        mask = await Jimp.read(`./assets/icon/${filename}`);
        break;
      }
    }

    if (!mask) return await submit(await fs.readFileSync(`./assets/icon/ICO_default.png`), `png`);

    // process PNG
    if (mask.constructor === Jimp) {
      const icon = new Jimp(mask.bitmap.width, mask.bitmap.height, color);

      icon.mask(mask, 0, 0);

      if (rotate !== 0 && !isNaN(parseInt(rotate))) {
        icon.background(0x00000000) // ensures background doesnt show after rotating
          .rotate(parseInt(rotate), false);
      }

      return await submit(await icon.getBufferAsync(Jimp.MIME_PNG), `png`);
    }

    // process GIF
    const frames = [];

    for (const i in mask.frames) {
      const jcolor = new Jimp(mask.frames[i].bitmap.width, mask.frames[i].bitmap.height, color);
      const fjmask = gwrap.GifUtil.copyAsJimp(Jimp, mask.frames[i].bitmap);

      const newframe = new gwrap.GifFrame(mask.frames[i]);

      jcolor.mask(fjmask, 0, 0);
      if (rotate !== 0 && !isNaN(parseInt(rotate))) {
        jcolor.background(0x00000000) // ensures background doesnt show after rotating
          .rotate(parseInt(rotate), false);
      }

      newframe.bitmap = jcolor.bitmap;

      frames.push(newframe);
    }

    const codec = new gwrap.GifCodec();

    return await submit((await codec.encodeGif(frames, { loops: 0, colorScope: 0 })).buffer, `gif`);
  }

  static getImage(query) {
    const bot = memory.core.client;
    const log = bot.log;
    const images = fs.readdirSync(`./assets/img`);

    for (const filename of images) {
      if (filename.substring(0, filename.lastIndexOf(`.`)).toLowerCase() === query.toLowerCase()) {
        log(`match`);
        return fs.readFileSync(`./assets/img/${filename}`);
      }
    }

    return fs.readFileSync(`./assets/img/ICO_default.png`);
  }
};
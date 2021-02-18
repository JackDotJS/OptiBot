const fs = require(`fs`);
const util = require(`util`);
const chokidar = require(`chokidar`);
const djs = require(`discord.js`);
const path = require(`path`);

const memory = require(`./memory.js`);
const Command = require(`./command.js`);
const OptiBit = require(`./bit.js`);

module.exports = class OptiBotAssetsManager {
  constructor() {
    throw new Error(`Why are you doing this? (Cannot instantiate this class.)`);
  }

  static load(tier = 0) {
    /**
         * type
         * 
         * 0 = everything
         * 1 = commands, optibits, utilities, and images
         * 2 = only images
         */

    const bot = memory.core.client;
    const log = bot.log;

    return new Promise((success, failure) => {
      log(`Loading assets...`, `info`);

      bot.pause = true;

      const timeStart = new Date().getTime();
      const stages = [];
      const stagesAsync = [];
      let totals = 0;
      let errors = 0;
      let errorsAsync = 0;
      let done = 0;
      let skipped = 0;
      let skippedAsync = 0;
      
      stages.push({
        name: `OptiBot Events Loader`,
        tiers: [true, false, false],
        load: () => {
          return new Promise((resolve, reject) => {
            const events = fs.readdirSync(`./modules/events/`);

            for (const file of events) {
              const name = file.split(`.`)[0];
              const event = require(`../events/${file}`);
              bot.on(name, event.bind(null, bot));
              log(`Loaded event handler: ${name}`);
            }

            resolve();
          });
        }
      });

      stages.push({
        name: `OptiFine GuildMembers Pre-cacher`,
        tiers: [true, false, false],
        load: () => {
          return new Promise((resolve, reject) => {
            bot.mainGuild.members.fetch().then(() => {
              resolve();
            });
          });
        }
      });

      stages.push({
        name: `OptiBot File System Watcher`,
        tiers: [false, true, false],
        load: () => {
          return new Promise((resolve, reject) => {
            const modules = fs.readdirSync(`./modules/`, { withFileTypes: true });

            const files = [];

            for (const dir of modules) {
              if (!dir.isDirectory()) continue;

              const subdir = fs.readdirSync(`./modules/${dir.name}`, { withFileTypes: true });

              for (const modulefile of subdir) {
                if (!dir.isFile()) continue;

                files.push(`./modules/${dir.name}/${modulefile.name}`);
              }
            }

            const watcher = chokidar.watch(files, { persistent: false });

            watcher.on(`change`, path => {
              log(`module updated: "${path}"`);

              if (memory.assets.needReload.includes(path)) return;

              log(`Added module "${path}" to refresh list.`, `warn`);

              memory.assets.needReload.push(path);
            });

            resolve();
          });
        }
      });

      stages.push({
        name: `OptiBot Module Reloader`,
        tiers: [false, true, false],
        load: () => {
          return new Promise((resolve, reject) => {
            for (const moddir of memory.assets.needReload) {
              log(`Reloading module: ${moddir}`, `warn`);

              delete require.cache[require.resolve(moddir)];
              require(moddir);
            }

            resolve();
          });
        }
      });

      stages.push({
        name: `Command Loader`,
        tiers: [true, true, false],
        load: () => {
          return new Promise((resolve, reject) => {
            const commands = fs.readdirSync(`./modules/cmd`, { withFileTypes: true });

            memory.assets.commands = [];

            for(const i in commands) {
              const cmd = commands[i];
              if (cmd == null || !cmd.isFile() || !cmd.name.endsWith(`.js`)) continue;
            
              log(`processing: ./modules/cmd/${cmd.name}`);
            
              const newcmd = require(`../cmd/${cmd.name}`);
            
              if (newcmd.constructor !== Command) continue;
            
              if ([1,2].includes(bot.mode) && !newcmd.metadata.flags[`LITE`]) {
                log(`Unable to load command "${newcmd.metadata.name}" due to Lite mode.`, `warn`);
                continue;
              }
            
              const finalRegister = () => {
                memory.assets.commands.push(newcmd);
            
                log(`Command registered: ${newcmd.metadata.name}`);
              };
            
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
            
                finalRegister();
              } else {
                finalRegister();
              }

              resolve();
            }
          });
        }
      });

      stages.push({
        name: `Audit Log Pre-cacher`,
        tiers: [true, false, false],
        load: () => {
          return new Promise((resolve, reject) => {
            bot.mainGuild.fetchAuditLogs({ limit: 10, type: `MESSAGE_DELETE` }).then((audit) => {
              memory.audit.log = [...audit.entries.values()];
              resolve();
            });
          });
        }
      });

      stagesAsync.push({
        name: `Muted Member Pre-cacher`,
        tiers: [true, false, false],
        load: () => {
          return new Promise((resolve, reject) => {
            memory.db.profiles.find({ 'edata.mute': { $exists: true }, format: 3 }, (err, docs) => {
              if (err) {
                reject(err);
              } else
              if (docs.length === 0) {
                resolve();
              } else {

                let i = -1;
                (function nextEntry() {
                  i++;
                  const profile = docs[i];
                  if (i >= docs.length) return resolve();

                  if (profile.edata.mute.end !== null) {
                    const exp = profile.edata.mute.end;
                    const remaining = exp - new Date().getTime();

                    if (exp <= bot.exitTime.getTime()) {
                      if (remaining < (1000 * 60)) {
                        log(`Unmuting user ${profile.id} due to expired (or nearly expired) mute.`, `info`);
                        bot.util.unmuter(profile.id).then(() => {
                          nextEntry();
                        }).catch(err => {
                          bot.util.err(err);
                          nextEntry();
                        });
                      } else {
                        log(`Scheduling ${profile.id} for unmute today. (${(remaining / (1000 * 60))} hours from now)`, `info`);
                        memory.mutes.push({
                          id: profile.id,
                          time: bot.setTimeout(() => {
                            bot.util.unmuter(profile.id).catch(err => {
                              bot.util.err(err);
                            });
                          }, remaining)
                        });
                        nextEntry();
                      }
                    } else {
                      nextEntry();
                    }
                  } else {
                    nextEntry();
                  }
                })();
              }
            });
          });
        }
      });

      stagesAsync.push({
        name: `OptiBit Loader`,
        tiers: [true, true, false],
        load: () => {
          return new Promise((resolve, reject) => {

            // todo: refactor this code similar to command loader

            const optibits = fs.readdirSync(path.resolve(`./modules/bits`));
            let clear = false;

            if (memory.assets.optibits.length > 0) {
              memory.assets.optibits = [];
              clear = true;
            }

            let i1 = 0;
            (function loadBit() {
              const bit = optibits[i1];
              if (i1 + 1 > optibits.length) {
                memory.assets.optibits.sort((a, b) => a.metadata.priority - b.metadata.priority);
                log(memory.assets.optibits);
                resolve();
              } else
              if (bit.endsWith(`.js`)) {
                log(`processing: ${path.resolve(`./modules/bits/${bit}`)}`);

                if (clear) {
                  log(`cache delete: ${require.resolve(path.resolve(`./modules/bits/${bit}`))}`);
                  delete require.cache[require.resolve(path.resolve(`./modules/bits/${bit}`))];
                }

                try {
                  const newbit = require(path.resolve(`./modules/bits/${bit}`));

                  if ((bot.mode === 1 || bot.mode === 2) && !newbit.metadata.flags[`LITE`]) {
                    log(`Unable to load OptiBit "${newbit.metadata.name}" due to Lite mode.`, `warn`);
                    i1++;
                    loadBit();
                  } else
                  if (newbit.constructor === OptiBit) {
                    memory.assets.optibits.push(newbit);
                    log(`OptiBit registered: ${newbit.metadata.name}`);
                    i1++;
                    loadBit();
                  } else {
                    bot.util.err(new TypeError(`Invalid OptiBit.`));
                    i1++;
                    loadBit();
                  }
                }
                catch (err) {
                  bot.util.err(err);
                  i1++;
                  loadBit();
                }
              } else {
                i1++;
                loadBit();
              }
            })();
          });
        }
      });

      stagesAsync.push({
        name: `Image Loader`,
        tiers: [true, true, true],
        load: () => {
          return new Promise((resolve, reject) => {
            memory.assets.images.index = [];
            const images = fs.readdirSync(path.resolve(`./assets/img`));

            for (const img of images) {
              if (img.match(/\./) !== null) {
                const buffer = fs.readFileSync(path.resolve(`./assets/img/${img}`));

                if (img.substring(0, img.lastIndexOf(`.`)) === `default`) {
                  memory.assets.images.default = {
                    name: img.substring(0, img.lastIndexOf(`.`)),
                    buffer: buffer,
                    attachment: new djs.MessageAttachment(buffer, `image${img.substring(img.lastIndexOf(`.`))}`)
                  };
                } else {
                  memory.assets.images.index.push({
                    name: img.substring(0, img.lastIndexOf(`.`)),
                    buffer: buffer,
                    attachment: new djs.MessageAttachment(buffer, `image${img.substring(img.lastIndexOf(`.`))}`)
                  });
                }
              }
            }
            resolve();
          });
        }
      });

      stagesAsync.push({
        name: `Scheduled Task Loader`,
        tiers: [true, false, false],
        load: () => {
          return new Promise((resolve, reject) => {
            const tasks = fs.readdirSync(path.resolve(`./modules/tasks`));

            let i = 0;
            (function loadTask() {
              if (tasks[i].endsWith(`.js`)) {
                const task = require(path.resolve(`./modules/tasks/${tasks[i]}`));
                if ((bot.mode === 1 || bot.mode === 2) && !task.lite) {
                  log(`Unable to load task "${tasks[i]}" due to Lite mode.`, `warn`);
                } else
                if (task.repeat) {
                  bot.setInterval(() => {
                    task.fn();
                  }, (task.interval));
                } else {
                  bot.setTimeout(() => {
                    task.fn();
                  }, (task.time));

                  // todo: add support for scheduled tasks via database
                }

                if (i + 1 === tasks.length) {
                  resolve();
                } else {
                  i++;
                  loadTask();
                }
              } else {
                i++;
                loadTask();
              }
            })();
          });
        }
      });

      stagesAsync.push({
        name: `Unverified Donator Checker`,
        tiers: [true, false, false],
        load: () => {
          return new Promise((resolve, reject) => {
            bot.guilds.cache.get(bot.cfg.guilds.donator).members.fetch().then((mem) => {
              const members = [...mem.values()];

              let i = -1;
              (function nextMember() {
                i++;
                if (i >= members.length) return resolve();

                const member = members[i];

                if (member.roles.cache.size === 1) {
                  bot.util.verifyDonator(member).then(() => {
                    nextMember();
                  }).catch(err => {
                    bot.util.err(err);
                    nextMember();
                  });
                } else {
                  nextMember();
                }
              })();

            });
          });
        }
      });

      stagesAsync.push({
        name: `Message Pre-Cacher`,
        tiers: [true, false, false],
        load: () => {
          return new Promise((resolve, reject) => {
            const channels = [...bot.channels.cache.values()];

            log(`max channels: ${channels.length}`);

            // todo: add checks for pinned messages (#)

            let i = 0;
            (function loadMsgs() {
              const channel = channels[i];

              function next() {
                if (i + 1 >= channels.length) {
                  resolve();
                } else {
                  i++;
                  loadMsgs();
                }
              }

              if (channel.type === `text` && channel.guild.id === bot.mainGuild.id) {
                log(`[${i}] fetching from channel: ${channel.id}`);

                channel.messages.fetch({ limit: bot.cfg.init.cacheLimit }, true).then(() => {
                  next();
                }).catch(err => {
                  bot.util.err(err);
                  next();
                });
              } else {
                next();
              }
            })();
          });
        }
      });

      totals = stages.length + stagesAsync.length;

      let i = 0;
      (function loadStage() {

        log(`done/totals = ${done}/${totals}`);

        function afterStage() {
          log(`done/totals = ${done}/${totals}`);

          if (i + 1 >= stages.length) {
            assetsFinal();
          } else {
            i++;
            loadStage();
          }
        }

        log(`stages[i].tiers[tier] = ${stages[i].tiers[tier]}`);

        if (stages[i].tiers[tier]) {
          const stageStart = new Date().getTime();
          log(`Starting primary stage "${stages[i].name}"`, `info`);

          stages[i].load().then(() => {
            const stageTime = (new Date().getTime() - stageStart) / 333;
            log(`"${stages[i].name}" cleared in ${stageTime} second(s).`);

            done++;
            log(`Loading assets... ${Math.round((100 * done) / totals)}%`, `info`);

            afterStage();
          }).catch(err => {
            bot.util.err(err);

            done++;
            errors++;
            afterStage();
          });
        } else {
          log(`Skipping stage "${stages[i].name}"`);
          done++;
          skipped++;
          afterStage();
        }
      })();

      function assetsFinal() {
        log(`done/totals = ${done}/${totals}`);

        log(`Primary Assets loaded with ${errors} error(s)!`, `info`);
        log([
          `Primary Asset Loader finished.`,
          `Stages: ${stages.length}`,
          `Skipped: ${skipped}`,
          `Errors: ${errors}`
        ].join(`\n`));

        bot.pause = false;
        success(new Date().getTime() - timeStart);

        function stagesAsyncFinal() {
          log(`done/totals = ${done}/${totals}`);

          log(`Loading assets... ${Math.round((100 * done) / totals)}%`, `info`);
          if (done === totals) {
            log(`Secondary Assets loaded with ${errorsAsync} error(s)!`, `info`);
            log(`Encountered ${errors + errorsAsync} total error(s) during setup.`, `info`);
            log([
              `Secondary Asset Loader finished.`,
              `Stages: ${stagesAsync.length}`,
              `Skipped: ${skippedAsync}`,
              `Errors: ${errorsAsync}`,
              `Total Stages: ${totals}`,
              `Total Skipped: ${skipped + skippedAsync}`,
              `Total Errors: ${errors + errorsAsync}`
            ].join(`\n`));
          }
        }

        for (const stage of stagesAsync) {
          log(`stage.tiers[${tier}] = ${stage.tiers[tier]}`);

          if (stage.tiers[tier]) {
            const stageStart = new Date().getTime();

            log(`Starting secondary stage "${stage.name}"`, `info`);

            stage.load().then(() => {
              log(`done/totals = ${done}/${totals}`);

              const stageTime = (new Date().getTime() - stageStart) / 1000;
              log(`"${stage.name}" cleared in ${stageTime} second(s).`);

              done++;
              stagesAsyncFinal();
            }).catch(err => {
              bot.util.err(err);

              done++;
              errorsAsync++;
              stagesAsyncFinal();
            });
          } else {
            log(`Skipping async stage "${stage.name}"`);
            done++;
            skippedAsync++;
            stagesAsyncFinal();
          }
        }
      }
    });
  }

  static registerCommand(cmd) {
    return new Promise((resolve, reject) => {
      if (cmd.constructor === Command) {
        memory.assets.commands.push(cmd);
        resolve(cmd);
      } else {
        reject(new Error(`Attempted to register non-command object as a command.`));
      }
    });
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

  static getEmoji(query) {
    const bot = memory.core.client;
    const log = bot.log;

    let result;

    if (Number.isInteger(parseInt(query))) {
      result = bot.emojis.cache.get(query);
    } else {
      result = bot.emojis.cache.find(emoji => emoji.name.toLowerCase() === query.toLowerCase() && (emoji.guild.id === bot.cfg.guilds.optibot || bot.cfg.guilds.emoji.includes(emoji.guild.id)));
    }

    if (result) return result;
    return bot.emojis.cache.find(emoji => emoji.name.toLowerCase() === `ICO_default`.toLowerCase() && (emoji.guild.id === bot.cfg.guilds.optibot || bot.cfg.guilds.emoji.includes(emoji.guild.id)));
  }

  static getImage(query) {
    for (const i in memory.assets.images.index) {
      if (memory.assets.images.index[i].name.toLowerCase() === query.toLowerCase()) {
        return memory.assets.images.index[i];
      }
    }
    return memory.assets.images.default;
  }
};
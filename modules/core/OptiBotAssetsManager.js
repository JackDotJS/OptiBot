const fs = require('fs');
const util = require('util');
const djs = require('discord.js');
const path = require('path');

const Memory = require('./OptiBotMemory.js');
let Command = require('./OptiBotCommand.js');
let OptiBit = require('./OptiBotBit.js');

module.exports = class OptiBotAssetsManager {
  constructor() {
    throw new Error('Why are you doing this? (Cannot instantiate this class.)');
  }

  static load(tier = 0) {
    /**
         * type
         * 
         * 0 = everything
         * 1 = commands, optibits, utilities, and images
         * 2 = only images
         */

    const bot = Memory.core.client;
    const log = bot.log;
    let OBUtil = require('./OptiBotUtil.js');

    return new Promise((success, failure) => {
      log('Loading assets...', 'info');

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
        name: 'OptiFine GuildMembers Pre-cacher',
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
        name: 'OptiBot Class Reloader',
        tiers: [false, true, false],
        load: () => {
          return new Promise((resolve, reject) => {
            const ob = require('./OptiBot.js');

            delete require.cache[require.resolve('./OptiBotCommand.js')];
            delete require.cache[require.resolve('./OptiBotBit.js')];
            delete require.cache[require.resolve('./OptiBotProfile.js')];
            delete require.cache[require.resolve('./OptiBotLogEntry.js')];
            delete require.cache[require.resolve('./OptiBotRecordEntry.js')];
            delete require.cache[require.resolve('./OptiBotUtil.js')];

            ob.Command = require('./OptiBotCommand.js');
            Command = require('./OptiBotCommand.js');
            ob.OptiBit = require('./OptiBotBit.js');
            OptiBit = require('./OptiBotBit.js');
            ob.Profile = require('./OptiBotProfile.js');
            ob.LogEntry = require('./OptiBotLogEntry.js');
            ob.RecordEntry = require('./OptiBotRecordEntry.js');
            ob.OBUtil = require('./OptiBotUtil.js');
            OBUtil = require('./OptiBotUtil.js');

            resolve();
          });
        }
      });

      stages.push({
        name: 'Command Loader',
        tiers: [true, true, false],
        load: () => {
          return new Promise((resolve, reject) => {
            const commands = fs.readdirSync(path.resolve('./modules/cmd'));
            const registered = [];
            let clear = false;

            if (Memory.assets.commands.length > 0) {
              Memory.assets.commands = [];
              clear = true;
            }

            let i1 = 0;
            (function loadCmd() {
              const cmd = commands[i1];
              if (i1 + 1 > commands.length) {
                resolve();
              } else
              if (cmd.endsWith('.js')) {
                log(`processing: ${path.resolve(`./modules/cmd/${cmd}`)}`);

                if (clear) {
                  log(`cache delete: ${require.resolve(path.resolve(`./modules/cmd/${cmd}`))}`);
                  delete require.cache[require.resolve(path.resolve(`./modules/cmd/${cmd}`))];
                }

                try {
                  const newcmd = require(path.resolve(`./modules/cmd/${cmd}`));

                  if ((bot.mode === 1 || bot.mode === 2) && !newcmd.metadata.flags['LITE']) {
                    log(`Unable to load command "${newcmd.metadata.name}" due to Lite mode.`, 'warn');
                    i1++;
                    loadCmd();
                  }

                  if (newcmd.metadata.aliases.length > 0) {

                    // fucking ughhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh
                    // hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh
                    // hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh

                    let i2 = 0;
                    let i3 = 0;
                    let i4 = 0;
                    (function reglist() {
                      const register = registered[i2];
                      (function newAliases() {
                        const alias = newcmd.metadata.aliases[i3];

                        if (alias === register.cmd) {
                          log(new Error(`Failed to load command, conflicting names/aliases: "${alias}" (${newcmd.metadata.name}.js) === "${register.cmd}" (${register.cmd}.js)`).stack, 'error');
                          i1++;
                          loadCmd();
                        } else
                        if (register.aliases.length === 0) {
                          if (i3 + 1 >= newcmd.metadata.aliases.length) {
                            i3 = 0;
                            if (i2 + 1 >= registered.length) {
                              finalRegister();
                            } else {
                              i2++;
                              reglist();
                            }
                          } else {
                            i3++;
                            newAliases();
                          }
                        } else {
                          (function avsa() {
                            if (register.aliases[i4] === undefined) {
                              log(register.aliases);
                              log(i4);
                            }
                            if (alias === register.aliases[i4]) {
                              log(new Error(`Failed to load command, conflicting names/aliases: "${alias}" (${newcmd.metadata.name}.js) === "${register.aliases[i4]}" (${register.cmd}.js)`).stack, 'error');
                              i1++;
                              loadCmd();
                            }

                            if (i4 + 1 >= register.aliases.length) {
                              i4 = 0;
                              if (i3 + 1 >= newcmd.metadata.aliases.length) {
                                i3 = 0;
                                if (i2 + 1 >= registered.length) {
                                  finalRegister();
                                } else {
                                  i2++;
                                  reglist();
                                }
                              } else {
                                i3++;
                                newAliases();
                              }
                            } else {
                              i4++;
                              avsa();
                            }
                          })();
                        }
                      })();
                    })();
                  } else {
                    finalRegister();
                  }

                  // eslint-disable-next-line no-inner-declarations
                  function finalRegister() {
                    OptiBotAssetsManager.registerCommand(newcmd).then((reg) => {
                      log(`Command registered: ${reg.metadata.name}`, 'debug');
                      registered.push({
                        cmd: newcmd.metadata.name,
                        aliases: newcmd.metadata.aliases
                      });

                      i1++;
                      loadCmd();
                    }).catch(err => {
                      OBUtil.err(err);
                      i1++;
                      loadCmd();
                    });
                  }
                }
                catch (err) {
                  OBUtil.err(err);
                  i1++;
                  loadCmd();
                }
              } else {
                i1++;
                loadCmd();
              }
            })();
          });
        }
      });

      stages.push({
        name: 'Audit Log Pre-cacher',
        tiers: [true, false, false],
        load: () => {
          return new Promise((resolve, reject) => {
            bot.mainGuild.fetchAuditLogs({ limit: 10, type: 'MESSAGE_DELETE' }).then((audit) => {
              Memory.audit.log = [...audit.entries.values()];
              resolve();
            });
          });
        }
      });

      stagesAsync.push({
        name: 'Muted Member Pre-cacher',
        tiers: [true, false, false],
        load: () => {
          return new Promise((resolve, reject) => {
            Memory.db.profiles.find({ 'edata.mute': { $exists: true }, format: 3 }, (err, docs) => {
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
                        log(`Unmuting user ${profile.id} due to expired (or nearly expired) mute.`, 'info');
                        OBUtil.unmuter(profile.id).then(() => {
                          nextEntry();
                        }).catch(err => {
                          OBUtil.err(err);
                          nextEntry();
                        });
                      } else {
                        log(`Scheduling ${profile.id} for unmute today. (${(remaining / (1000 * 60))} hours from now)`, 'info');
                        Memory.mutes.push({
                          id: profile.id,
                          time: bot.setTimeout(() => {
                            OBUtil.unmuter(profile.id).catch(err => {
                              OBUtil.err(err);
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
        name: 'OptiBit Loader',
        tiers: [true, true, false],
        load: () => {
          return new Promise((resolve, reject) => {
            const optibits = fs.readdirSync(path.resolve('./modules/bits'));
            let clear = false;

            if (Memory.assets.optibits.length > 0) {
              Memory.assets.optibits = [];
              clear = true;
            }

            let i1 = 0;
            (function loadBit() {
              const bit = optibits[i1];
              if (i1 + 1 > optibits.length) {
                Memory.assets.optibits.sort((a, b) => a.metadata.priority - b.metadata.priority);
                log(Memory.assets.optibits);
                resolve();
              } else
              if (bit.endsWith('.js')) {
                log(`processing: ${path.resolve(`./modules/bits/${bit}`)}`);

                if (clear) {
                  log(`cache delete: ${require.resolve(path.resolve(`./modules/bits/${bit}`))}`);
                  delete require.cache[require.resolve(path.resolve(`./modules/bits/${bit}`))];
                }

                try {
                  const newbit = require(path.resolve(`./modules/bits/${bit}`));

                  if ((bot.mode === 1 || bot.mode === 2) && !newbit.metadata.flags['LITE']) {
                    log(`Unable to load OptiBit "${newbit.metadata.name}" due to Lite mode.`, 'warn');
                    i1++;
                    loadBit();
                  } else
                  if (newbit.constructor === OptiBit) {
                    Memory.assets.optibits.push(newbit);
                    log(`OptiBit registered: ${newbit.metadata.name}`, 'debug');
                    i1++;
                    loadBit();
                  } else {
                    OBUtil.err(new TypeError('Invalid OptiBit.'));
                    i1++;
                    loadBit();
                  }
                }
                catch (err) {
                  OBUtil.err(err);
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
        name: 'Image Loader',
        tiers: [true, true, true],
        load: () => {
          return new Promise((resolve, reject) => {
            Memory.assets.images.index = [];
            const images = fs.readdirSync(path.resolve('./assets/img'));

            for (const img of images) {
              if (img.match(/\./) !== null) {
                const buffer = fs.readFileSync(path.resolve(`./assets/img/${img}`));

                if (img.substring(0, img.lastIndexOf('.')) === 'default') {
                  Memory.assets.images.default = {
                    name: img.substring(0, img.lastIndexOf('.')),
                    buffer: buffer,
                    attachment: new djs.MessageAttachment(buffer, `image${img.substring(img.lastIndexOf('.'))}`)
                  };
                } else {
                  Memory.assets.images.index.push({
                    name: img.substring(0, img.lastIndexOf('.')),
                    buffer: buffer,
                    attachment: new djs.MessageAttachment(buffer, `image${img.substring(img.lastIndexOf('.'))}`)
                  });
                }
              }
            }
            resolve();
          });
        }
      });

      stagesAsync.push({
        name: 'Scheduled Task Loader',
        tiers: [true, false, false],
        load: () => {
          return new Promise((resolve, reject) => {
            const tasks = fs.readdirSync(path.resolve('./modules/tasks'));

            let i = 0;
            (function loadTask() {
              if (tasks[i].endsWith('.js')) {
                const task = require(path.resolve(`./modules/tasks/${tasks[i]}`));
                if ((bot.mode === 1 || bot.mode === 2) && !task.lite) {
                  log(`Unable to load task "${tasks[i]}" due to Lite mode.`, 'warn');
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
        name: 'Unverified Donator Checker',
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
                  OBUtil.verifyDonator(member).then(() => {
                    nextMember();
                  }).catch(err => {
                    OBUtil.err(err);
                    nextMember();
                  });
                }
              })();

            });
          });
        }
      });

      stagesAsync.push({
        name: 'Message Pre-Cacher',
        tiers: [true, false, false],
        load: () => {
          return new Promise((resolve, reject) => {
            const channels = [...bot.channels.cache.values()];

            log(`max channels: ${channels.length}`);

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

              if (channel.type === 'text' && channel.guild.id === bot.mainGuild.id) {
                log(`[${i}] fetching from channel: ${channel.id}`);

                channel.messages.fetch({ limit: bot.cfg.init.cacheLimit }, true).then(() => {
                  next();
                }).catch(err => {
                  OBUtil.err(err);
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
        function afterStage() {
          if (i + 1 === stages.length) {
            assetsFinal();
          } else {
            i++;
            loadStage();
          }
        }

        log(`stages[i].tiers[tier] = ${stages[i].tiers[tier]}`);

        if (stages[i].tiers[tier]) {
          const stageStart = new Date().getTime();
          log(`Starting stage "${stages[i].name}"`, 'info');

          stages[i].load().then(() => {
            const stageTime = (new Date().getTime() - stageStart) / 333;
            log(`"${stages[i].name}" cleared in ${stageTime} second(s).`, 'debug');

            done++;
            log(`Loading assets... ${Math.round((100 * done) / totals)}%`, 'info');

            afterStage();
          }).catch(err => {
            OBUtil.err(err);

            done++;
            errors++;
            afterStage();
          });
        } else {
          log(`Skipping stage "${stages[i].name}"`, 'debug');
          done++;
          skipped++;
          afterStage();
        }
      })();

      function assetsFinal() {
        log(`Primary Assets loaded with ${errors} error(s)!`, 'info');
        log([
          'Primary Asset Loader finished.',
          `Stages: ${stages.length}`,
          `Skipped: ${skipped}`,
          `Errors: ${errors}`
        ].join('\n'), 'debug');

        bot.pause = false;
        success(new Date().getTime() - timeStart);

        function stagesAsyncFinal() {
          log(`Loading assets... ${Math.round((100 * done) / totals)}%`, 'info');
          if (done === totals) {
            log(`Secondary Assets loaded with ${errorsAsync} error(s)!`, 'info');
            log(`Encountered ${errors + errorsAsync} total error(s) during setup.`, 'info');
            log([
              'Secondary Asset Loader finished.',
              `Stages: ${stagesAsync.length}`,
              `Skipped: ${skippedAsync}`,
              `Errors: ${errorsAsync}`,
              `Total Stages: ${totals}`,
              `Total Skipped: ${skipped + skippedAsync}`,
              `Total Errors: ${errors + errorsAsync}`
            ].join('\n'), 'debug');
          }
        }

        for (const stage of stagesAsync) {
          log(`stage.tiers[${tier}] = ${stage.tiers[tier]}`);

          if (stage.tiers[tier]) {
            const stageStart = new Date().getTime();

            stage.load().then(() => {
              const stageTime = (new Date().getTime() - stageStart) / 1000;
              log(`"${stage.name}" cleared in ${stageTime} second(s).`, 'debug');

              done++;
              stagesAsyncFinal();
            }).catch(err => {
              OBUtil.err(err);

              done++;
              errorsAsync++;
              stagesAsyncFinal();
            });
          } else {
            log(`Skipping async stage "${stage.name}"`, 'debug');
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
        Memory.assets.commands.push(cmd);
        resolve(cmd);
      } else {
        reject(new Error('Attempted to register non-command object as a command.'));
      }
    });
  }

  static fetchCommand(query) {
    const bot = Memory.core.client;
    const log = bot.log;

    return new Promise((resolve, reject) => {
      let i1 = 0;
      (function checkName() {
        if (query.toLowerCase() === Memory.assets.commands[i1].metadata.name) {
          resolve(Memory.assets.commands[i1]);
        } else
        if (Memory.assets.commands[i1].metadata.aliases.length > 0) {
          let i2 = 0;
          (function checkAliases() {
            if (query.toLowerCase() === Memory.assets.commands[i1].metadata.aliases[i2]) {
              resolve(Memory.assets.commands[i1]);
            } else
            if (i2 + 1 === Memory.assets.commands[i1].metadata.aliases.length) {
              if (i1 + 1 === Memory.assets.commands.length) {
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
        if (i1 + 1 === Memory.assets.commands.length) {
          resolve();
        } else {
          i1++;
          checkName();
        }
      })();
    });
  }

  static getEmoji(query) {
    const bot = Memory.core.client;
    const log = bot.log;

    let result;

    if (Number.isInteger(parseInt(query))) {
      result = bot.emojis.cache.get(query);
    } else {
      result = bot.emojis.cache.find(emoji => emoji.name.toLowerCase() === query.toLowerCase() && (emoji.guild.id === bot.cfg.guilds.optibot || bot.cfg.guilds.emoji.includes(emoji.guild.id)));
    }

    if (result) return result;
    return bot.emojis.cache.find(emoji => emoji.name.toLowerCase() === 'ICO_default'.toLowerCase() && (emoji.guild.id === bot.cfg.guilds.optibot || bot.cfg.guilds.emoji.includes(emoji.guild.id)));
  }

  static getImage(query) {
    for (const i in Memory.assets.images.index) {
      if (Memory.assets.images.index[i].name.toLowerCase() === query.toLowerCase()) {
        return Memory.assets.images.index[i];
      }
    }
    return Memory.assets.images.default;
  }
};
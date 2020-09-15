const Memory = require('../OptiBotMemory.js');
const util = require('util');

const bot = Memory.core.client;
const log = bot.log;

/**
     * Gets a user, member, or message based on various text-based shortcuts.
     *
     * @param {djs.Message} m Author message.
     * @param {Number} type Target type. 0 = Member. 1 = Message.
     * @param {String} target Input to parse.
     * @param {djs.GuildMember} member Author as an OptiFine guild member.
     * @returns {Promise<Object>}
     */
module.exports = (m, type, target, member) => {
  return new Promise((resolve, reject) => {
    log(`get target from ${target}`);
    log(`select type ${type}`);

    if (!target) {
      log('auto-target: self');
      target = 'me';
    }

    if (['previous', 'last', 'recent', 'prev'].includes(target.toLowerCase())) {
      log('last target');
      if (Memory.targets[m.author.id] !== undefined) {
        log('exists');
        if (type === 0) {
          target = Memory.targets[m.author.id].u;
        } else if (type === 1) {
          target = Memory.targets[m.author.id].m;
        }
      } else {
        log('does not exist');
      }
    }

    function remember(final) {
      const final_fixed = final;

      if (final) {
        if (final.type !== 'notfound') {
          const slot = Memory.targets[m.author.id];
          if (slot) {
            if (type === 0) slot.u = target;
            if (type === 1) slot.m = target;
          } else {
            Memory.targets[m.author.id] = {
              u: (type === 0) ? target : null,
              m: (type === 1) ? target : null
            };
          }
        }

        let userid = final.target; // ID only
        let username = userid;
        let mention = userid;

        if (final.type === 'user') {
          userid = final.target.id;
          username = final.target.tag;
          mention = final.target.toString();
        } else if (final.type === 'member') {
          userid = final.target.user.id;
          username = final.target.user.tag;
          mention = final.target.user.toString();
        }

        final_fixed.id = userid;
        final_fixed.tag = username;
        final_fixed.mention = mention;
      }

      log(util.inspect(final_fixed));

      resolve(final_fixed);
    }

    function checkServer(id) {
      bot.guilds.cache.get(bot.cfg.guilds.optifine).members.fetch({ user: id, cache: true }).then(mem => {
        if (type === 0) {
          remember({ type: 'member', target: mem });
        } else if (type === 1) {
          if (mem.lastMessage) {
            remember({ type: 'message', target: mem.lastMessage });
          } else {
            remember({ type: 'notfound', target: null });
          }
        }
      }).catch(err => {
        if (err.message.match(/invalid or uncached|unknown member|unknown user/i)) {
          if (type === 0) {
            bot.users.fetch(id).then(user => {
              remember({ type: 'user', target: user });
            }).catch(err => {
              if (err.message.match(/invalid or uncached|unknown member|unknown user/i)) {
                remember({ type: 'id', target: id });
              } else {
                reject(err);
              }
            });
          } else if (type === 1) {
            remember({ type: 'notfound', target: null });
          }
        } else {
          reject(err);
        }
      });
    }

    if (['self', 'myself', 'me'].includes(target.toLowerCase())) {
      log('self');
      if (type === 0) {
        remember({ type: 'member', target: member });
      } else if (type === 1) {
        if (member.lastMessage) {
          remember({ type: 'message', target: member.lastMessage });
        } else {
          remember({ type: 'notfound', target: null });
        }
      }
    } else if (['someone', 'somebody', 'random', 'something'].includes(target.toLowerCase())) {
      log('random');
      if (m.channel.type === 'dm') {
        if (type === 0) {
          remember({ type: 'member', target: member });
        } else if (type === 1) {
          if (member.lastMessage) {
            remember({ type: 'message', target: member.lastMessage });
          } else {
            remember({ type: 'notfound', target: null });
          }
        }
      } else if (type === 0) {
        let users = [];
        if (m.guild.id !== bot.cfg.guilds.optifine) {
          users = [...bot.guilds.cache.get(bot.cfg.guilds.optifine).members.cache.values()];
        } else {
          users = [...m.guild.members.cache.values()];
        }

        log(users.length);

        const someone = users[~~(Math.random() * users.length)];
        remember({ type: 'member', target: someone });
      } else if (type === 1) {
        const channels_unfiltered = [...bot.guilds.cache.get(bot.cfg.guilds.optifine).channels.cache.values()];
        const channels = [];
        const blacklist = bot.cfg.channels.mod.concat(bot.cfg.channels.blacklist);

        channels_unfiltered.forEach((channel) => {
          if (!blacklist.includes(channel.id) && !blacklist.includes(channel.parentID) && channel.type === 'text' && channel.messages.cache.size > 0) {
            channels.push(channel);
          }
        });

        if (channels.length === 0) {
          remember({ type: 'notfound', target: null });
        } else {
          let attempts = 0;
          (function roll() {
            attempts++;
            const fc = channels[~~(Math.random() * channels.length)];

            log(fc);

            const fm = [...fc.messages.cache.values()];
            const final_msg = fm[~~(Math.random() * fm.length)];

            if (final_msg.content.length !== 0) {
              remember({ type: 'message', target: final_msg });
            } else if (attempts === 3) {
              remember({ type: 'notfound', target: null });
            } else {
              roll();
            }
          })();
        }
      }
    } else if (target.match(/<@!?\d{13,}>/) !== null) {
      log('@mention');

      const id = target.match(/\d{13,}/)[0];

      if (Number.isInteger(parseInt(id)) && parseInt(id) >= 1420070400000) {
        checkServer(id);
      } else {
        remember();
      }
    } else if (target.match(/^\^{1,10}$/) !== null) {
      log('arrow shortcut');
      if (m.channel.type === 'dm') {
        remember({ type: 'notfound', target: null });
      } else {
        m.channel.messages.fetch({ limit: 25 }).then(msgs => {
          const itr = msgs.values();
          const skip_t = target.length - 1;
          let skipped = 0;

          log(`skip target: ${skip_t}`);

          (function search() {
            const thisID = itr.next();
            if (thisID.done) {
              remember({ type: 'notfound', target: null });
            } else if (![m.author.id, bot.user.id].includes(thisID.value.author.id) && !thisID.value.author.bot) {
              // valid msg
              log(`skip: ${skip_t} === ${skipped} (${skip_t === skipped})`);
              if (skip_t === skipped) {
                log(`message age: ${(m.createdTimestamp - thisID.value.createdTimestamp).toLocaleString()}ms`);
                if (thisID.value.createdTimestamp + 1000 > m.createdTimestamp) {
                  log('extremely recent message skipped', 'debug');
                  search();
                } else if (m.guild.id !== bot.cfg.guilds.optifine && type === 0) {
                  checkServer(thisID.value.member.id);
                } else {
                  if (type === 0) {
                    remember({ type: 'member', target: thisID.value.member });
                  } else if (type === 1) {
                    remember({ type: 'message', target: thisID.value });
                  }
                }
              } else {
                log(`valid skip ${skipped}`);
                skipped++;
                search();
              }
            } else {
              search();
            }
          })();
        }).catch(err => reject(err));
      }
    } else if (!isNaN(target) && parseInt(target) >= 1420070400000) {
      log('id');
      if (type === 0) {
        checkServer(target);
      } else if (type === 1) {
        remember();
      }
    } else if (target.match(/discordapp\.com|discord.com/i)) {
      log('url');
      // eslint-disable-next-line no-useless-escape
      const urls = m.content.match(/\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/gi);

      if (urls !== null) {
        const seg = urls[0].split(/(?<!\/)\/(?!\/)|(?<!\\)\\(?!\\)/g).reverse();

        log(seg.length);

        if (seg.length === 5 && !isNaN(parseInt(seg[0])) && !isNaN(parseInt(seg[1])) && !isNaN(parseInt(seg[2]))) {
          const rg = seg[2];
          const rc = seg[1];
          const rm = seg[0];

          bot.guilds.cache.get(rg).channels.cache.get(rc).messages.fetch(rm).then(msg => {
            if (type === 0) {
              remember({ type: 'member', target: msg.member });
            } else if (type === 1) {
              remember({ type: 'message', target: msg });
            }
          }).catch(err => {
            reject(err);
          });
        } else {
          remember({ type: 'notfound', target: null });
        }
      } else {
        log('invalid target');
        remember();
      }
    } else {
      log('invalid target');
      remember();
    }
  });
};
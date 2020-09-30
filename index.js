/**
 * OptiBot NX - Main Program
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Written by Kyle Edwards <wingedasterisk@gmail.com>, August 2020
 */

if (!process.send) throw new Error('Cannot run standalone. Please use the "init.bat" file.');

const cid = require('caller-id');
const util = require('util');
const djs = require('discord.js');
const timeago = require('timeago.js');
const ob = require('./modules/core/OptiBot.js');
const { readdirSync } = require('fs');

const log = (message, level, file, line) => {
  const call = cid.getData();
  if (!file) file = (call.evalFlag) ? 'eval()' : call.filePath.substring(call.filePath.lastIndexOf('\\') + 1);
  if (!line) line = call.lineNumber;

  try {
    process.send({
      type: 'log',
      message: message,
      level: level,
      misc: `${file}:${line}`
    });
  }
  catch (e) {
    try {
      process.send({
        type: 'log',
        message: util.inspect(message),
        level: level,
        misc: `${file}:${line}`
      });
    }
    catch (e2) {
      log(e);
      log(e2);
    }
  }


};

const bot = new ob.Client({
  //fetchAllMembers: true, // end my life
  presence: {
    status: 'idle',
    activity: {
      type: 'WATCHING',
      name: 'assets load 🔄'
    }
  },
  disableMentions: 'everyone'
}, parseInt(process.argv[2]), log);

ob.Memory.core.logfile = process.argv[3];

ob.OBUtil.setWindowTitle('Connecting...');

bot.login(bot.keys.discord).catch(err => {
  ob.OBUtil.setWindowTitle('Connection Failed.');
  log(err, 'fatal');
  process.exit(1);
});

// Load all of the bot events
const evtFiles = readdirSync('./events/');
log(`Loading a total of ${evtFiles.length} events.`);
evtFiles.forEach(async file => {
  const eventName = file.split('.')[0];
  const event = require(`./events/${file}`);
  bot.on(eventName, event.bind(null, bot));
  await log(`Loaded ${eventName} event`);
});

////////////////////////////////////////
// Node.js Parent Node Message
////////////////////////////////////////

process.on('message', (m) => {
  if (m.crashlog) {
    log('got crash data');
    bot.guilds.get(bot.cfg.guilds.log).channels.cache.get(bot.cfg.channels.log.misc)
      .send(`<@181214529340833792> **=== OptiBot Crash Recovery Report ===**`, new djs.MessageAttachment(`./logs/${m.crashlog}`))
      .catch(err => {
        ob.OBUtil.err(err);
      });
  } else if (m.restart) {
    log('got restart data');
    bot.guilds.cache.get(m.restart.guild).channels.cache.get(m.restart.channel).messages.fetch(m.restart.message).then(msg => {
      const embed = new djs.MessageEmbed()
        .setAuthor(`Restarted in ${((new Date().getTime() - msg.createdTimestamp) / 1000).toFixed(1)} seconds.`, ob.Assets.getEmoji('ICO_okay').url)
        .setColor(bot.cfg.embed.okay);

      msg.edit({ embed: embed }).then(msgF => {
        ob.OBUtil.afterSend(msgF, m.author);
      });
    }).catch(err => {
      ob.OBUtil.err(err);
    });
  }
});

////////////////////////////////////////
// Raw Packet Data
////////////////////////////////////////

bot.on('raw', packet => {
  const now = new Date();
  if (bot.pause) return;
  if (packet.t === 'MESSAGE_REACTION_ADD') {
    const channel = bot.channels.cache.get(packet.d.channel_id);
    if (channel.messages.cache.has(packet.d.message_id)) return; // stops if the message exists in the bot's cache.

    log(util.inspect(packet));

    channel.messages.fetch(packet.d.message_id, true).then(m => {
      const emoji = packet.d.emoji.id ? packet.d.emoji.id : packet.d.emoji.name;
      const reaction = m.reactions.cache.get(emoji);
      let user = bot.users.cache.get(packet.d.user_id);

      function s2() {
        log('old emoji detected');
        if (!reaction) {
          log(util.inspect(m.reactions.cache));
          log(`get ${emoji}`);
        } else {
          reaction.users.cache.set(packet.d.user_id, user);
          bot.emit('messageReactionAdd', reaction, user);
        }
      }

      if (!user || user.partial) {
        if (channel.guild !== null && channel.guild !== undefined && channel.type === 'text') {
          log('fetch manual');
          channel.guild.members.fetch({ user: packet.d.user_id }).then(mem => {
            user = mem.user;
            s2();
          });
        } else {
          return;
        }
      } else {
        s2();
      }
    }).catch(err => {
      ob.OBUtil.err(err);
    });
  } else if (packet.t === 'MESSAGE_DELETE') {
    // this packet does not contain the actual message data, unfortunately.
    // as of writing, this only contains the message ID, the channel ID, and the guild ID.
    bot.setTimeout(() => {
      if (ob.Memory.rdel.includes(packet.d.id)) return; // stops if the message exists in the bot's cache.
      if (packet.d.guild_id !== bot.cfg.guilds.optifine) return;
      if (bot.cfg.channels.nolog.includes(packet.d.channel_id)) return;

      const logEntry = new ob.LogEntry({ time: now, channel: 'delete', embed: false });

      ob.Memory.db.msg.remove({ message: packet.d.id }, {}, (err, num) => {
        if (err) {
          logEntry.error(err);
        } else if (num > 0) {
          log('Bot message deleted natively.');
        }
      });

      const mt = djs.SnowflakeUtil.deconstruct(packet.d.id).date;

      const desc = [
        `Message originally posted on ${mt.toUTCString()}`,
        `(${timeago.format(mt)})`
      ];

      logEntry.setColor(bot.cfg.embed.error)
        .setIcon(ob.Assets.getEmoji('ICO_trash').url)
        .setTitle('(Uncached) Message Deleted', 'Uncached Message Deletion Report')
        .setDescription(desc.join('\n'), desc.join(' '))
        .addSection('Message Location', `${bot.channels.cache.get(packet.d.channel_id).toString()} | [Direct URL](https://discordapp.com/channels/${packet.d.guild_id}/${packet.d.channel_id}/${packet.d.id}) (deleted)`)
        .submit();
    }, 100);
  }
});

////////////////////////////////////////
// Message Reaction Add
////////////////////////////////////////

bot.on('messageReactionAdd', (mr, user) => {
  const now = new Date();
  if (bot.pause) return;
  if (mr.message.channel.type === 'dm') return;
  if (user.id === bot.user.id) return;

  const isOptiFine = (mr.message.guild.id === bot.cfg.guilds.optifine);

  if (mr.emoji.id === bot.cfg.emoji.deleter) {
    const del = (docs, mod, orguser) => {
      if (mr.message.content.indexOf(bot.cfg.messages.confirmDelete) > -1) {
        const logEntry = new ob.LogEntry({ time: now, channel: 'delete' });

        if (isOptiFine) logEntry.preLoad();

        mr.message.delete().then((bm) => {
          ob.Memory.db.msg.remove(docs[0], {}, (err) => {
            if (err) {
              if (isOptiFine) logEntry.error(err);
              else ob.OBUtil.err(err);
            } else {
              const desc = [
                `Message originally posted on ${bm.createdAt.toUTCString()}`,
                `(${timeago.format(bm.createdAt)})`
              ];

              logEntry.setColor(bot.cfg.embed.error)
                .setIcon(ob.Assets.getEmoji('ICO_trash').url)
                .setTitle('OptiBot Message Deleted', 'OptiBot Message Deletion Report')
                .setDescription(desc.join('\n'), desc.join(' '))
                .addSection('Deleted by', user);

              if (mod) {
                if (orguser) {
                  logEntry.addSection('Original Author', orguser);
                } else {
                  logEntry.addSection('Original Author', 'Unknown.');
                }
              }

              logEntry.addSection('Message Location', bm);

              if (bm.content.length > 0 && bm.content !== '_ _' && bm.content !== bot.cfg.messages.confirmDelete) {
                logEntry.addSection('Message Contents', bm.content);
              }

              const att = [];
              const att_raw = [];
              if (bm.attachments.size > 0) {
                bm.attachments.each(a => {
                  att.push(`[${a.name || a.url.match(/[^\/]+$/)}](${a.url})`); // eslint-disable-line no-useless-escape
                  att_raw.push(`${a.name || a.url.match(/[^\/]+$/)} (${a.url})`); // eslint-disable-line no-useless-escape
                });
              }

              if (att.length > 0) {
                logEntry.addSection('Message Attachments', {
                  data: att.join('\n'),
                  raw: att_raw.join('\n')
                });
              }

              if (bm.embeds.length > 0) {
                let rawEmbeds = [];

                for (let i = 0; i < bm.embeds.length; i++) {
                  rawEmbeds.push(util.inspect(bm.embeds[i], { showHidden: true, getters: true }));
                  if (i + 1 < bm.embeds.length) {
                    rawEmbeds.push('');
                  } else {
                    rawEmbeds = rawEmbeds.join('\n');
                  }
                }

                logEntry.addSection('Message Embeds', {
                  data: `[${bm.embeds.length} Embed${(bm.embeds.length > 1) ? 's' : ''}]`,
                  raw: rawEmbeds
                });
              }

              if (isOptiFine) logEntry.submit();
            }
          });
        }).catch(err => {
          if (isOptiFine) logEntry.error(err);
          else ob.OBUtil.err(err);
        });
      } else {
        let nm = `${mr.message.content}\n\n${bot.cfg.messages.confirmDelete}`;
        if (nm.length === 2000 /* incredibly unlikely, but better safe than sorry */ || mr.message.content.length === 0 || mr.message.content === '_ _') {
          nm = bot.cfg.messages.confirmDelete;
        }

        mr.message.edit(nm).catch(err => {
          ob.OBUtil.err(err);
        });
      }
    };

    ob.Memory.db.msg.find({ message: mr.message.id }, (err, docs) => {
      if (err) {
        ob.OBUtil.err(err);
      } else if (docs[0] && docs[0].user === user.id) {
        del(docs);
      } else {
        const mem = bot.mainGuild.members.cache.get(user.id);
        if (mem && mem.roles.cache.has(bot.cfg.roles.moderator)) {
          if (docs[0]) {
            const org = bot.mainGuild.members.cache.get(docs[0].user);

            if (!org) {
              bot.users.fetch(docs[0].user).then((org) => {
                del(docs, true, org);
              });
            } else {
              del(docs, true, org);
            }
          } else {
            del(docs, true);
          }
        }
      }
    });
  }
});

////////////////////////////////////////
// Ratelimit
////////////////////////////////////////

bot.on('rateLimit', rl => {
  const rlInfo = [
    `Timeout: ${rl.timeout}`,
    `Request Limit: ${rl.limit}`,
    `HTTP Method: ${rl.method}`,
    `Path: ${rl.path}`,
    `Route: ${rl.route}`
  ].join('\n');

  log('OptiBot is being ratelimited! \n' + rlInfo, 'warn');
});

////////////////////////////////////////
// Server Outage
////////////////////////////////////////

bot.on('guildUnavailable', (guild) => {
  log(`Guild Unavailable! \nUnable to connect to "${guild.name}" \nGuild ID: ${guild.id}`, 'warn');
});

////////////////////////////////////////
// Guild Updated
////////////////////////////////////////

bot.on('guildUpdate', (oldg, newg) => {
  if (oldg.available === false && newg.available === true) {
    log(`Guild available! \n"${newg.name}" has recovered. \nGuild ID: ${newg.id}`, 'warn');
    if (newg.id === bot.cfg.guilds.optifine) {
      ob.Memory.core.bootFunc();
    }
  }
});

////////////////////////////////////////
// Shard Ready
////////////////////////////////////////

bot.on('shardReady', (id, guilds) => {
  log(`Shard WebSocket ready. \nShard ID: ${id} \nUnavailable Guilds: ${(guilds) ? '\n' + [...guilds].join('\n') : 'None.'}`, 'info');
  log(util.inspect(bot.ws));
  ob.OBUtil.setWindowTitle();
  ob.Memory.presenceRetry = 0;
});

////////////////////////////////////////
// Shard Disconnect
////////////////////////////////////////

bot.on('shardDisconnect', (event, id) => {
  log(`Shard WebSocket disconnected. \nShard ID: ${id} \nEvent Code: ${event.code} (${getCodeName(event.code)})`, 'warn');
  ob.OBUtil.setWindowTitle();
});

function getCodeName(code) {
  if (code >= 0 && code <= 999) {
    return 'Reserved';
  } else if (code === 1000) {
    return 'Normal Closure';
  } else if (code === 1001) {
    return 'Going Away';
  } else if (code === 1002) {
    return 'Protocol Error';
  } else if (code === 1003) {
    return 'Unsupported Data';
  } else if (code === 1004) {
    return 'Reserved';
  } else if (code === 1005) {
    return 'No Status Received';
  } else if (code === 1006) {
    return 'Abnormal Closure';
  } else if (code === 1007) {
    return 'Invalid Frame Payload Data';
  } else if (code === 1008) {
    return 'Policy Violation';
  } else if (code === 1009) {
    return 'Message Too Big';
  } else if (code === 1010) {
    return 'Missing Extension';
  } else if (code === 1011) {
    return 'Internal Error';
  } else if (code === 1012) {
    return 'Service Restart';
  } else if (code === 1013) {
    return 'Try Again Later';
  } else if (code === 1014) {
    return 'Bad Gateway';
  } else if (code === 1015) {
    return 'TLS Handshake';
  } else if (code >= 1016 && code <= 3999) {
    return 'Reserved';
  } else if (code === 4000) {
    return 'DISCORD: Unknown Error';
  } else if (code === 4001) {
    return 'DISCORD: Unknown Opcode';
  } else if (code === 4002) {
    return 'DISCORD: Decode Error';
  } else if (code === 4003) {
    return 'DISCORD: Not Authenticated';
  } else if (code === 4004) {
    return 'DISCORD: Authentication Failed';
  } else if (code === 4005) {
    return 'DISCORD: Already Authenticated';
    // there is no code 4006 for some reason https://discordapp.com/developers/docs/topics/opcodes-and-status-codes
  } else if (code === 4007) {
    return 'DISCORD: Invalid Sequence';
  } else if (code === 4008) {
    return 'DISCORD: Rate Limited';
  } else if (code === 4009) {
    return 'DISCORD: Session Timed Out';
  } else if (code === 4010) {
    return 'DISCORD: Invalid Shard';
  } else if (code === 4011) {
    return 'DISCORD: Sharding Required';
  } else if (code === 4012) {
    return 'DISCORD: Invalid API Version';
  } else if (code === 4013) {
    return 'DISCORD: Invalid Intent';
  } else if (code === 4014) {
    return 'DISCORD: Disallowed Intent';
  } else {
    return 'Unknown';
  }
}

////////////////////////////////////////
// Shard Reconnecting
////////////////////////////////////////

bot.on('shardReconnecting', id => {
  log(`Shard WebSocket reconnecting... \nShard ID: ${id}`, 'warn');
  log(util.inspect(bot.ws));
  ob.OBUtil.setWindowTitle();
});

////////////////////////////////////////
// Shard Resume
////////////////////////////////////////

bot.on('shardResume', (id, replayed) => {
  log(`Shard WebSocket resumed. \nShard ID: ${id} \nEvents replayed: ${replayed}`, 'info');
  log(util.inspect(bot.ws));
  ob.OBUtil.setWindowTitle();
  ob.Memory.presenceRetry = 0;
});

////////////////////////////////////////
// Shard Error
////////////////////////////////////////

bot.on('shardError', (err, id) => {
  log(`Shard WebSocket connection error. \nShard ID: ${id} \nStack: ${err.stack || err}`, 'error');
  log(util.inspect(bot.ws));
  ob.OBUtil.setWindowTitle();
});

////////////////////////////////////////
// Client Session Invalidated
////////////////////////////////////////

bot.on('invalidated', () => {
  log('Session Invalidated.', 'fatal');
  ob.OBUtil.setWindowTitle('Session invalidated.');
  process.exit(1);
});

////////////////////////////////////////
// Client Warning
////////////////////////////////////////

bot.on('warn', info => {
  log(info, 'warn');
});

////////////////////////////////////////
// Client Debug
////////////////////////////////////////

bot.on('debug', info => {
  log(info, 'debug');
});

////////////////////////////////////////
// Client Error
////////////////////////////////////////

bot.on('error', err => {
  log(err.stack || err, 'error');
});

////////////////////////////////////////
// Guild Member Chunk Received
////////////////////////////////////////

bot.on('guildMembersChunk', (members, guild) => {
  log(`Guild member chunk received. \nSize: ${members.size}\nGuild: ${guild.name} (${guild.id})`, 'debug');
});
/* If you find horrible code, don't be surprised.
 * I'm pretty good at doing that, sometimes.
 * -Kyle
 *
 * Index:
 * PARSE BOOT ARGUMENTS - LINE 17
 * DEPENDENCIES - LINE 30
 * CONFIGURATION FILES - LINE 44
 * INITIALIZE - LINE 53
 * MAIN APPLICATION, EVENT HANDLERS - LINE 79
 * COMMAND HANDLERS & OTHER FUNCTIONS - LINE 266
 */


////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
// PARSE BOOT ARGUMENTS
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

var debugMode = false;
if (process.argv[2] === 'debug') {
  console.warn('OPTIBOT RUNNING IN DEBUG MODE');
  debugMode = true;
}

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
// DEPENDENCIES
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

const discord = require('discord.js');
const request = require('request');
const jimp = require('jimp');
const fs = require('fs');
const ed = require('./edwards_logger.js');


////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
// CONFIGURATION FILES
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

const cfg = require('./app/config.json');
const pkg = require('./package.json');

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
// INITIALIZE
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

let logLevel = (debugMode) ? 6 : 4;
const log = new ed.Logger({directory: './logs', logLevel: logLevel});
const bot = new discord.Client({autoReconnect: true}); // docs don't say this is an option, but im leaving it just to be safe. may remove later

log.w("Connecting to websocket...");
bot.login(cfg.api.discord);

var cooldownCounter = 0;
var cooldownActive = false;
bot.setInterval(() => {
  if(cooldownCounter-100 >= 0) cooldownCounter -= 100;
}, 500);

var shuttingdown = false;

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
// MAIN APPLICATION, EVENT HANDLERS
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////
// READY EVENT
////////////////////////////////////////

bot.on('ready', () => {
  log.w("Logged into Discord API as "+bot.user.username+"#"+bot.user.discriminator+" with token: "+cfg.api.discord, 'debug');
  log.w("OptiBot v"+pkg.version+" - Ready to work! \nCreated by Kyle Edwards, 2018", 'warn');

  var serverList = [];
  var guilds = bot.guilds.array();
  for(i=0; i < bot.guilds.size; i++) {
    serverList.push(guilds[i].name);
  }
  log.w("Currently connected to "+bot.guilds.size+" active servers. \n("+serverList.toString().replace(/,(?=[^\s])/g, ", ")+")");

  activityHandler('startup');
});

////////////////////////////////////////
// NEW SERVER EVENT
////////////////////////////////////////

bot.on('guildCreate', guild => {
  log.w('Connected to server "'+guild.name+'"', 'warn');
});

////////////////////////////////////////
// SERVER REMOVED EVENT
////////////////////////////////////////

bot.on('guildDelete', guild => {
  log.w('Removed from server "'+guild.name+'"', 'warn');
});

////////////////////////////////////////
// MESSAGE DELETED EVENT
////////////////////////////////////////

bot.on('messageDelete', m => {
  if (cfg.log.enabled) {
    if(m.author.system || m.author.bot) return;
    if(m.channel.id === cfg.log.channel) return;
    // todo: append links to any attachments in the message

    var time = m.createdAt;
    timestamp = ('0' + (time.getMonth()+1)).slice(-2) + '-' + ('0' + time.getDate()).slice(-2) + '-' + time.getFullYear() + ' at ' + ('0' + time.getHours()).slice(-2) + ':' + ('0' + time.getMinutes()).slice(-2) + ':' + ('0' + time.getSeconds()).slice(-2);

    log.w(`Recorded message deletion at ${new Date()}\nPosted by ${m.author.username}#${m.author.discriminator} on ${timestamp} \nContents: ${m.content}`, 'warn');

    bot.guilds.get(cfg.log.server).channels.get(cfg.log.channel).send({embed: new discord.RichEmbed()
      .setColor(cfg.embeds.default)
      .setTitle(`🗑️ **MESSAGE DELETED LOG**`)
      .addField(`Posted by ${m.author.username}#${m.author.discriminator} on ${timestamp}`, m.content)
      .setTimestamp()
    });
  }
});

////////////////////////////////////////
// MESSAGE EDITED EVENT
////////////////////////////////////////

bot.on('messageUpdate', m => {
  if (cfg.log.enabled) {
    // todo
    // ✏️ **MESSAGE EDIT LOG**
  }
});

////////////////////////////////////////
// RATELIMIT EVENT
////////////////////////////////////////

bot.on('ratelimit', rl => {
  log.w("Bot is being ratelimited!", 'warn');
});

////////////////////////////////////////
// NEW MESSAGE EVENT
////////////////////////////////////////

bot.on('message', m => {
  // Stop if this message was posted by the system or another bot.
  if(m.author.system || m.author.bot) return;
  if(m.channel.type === 'dm') {
    m.channel.send("Please use the OptiFine discord server to use this bot! \nhttps://discord.gg/tKxWtyf");
    return;
  }

  // Stop if bot is in the process of shutting down/restarting.
  if(shuttingdown) return;

  // Stop if channel is on blacklist.
  if(cfg.channels.blacklist.indexOf(m.channel.id) > -1) return;

  // extreme debugging, logs all message data on trace level.
  log.w(m, 'trace');

  // Check message for references to GitHub issues/pull requests.
  if(!m.content.trim().startsWith(cfg.trigger) && m.content.indexOf("#") > -1){
    if (debugMode) {
      if(m.member.permissions.has("KICK_MEMBERS", true)) {
        issueRefHandler(m);
      }
    } else {
      issueRefHandler(m);
    }
  }

  // Stop if message does not start with the command trigger.
  if(!m.content.trim().startsWith(cfg.trigger)) return;

  // Stop if bot is in debug mode, and the user is NOT a moderator or admin.
  if(debugMode && (!m.member.permissions.has("KICK_MEMBERS", true)) && m.author.id !== '271760054691037184') return;

  // Modify message to be usable by code.
  let input = m.content.trim().split("\n", 1)[0];
  let cmd = input.toLowerCase().split(" ")[0].substr(1);
  let args1 = input.split(" ").slice(1);
  let args = args1.filter(function (e) {
    return e.length != 0;
  });

  // Prevent spam
  var commands = ['help', 'docs', 'cape', 'shaders', 'mcwiki', 'lab', 'status', 'donate', 'about', 'offtopic', 'goodboy', 'role', 'rmrole'];
  var coolwarn = ["", ""];
  if(cooldownActive) coolwarn = ["[COOLDOWN] ", 'warn'];
  if(commands.indexOf(cmd) > -1 && (!m.member.permissions.has("KICK_MEMBERS", true))) {
    cooldownHandler(m);
  }

  // BEGIN COMMANDS
  log.w(coolwarn[0]+m.author.username+"#"+m.author.discriminator+": "+m.content, coolwarn[1]);

  // Prevent spam pt2
  if(cooldownActive && (!m.member.permissions.has("KICK_MEMBERS", true))) return;

  // main commands
  if(cmd === "help") helpCommandHandler(m, args);
  else if(cmd === "docs") docsCommandHandler(m, args);
  else if(cmd === "cape") capeCommandHandler(m, args);
  else if(cmd === "shaders") shaderwikiCommandHandler(m);
  else if(cmd === "mcwiki") mcwikiCommandHandler(m, args);
  else if(cmd === "lab") shaderlabCommandHandler(m);
  else if(cmd === "status") statusCommandHandler(m, args);
  else if(cmd === "donate") donateCommandHandler(m);
  else if(cmd === "about") aboutCommandHandler(m);
  // fun commands
  else if(cmd === "offtopic") offtopicCommandHandler(m, args);
  else if(cmd === "goodboy") goodboyCommandHandler(m, args);
  // mod commands
  else if(cmd === "role") roleCommandHandler(m, args);
  else if(cmd === "rmrole") rmroleCommandHandler(m, args);
  else if(cmd === "stop") stopCommandHandler(m, args);
  else if(cmd === "restart") restartCommandHandler(m);
  //else if(cmd === "purge") purgeCommandHandler(m, args);
  // dev commands
  else if(cmd === "ping") pingCommandHandler(m);
  else if(cmd === "roleid") roleidCommandHandler(m);
  else if(cmd === "error") errorCommandHandler(m, args);
  else if(cmd === "exec") execCommandHandler(m);

});

////////////////////////////////////////
// WEBSOCKET DISCONNECT EVENT
////////////////////////////////////////

bot.on('disconnect', event => {
  log.w("Disconnected from websocket. Event code "+event.code, 'fatal');
});

////////////////////////////////////////
// WEBSOCKET RECONNECTING EVENT
////////////////////////////////////////

bot.on('reconnecting', () => {
  log.w('Attempting to reconnect to websocket...', 'warn');
});

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
// COMMAND HANDLERS & OTHER FUNCTIONS
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

function pingCommandHandler(m) {
  if(m.member.permissions.has("KICK_MEMBERS", true)) {
    m.channel.send(Math.round(bot.ping)+"ms")
  }
}

function execCommandHandler(m) {
  if(m.author.id === '181214529340833792') {
    try {
      m.channel.send("```javascript\n"+eval(m.content.substring(5))+"```");
    }
    catch(err) {
      errorHandler(m, err, true);
    }
  }
}

/*function purgeCommandHandler(m, args) {
  if(m.member.permissions.has("KICK_MEMBERS", true)) {
    if(!args[0]) {
      m.channel.send("Please specify the amount of messages to delete.");
    } else
    if(isNaN(parseInt(args[0]))) {
      m.channel.send("Please use numbers only.");
    } else {
      fs.readFile('./app/images/opti_warn.png', (err, data) => {
        if(err) {
          errorHandler(m, err);
        } else {
          var embed = new discord.RichEmbed()
            .setColor(cfg.embeds.default)
            .attachFile(new discord.Attachment(data, "warn.png"))
            .setAuthor('WARNING', 'attachment://warn.png')
            .setDescription("You are about to **permanently** delete "+args[0]+" messages in this channel. Are you sure you want to continue?")
            .setFooter("This will automatically cancel in approximately 15 seconds.");

          m.channel.send({embed: embed}).then(mc => {
            mc.react('❌').then(() => {
              mc.react('✅').catch(err => log.w(err, 'error'))
            })
            .catch(err => log.w(err, 'error'))


            var reactFilter_cancel = (reaction, user) => reaction.emoji.name === '❌' && user.id === m.author.id;
            var collector_cancel = mc.createReactionCollector(reactFilter_cancel, {time: 10000});
            cachedMsgs.push({guild: mc.guild.id, channel: mc.channel.id, m: mc.id, emoji: '❌'});
            cachedMsgs.push({guild: mc.guild.id, channel: mc.channel.id, m: mc.id, emoji: '✅'});
            log.w('added message to cache', 'debug');
            collector_cancel.on('collect', r => {
              if (!shuttingdown) {
                mc.delete();
                cachedMsgs.splice(cachedMsgs.indexOf({guild: mc.guild.id, channel: mc.channel.id, m: mc.id, emoji: '❌'}));
                cachedMsgs.splice(cachedMsgs.indexOf({guild: mc.guild.id, channel: mc.channel.id, m: mc.id, emoji: '✅'}));
                log.w('removed message from cache', 'debug');
              }
            });
            collector_cancel.on('end', r => {
              if(!mc.deleted && !shuttingdown) {
                mc.delete();
                cachedMsgs.splice(cachedMsgs.indexOf({guild: mc.guild.id, channel: mc.channel.id, m: mc.id, emoji: '❌'}));
                cachedMsgs.splice(cachedMsgs.indexOf({guild: mc.guild.id, channel: mc.channel.id, m: mc.id, emoji: '✅'}));
                log.w('removed message from cache', 'debug');
              }
            });


            var reactFilter_confirm = (reaction, user) => reaction.emoji.name === '✅' && user.id === m.author.id;
            var collector_confirm = mc.createReactionCollector(reactFilter_confirm, {time: 10000});

            log.w('added message to cache', 'debug');
            collector_confirm.on('collect', r => {
              if (!shuttingdown) {
                var realAmount = parseInt(args)+2;
                if(m.deleted) {
                  realAmount = parseInt(args)+1;
                }
                cachedMsgs.splice(cachedMsgs.indexOf({guild: mc.guild.id, channel: mc.channel.id, m: mc.id, emoji: '❌'}));
                cachedMsgs.splice(cachedMsgs.indexOf({guild: mc.guild.id, channel: mc.channel.id, m: mc.id, emoji: '✅'}));
                m.channel.bulkDelete(realAmount)
                .then(ms => {
                  m.channel.send('Successfully purged '+args[0]+' messages.').then(mc => {deletable(m, mc)});
                })
                .catch(err => errorHandler(m, err));


                log.w('removed message from cache', 'debug');
              }
            });
          } );
        }
      });
    }
  }
}*/

function docsCommandHandler(m, args) {
  work(m, true);
  fs.readFile('./app/images/opti_docs.png', (err_f, data_img) => {
    if(err_f) {
      errorHandler(m, err_f)
    } else {
      var embed = new discord.RichEmbed()
        .setColor(cfg.embeds.default)
        .attachFile(new discord.Attachment(data_img, "docs.png"))
        .setAuthor('OptiFine Documentation', 'attachment://docs.png');

      if(!args[0]){
        work(m, false);
        m.channel.send({embed: embed
          .addField("Main Directory", "https://github.com/sp614x/optifine/tree/master/OptiFineDoc/doc")
        });
      } else {
        ////////////////////////////////////////////////////////////////////////
        // todo
        ////////////////////////////////////////////////////////////////////////
        /*if (args[0].toLowerCase() === 'list') {
          request({url:'https://api.github.com/repos/sp614x/optifine/contents/OptiFineDoc/doc?ref=master', headers: {'User-Agent': 'optibot'}}, (err, res, body) => {

            var data = JSON.parse(body);
            var listGen = new Promise(function(resolve, reject) {
              var list = "";
              for(var item in data) {
                if(data[parseInt(item)]['type'] !== 'dir') {
                  list += data[item]['name']+"\n";
                }

                if(parseInt(item)+1 === data.length) {
                  resolve(list);
                }
              }
            });

            listGen.then(files => {
              work(m, false);
              m.channel.send({embed: embed
                .addField("Main Directory", files)
              });
            }).catch(errlist => {
              if(errlist) {
                errorHandler(m, errlist);
              }
            });
          });
        } else*/
        if (args[0].endsWith('.png')) {
          log.w('requesting data from GitHub API: https://api.github.com/repos/sp614x/optifine/contents/OptiFineDoc/doc/images?ref=master');
          request({url: 'https://api.github.com/repos/sp614x/optifine/contents/OptiFineDoc/doc/images?ref=master', headers: {'User-Agent': 'optibot'}}, (err, res, body) => {
            if(err) {
              errorHandler(m, err);
            } else
            if(!res) {
              errorHandler(m, new Error('No response from GitHub API'));
            } else {
              var data = JSON.parse(body);
              for(var ref in data){
                log.w(args[0])
                log.w(data[ref]["name"])
                if (args[0] === data[ref]["name"]) {
                  // found a match
                  var finalOutput = data[ref]["html_url"];
                  var title = data[ref]["name"];
                  work(m, false);
                  m.channel.send({embed: embed
                    .addField(title, finalOutput)
                    .setImage(data[ref]["download_url"])
                  });
                  break;
                } else
                if (parseInt(ref)+1 === data.length) {
                  // we aint found shit
                  work(m, false);
                  m.channel.send({embed: embed
                    .setDescription("Error: Couldn't find that file.")
                    .addField("Main Directory", "https://github.com/sp614x/optifine/tree/master/OptiFineDoc/doc")
                  });
                }
              }
            }
          });
        } else {
          log.w('requesting data from GitHub API: https://api.github.com/repos/sp614x/optifine/contents/OptiFineDoc/doc?ref=master');
          request({url: 'https://api.github.com/repos/sp614x/optifine/contents/OptiFineDoc/doc?ref=master', headers: {'User-Agent': 'optibot'}}, (err, res, body) => {
            if(err) {
              errorHandler(m, err);
            } else
            if(!res) {
              errorHandler(m, new Error('No response from GitHub API'));
            } else {
              var data = JSON.parse(body);
              for(var ref in data){
                if (args[0] === data[ref]["name"]) {
                  // found a match
                  var finalOutput = data[ref]["html_url"];
                  var title = data[ref]["name"];
                  //if (/^\d+$/.test(args[1])) {
                  if (!isNaN(parseInt(args[1]))) {
                    title += " - Line "+args[1];
                    finalOutput += "#L"+args[1];
                    log.w('requesting data from GitHub API: https://raw.githubusercontent.com/sp614x/optifine/master/OptiFineDoc/doc/'+data[ref]["name"]);
                    request({url: 'https://raw.githubusercontent.com/sp614x/optifine/master/OptiFineDoc/doc/'+data[ref]["name"], headers: {'User-Agent': 'optibot'}}, (err2, res2, body2) => {
                      if(err2) {
                        errorHandler(m, err2);
                      } else
                      if(!res) {
                        errorHandler(m, new Error('No response from GitHub API'));
                      } else {
                        /*
                        // This embeds the surrounding lines. Currently disabled because it looks super messy thanks to Discord's tiny embeds. Might come back to this idea another time.
                        var lines = body2.split(/\r\n|\r|\n/g);
                        var target = parseInt(args[1])-1;
                        var codeblock = ">"+lines[target]+"\n "+lines[target+1]+"\n "+lines[target+2];
                        */


                        var codeblock = body2.split(/\r\n|\r|\n/g)[parseInt(args[1])-1];

                        var filetype = data[ref]["name"].substring(data[ref]["name"].indexOf('.')+1, data[ref]["name"].length);



                        work(m, false);
                        m.channel.send({embed: embed
                          .addField(title+"\n"+finalOutput, "_ _\n```"+filetype+"\n"+codeblock+"```")
                        });
                      }
                    });
                  } else {
                    work(m, false);
                    m.channel.send({embed: embed
                      .addField(title, finalOutput)
                    });
                  }
                  break;
                } else
                if (parseInt(ref)+1 === data.length) {
                  // we aint found shit
                  work(m, false);
                  m.channel.send({embed: embed
                    .setDescription("Error: Couldn't find that file."/* You can find valid files by typing `!docs list` or by going here:"*/)
                    .addField("Main Directory", "https://github.com/sp614x/optifine/tree/master/OptiFineDoc/doc")
                  });
                }
              }
            }
          });
        }
      }
    }
  });
}

function donateCommandHandler(m) {
  fs.readFile('./app/images/opti_donate.png', (err, data) => {
    var embed = new discord.RichEmbed()
      .setColor(cfg.embeds.default)
      .attachFile(new discord.Attachment(data, 'donate.png'))
      .setDescription("You can support OptiFine's development here:\nhttps://optifine.net/donate")
      .setAuthor("Donate", 'attachment://donate.png')
      .setFooter('Thank you for your consideration!');

    m.channel.send({embed: embed});

  });
  //m.channel.send("You can support OptiFine's development here: https://optifine.net/donate \nThank you for your consideration!");
}

function capeCommandHandler(m, args) {
  work(m, true);
  // Check if message includes arguments
  if(!args[0]) {
    work(m, false);
    m.channel.send("Please specify the Minecraft username of the cape owner.");
  } else {
    request({url: 'https://api.mojang.com/users/profiles/minecraft/'+args[0], encoding: null}, (err_m, res_m, data_m) => {
      if(err_m) {
        log.w('HTTPS request failed.', 'error');
        errorHandler(m, err_m);
      } else
      if(!res_m) {
        errorHandler(m, new Error('Failed to get a response from api.mojang.com'));
      } else {
        if(res_m.statusCode === 204) {
          work(m, false);
          m.channel.send("That user doesn't exist. (Maybe check your spelling?)");
        } else {
          var result = JSON.parse(data_m);

          var username = result.name;
          request({url: 'https://optifine.net/capes/'+username+'.png', encoding: null}, (err, res, data) => {
            if(err) {
              log.w('HTTPS request failed.', 'error');
              errorHandler(m, err);
            } else
            if(!res) {
              errorHandler(m, new Error('No response from optifine.net'));
            } else
            if(res.statusCode === 404) {
              work(m, false);
              m.channel.send("That user doesn't have a cape.");
            } else
            if(res.statusCode === 200) {
              jimp.read(data, (err_jimp, image) => {
                if(err_jimp){
                  errorHandler(m, err_jimp);
                } else {
                  image.resize(256, jimp.AUTO, jimp.RESIZE_NEAREST_NEIGHBOR);
                  image.getBuffer(jimp.AUTO, (err_buffer, imgFinal) => {
                    if(err_buffer) {
                      errorHandler(m, err_buffer);
                    } else {
                      fs.readFile('./app/images/opti_cape.png', (errIcon, data_icon) => {
                        if(errIcon) {
                          errorHandler(m, errIcon)
                        } else {
                          var embed = new discord.RichEmbed()
                          .setColor(cfg.embeds.default)
                          .attachFiles([new discord.Attachment(data_icon, "capeicon.png"), new discord.Attachment(imgFinal, "cape.png")])
                          .setAuthor("Cape for player \""+username+"\"", 'attachment://capeicon.png')
                          .setImage('attachment://cape.png');

                          work(m, false);
                          m.channel.send({embed: embed});
                        }
                      });
                    }
                  });
                }
              });
            } else {
              errorHandler(m, new Error("Unexpected response: "+res.statusCode));
            }
          });
        }
      }
    });


    /*request({url: 'https://optifine.net/capes/'+args[0]+'.png', encoding: null}, (err, res, data) => {
      if(err) {
        log.w('HTTPS request failed.', 'error');
        errorHandler(m, err);
      } else
      if(res) {
        // Does it exist?...
        if(res.statusCode === 200) {
          // ...Yes.
          jimp.read(data, (err_jimp, image) => {
            if(err_jimp){
              errorHandler(m, err_jimp);
            } else {
              image.resize(256, jimp.AUTO, jimp.RESIZE_NEAREST_NEIGHBOR);
              image.getBuffer(jimp.AUTO, (err_buffer, imgFinal) => {
                if(err_buffer) {
                  errorHandler(m, err_buffer);
                } else {
                  fs.readFile('./app/images/opti_cape.png', (errIcon, data) => {
                    if(errIcon) {
                      errorHandler(m, errIcon)
                    } else {
                      var embed = new discord.RichEmbed()
                      .attachFiles([new discord.Attachment(data, "capeicon.png"), new discord.Attachment(imgFinal, "cape.png")])
                      .setAuthor("Cape for player \""+args[0]+"\"", 'attachment://capeicon.png')
                      .setImage('attachment://cape.png')
                      .setColor(cfg.embeds.default);

                      work(m, false);
                      m.channel.send({embed: embed});
                    }
                  });
                }
              });
            }
          });
        } else
        if(res.statusCode === 404) {
          // ...No.
          work(m, false);
          m.channel.send("That user doesn't have a cape! ...Or they don't exist.");
        } else {
          // ...Not sure. Got some other response we weren't expecting.
          errorHandler(m);
        }
      } else {
        errorHandler(m, new Error('No response from optifine.net'));
      }
    });*/
  }
}

function roleidCommandHandler(m) {
  work(m, true);
  if(m.member.permissions.has("KICK_MEMBERS", true)) {
    var msg = "";
    m.channel.guild.roles.forEach(role => {
      if(role.name.indexOf('everyone') === -1) {
        msg += role.name+" - "+role.id+"\n";
      }
    });
    work(m, false);
    m.channel.send(msg)
  }
}

function roleCommandHandler(m, args) {
  if(m.member.permissions.has("KICK_MEMBERS", true)) {
    work(m, true);
    if(!args[0]){
      work(m, false);
      m.channel.send('Please specify the user to give roles to.');
    } else {
      var userid;
      if(m.mentions.members.size > 0){
        userid = m.mentions.members.first(1)[0].id;
      } else
      if (!isNaN(args[0])) {
        userid = args[0];
      } else {
        work(m, false);
        m.channel.send('Please use the users ID or @mention.');
        return;
      }

      if(!args[1]) {
        work(m, false);
        m.channel.send('Please specify the role(s) to give to this user.');
      } else {
        var rolesParse = new Promise(function(resolve, reject) {
          var list = [];
          for(i=0;i<4;i++){
            if(args[i+1] === undefined || i===3){
              resolve(list);
            } else {
              switch(args[i+1].toLowerCase()) {
                case 'shader_dev':
                  if(list.indexOf(cfg.roles.shader_dev) === -1) list.push(cfg.roles.shader_dev);
                  break;
                case 'texture_artist':
                  if(list.indexOf(cfg.roles.texture_artist) === -1) list.push(cfg.roles.texture_artist);
                  break;
                case 'mod_dev':
                  if(list.indexOf(cfg.roles.mod_dev) === -1) list.push(cfg.roles.mod_dev);
                  break;
              }
            }
          }
        });

        rolesParse.then(rolesList => {
          var rolesExist = new Promise(function(resolve, reject) {
            if(rolesList.length === 0) {
              work(m, false);
              m.channel.send('Please specify any valid roles. (`shader_dev`, `texture_artist`, `mod_dev`)');
            } else {
              var changed = false;
              for(i=0;i<rolesList.length+2;){
                if(rolesList[i] === undefined) {
                  resolve([rolesList, changed]);
                  break;
                } else
                if(m.channel.guild.members.get(userid).roles.has(rolesList[i])) {
                  log.w('removed role', 'debug');
                  rolesList.splice(i, 1);
                  changed = true;
                  continue;
                } else {
                  i++;
                }
              }
            }
          });

          rolesExist.then(([rolesFinal, removed]) => {
            if(rolesFinal.length === 0) {
              if(args[2]) {
                work(m, false);
                m.channel.send('That user already has those roles.');
              } else {
                work(m, false);
                m.channel.send('That user already has that role.');
              }
            } else {
              m.channel.guild.members.get(userid).addRoles(rolesFinal).then(() => {
                var successMsg;
                if (rolesFinal.length === 1) {
                  successMsg = 'Successfully gave '+rolesFinal.length+' role to user "'+m.channel.guild.members.get(userid).user.username+'"';
                } else {
                  successMsg = 'Successfully gave '+rolesFinal.length+' roles to user "'+m.channel.guild.members.get(userid).user.username+'"';
                }
                if(removed) successMsg += "\nSome roles were ignored because the user already has them.";
                work(m, false);
                m.channel.send(successMsg);
              }).catch(err => {
                if(err) {
                  errorHandler(m, err);
                }
              });
            }
          });
        });
      }
    }
  }
}

function rmroleCommandHandler(m, args) {
  if(m.member.permissions.has("KICK_MEMBERS", true)) {
    work(m, true);
    if(!args[0]){
      work(m, false);
      m.channel.send('Please specify the user to take roles from.');
    } else {
      var userid;
      if(m.mentions.members.size > 0){
        userid = m.mentions.members.first(1)[0].id;
      } else
      if (!isNaN(args[0])) {
        userid = args[0];
      } else {
        work(m, false);
        m.channel.send('Please use the users ID or @mention.');
        return;
      }

      if(!args[1]) {
        work(m, false);
        m.channel.send('Please specify the role(s) to take from this user.');
      } else {
        var rolesParse = new Promise(function(resolve, reject) {
          var list = [];
          for(i=0;i<4;i++){
            if(args[i+1] === undefined || i===3){
              resolve(list);
            } else {
              switch(args[i+1].toLowerCase()) {
                case 'shader_dev':
                  if(list.indexOf(cfg.roles.shader_dev) === -1) list.push(cfg.roles.shader_dev);
                  break;
                case 'texture_artist':
                  if(list.indexOf(cfg.roles.texture_artist) === -1) list.push(cfg.roles.texture_artist);
                  break;
                case 'mod_dev':
                  if(list.indexOf(cfg.roles.mod_dev) === -1) list.push(cfg.roles.mod_dev);
                  break;
              }
            }
          }
        });

        rolesParse.then(rolesList => {
          var rolesExist = new Promise(function(resolve, reject) {
            if(rolesList.length === 0) {
              work(m, false);
              m.channel.send('Please specify any valid roles. (`shader_dev`, `texture_artist`, `mod_dev`)');
            } else {
              var changed = false;
              for(i=0;i<rolesList.length+2;){
                if(rolesList[i] === undefined) {
                  resolve([rolesList, changed]);
                  break;
                } else
                if(!m.channel.guild.members.get(userid).roles.has(rolesList[i])) {
                  log.w('removed role', 'debug');
                  rolesList.splice(i, 1);
                  changed = true;
                  continue;
                } else {
                  i++;
                }
              }
            }
          });

          rolesExist.then(([rolesFinal, removed]) => {
            if(rolesFinal.length === 0) {
              if(args[2]) {
                work(m, false);
                m.channel.send('That user doesn\'t have those roles.');
              } else {
                work(m, false);
                m.channel.send('That user doesn\'t that role.');
              }
            } else {
              m.channel.guild.members.get(userid).removeRoles(rolesFinal).then(() => {
                var successMsg;
                if (rolesFinal.length === 1) {
                  successMsg = 'Successfully removed '+rolesFinal.length+' role from user "'+m.channel.guild.members.get(userid).user.username+'"';
                } else {
                  successMsg = 'Successfully removed '+rolesFinal.length+' roles from user "'+m.channel.guild.members.get(userid).user.username+'"';
                }
                if(removed) successMsg += "\nSome roles were ignored because the user does not have them.";
                work(m, false);
                m.channel.send(successMsg);
              }).catch(err => {
                if(err) {
                  errorHandler(m, err);
                }
              });
            }
          });
        });
      }
    }
  }
}

function statusCommandHandler(m, args) {
  function checkOF() {
    work(m, true);
    log.w("Checking status of https://optifine.net/home");
    request('https://optifine.net/home', (err, res, body) => {
      if(err){
        errorHandler(m, err);
      } else {
        log.w("Checking status of http://s.optifine.net/");
        request({url:'http://s.optifine.net', headers: {'User-Agent': 'optibot'}}, (err2, res2, body2) => {
          if(err2) {
            errorHandler(m, err2);
          } else {
            var response = new Promise(function(resolve, reject) {

              var msg;
              var msgFooter;
              var msgError = "Try again in 10 minutes?";

              if (!res.statusCode) {
                msg = "`❌` Failed to get a response from the OptiFine website.";
                msgFooter = msgError;
              } else {
                if(res.statusCode === 200){
                  msg = "`✅` Website is online.";
                } else
                if(res.statusCode === 404 || res.statusCode === 503){
                  msg = "`❌` Website appears to be offline.";
                  msgFooter = msgError;
                } else {
                  msg = "`❓` Status of website is something out of the ordinary. (Code "+res.statusCode+")";
                  msgFooter = msgError;
                }
              }

              if (!res2.statusCode) {
                msg += "\n`❌` Failed to get a response from the capes server.";
                msgFooter = msgError;
                resolve([msg, msgFooter]);
              } else {
                if(res2.statusCode === 404){
                  msg += "\n`✅` Capes server is online.";
                  resolve([msg, msgFooter]);
                } else
                if(res2.statusCode === 503){
                  msg += "\n`❌` Capes server appears to be offline.";
                  msgFooter = msgError;
                  resolve([msg, msgFooter]);
                } else {
                  msg += "\n`❓` Status of the capes server is something out of the ordinary. (Code "+res.statusCode+")";
                  msgFooter = msgError;
                  resolve([msg, msgFooter]);
                }
              }
            });


            response.then(([msg, msgFooter]) => {
              work(m, false);
              fs.readFile('./app/images/opti_server.png', (err, data) => {
                if(err) {
                  errorHandler(m, err)
                } else {
                  var embed = new discord.RichEmbed()
                    .setColor(cfg.embeds.default)
                    .attachFile(new discord.Attachment(data, "status.png"))
                    .setAuthor('OptiFine Server Status', 'attachment://status.png')
                    .setDescription(msg);

                  if(msgFooter) {
                    embed.setFooter(msgFooter);
                  } else {
                    embed.setFooter('If you\'re having issues, check your internet connection.');
                  }

                  m.channel.send({embed: embed});
                }
              });
            }).catch(err => {
              errorHandler(m, err)
            });
          }
        });
      }
    });
  }
  if(args[0]) {
    if(args[0] === 'mc') {
      work(m, true);
      log.w("Checking status of Mojang/Minecraft");
      request('https://status.mojang.com/check', (err, res, body) => {
        if(err){
          errorHandler(m, err);
        } else {
          var response = new Promise(function(resolve, reject) {

            var msg = "";
            var msgFooter;
            var msgError = "Try again in 10 minutes?";

            if (!res.statusCode) {
              msg = ["`❌` Failed to get a response from the Mojang API."];
              msgFooter = msgError;
            } else {
              var pResult = JSON.parse(body);
              log.w(pResult);
              for(var i in pResult) {
                var server = Object.keys(pResult[i]);
                log.w(server);
                if(pResult[i][server] === 'green') {
                  msg += "`✅` "+server+" is online.\n";
                } else
                if(pResult[i][server] === 'yellow') {
                  msg += "`⚠` "+server+" is having some issues.\n";
                  msgFooter = msgError;
                } else
                if(pResult[i][server] === 'red') {
                  msg += "`❌` "+server+" is down.\n";
                  msgFooter = msgError;
                } else {
                  msg += "`❓` "+server+" is in an unknown state.\n";
                  msgFooter = msgError;
                }

                if(i+1 > pResult.length) {
                  setTimeout(function(){
                    resolve([msg, msgFooter]);
                  }, 500)
                }
              }
            }
          });


          response.then(([msg, msgFooter]) => {
            work(m, false);
            fs.readFile('./app/images/opti_server.png', (err, data) => {
              if(err) {
                errorHandler(m, err)
              } else {
                var embed = new discord.RichEmbed()
                  .setColor(cfg.embeds.default)
                  .attachFile(new discord.Attachment(data, "status.png"))
                  .setAuthor('Minecraft/Mojang Server Status', 'attachment://status.png')
                  .setDescription(msg);

                if(msgFooter) {
                  embed.setFooter(msgFooter);
                } else {
                  embed.setFooter('If you\'re having issues, check your internet connection.');
                }

                m.channel.send({embed: embed});
              }
            });
          }).catch(err => {
            errorHandler(m, err)
          });
        }
      });
    } else {
      checkOF();
    }
  } else {
    checkOF();
  }
}

function shaderwikiCommandHandler(m) {
  fs.readFile('./app/images/opti_shader.png', (err, data) => {
    if(err) {
      errorHandler(m, err)
    } else {
      var embed = new discord.RichEmbed()
        .setColor(cfg.embeds.default)
        .attachFile(new discord.Attachment(data, "thumbnail.png"))
        .setAuthor('Official List of Shader Packs', 'attachment://thumbnail.png')
        .setDescription("http://shaders.wikia.com/wiki/Shader_Packs");
      m.channel.send({embed:embed});
    }
  });
}

function mcwikiCommandHandler(m, args) {
  work(m, true);
  fs.readFile('./app/images/opti_mcwiki.png', (err_img, data_img) => {
    if(err_img) {
      errorHandler(m, err_img);
    } else {
      var embed = new discord.RichEmbed()
        .setColor(cfg.embeds.default)
        .attachFile(new discord.Attachment(data_img, "thumbnail.png"))
        .setAuthor('Official Minecraft Wiki', 'attachment://thumbnail.png');

      if(!args[0]) {
        embed.addField("Home page", "https://minecraft.gamepedia.com/Minecraft_wiki")

        work(m, false);
        m.channel.send({embed: embed});
      } else {
        function mcwikiResult(data) {
          var result = JSON.parse(data);
          if(!result.query) {
            embed.setDescription("Error: Couldn't find that page.")
              .addField("Home page", "https://minecraft.gamepedia.com/Minecraft_wiki");

            work(m, false);
            m.channel.send({embed:embed});
          } else {
            var resultID = Object.keys(result.query.pages)[0];

            embed.addField(result.query.pages[resultID].title, result.query.pages[resultID].fullurl)
            work(m, false);
            m.channel.send({embed:embed});
          }
        }

        if (args[0].toLowerCase() === "random") {
          request("https://minecraft.gamepedia.com/api.php?action=query&format=json&generator=random&prop=info&inprop=url", (err, res, data) => {
            if(err) {
              errorHandler(m, err);
            } else {
              mcwikiResult(data);
            }
          });
        } else {
          var query = encodeURIComponent(m.content.trim().split("\n", 1)[0].substring(8));
          request("https://minecraft.gamepedia.com/api.php?action=query&format=json&generator=search&gsrsearch="+query+"&gsrlimit=1&prop=info&inprop=url", (err, res, data) => {
            if(err) {
              errorHandler(m, err);
            } else {
              mcwikiResult(data);
            }
          });
        }
      }
    }
  });
}

function shaderlabCommandHandler(m) {
  // idea: cycle through several invite links?
  fs.readFile('./app/images/opti_labs.png', (err, data) => {
    var embed = new discord.RichEmbed()
      .setColor(cfg.embeds.default)
      .attachFile(new discord.Attachment(data, 'labs.png'))
      .setAuthor("ShaderLABS Discord Server", 'attachment://labs.png')
      .setDescription("https://discord.gg/RP8CEdB")


    m.channel.send({embed: embed});

  });
}

function offtopicCommandHandler(m) {
  if (m.channel.id === "426005631997181963") {
    m.channel.send("Are you lost?");
  } else {
    fs.readFile('./app/images/offtopic.png', (err, data) => {
      if(err) {
        errorHandler(m, err)
      } else {
        m.channel.send(new discord.Attachment(data, "offtopic.png"))

        .catch(err2 => {
          if(err2) {
            errorHandler(m, err2)
          }
        });
      }
    });
  }
}

function goodboyCommandHandler(m) {
  fs.readFile('./app/images/goodboy.gif', (err, data) => {
    if(err) {
      errorHandler(m, err)
    } else {
      m.channel.send(new discord.Attachment(data, "goodboy.gif"))

      .catch(err2 => {
        if(err2) {
          errorHandler(m, err2)
        }
      });
    }
  });
}

function helpCommandHandler(m, args) {
  work(m, true);
  fs.readFile('./app/images/opti_help.png', (err, data) => {
    if(err) {
      errorHandler(m, err)
    } else {
      var pages = [
        {embed: new discord.RichEmbed()
          .setColor(cfg.embeds.default)
          .attachFile(new discord.Attachment(data, "thumbnail.png"))
          .setAuthor('OptiBot Help (Page 1/2)', 'attachment://thumbnail.png')
          .addField('Commands', "• `!docs [file] [line]` to reference OptiFine documentation."
            + "\n• `!cape <playername>` displays donator capes. Note that player names are case-sensitive."
            + "\n• `!shaders` provides a quick link to the official list of shader packs."
            + "\n• `!mcwiki [query]` searches and links to pages on the official Minecraft wiki."
            + "\n• `!lab` gives an invite link to the ShaderLABS Discord Server."
            + "\n• `!offtopic` to go to <#426005631997181963>"
            + "\n• `!donate` for donation information."
            + "\n• `!status [mc]` checks the status of either the OptiFine servers, or the Mojang servers."
            + "\n• `!about` tells you about OptiBot."
            + "\n• `!help [page #]` displays this dialog."
          )
        },
        {embed: new discord.RichEmbed()
          .setColor(cfg.embeds.default)
          .attachFile(new discord.Attachment(data, "thumbnail.png"))
          .setAuthor('OptiBot Help (Page 2/2)', 'attachment://thumbnail.png')
          .addField('Other neat tricks', "`Linking GitHub Issues` \nYou can reference an issue from the OptiFine GitHub repo by typing `#<number>` anywhere in your message. This can be circumvented by adding a backwards slash `\\` immediately before the number sign `#`. Note that issue references are limited to "+cfg.gh_refs.limit+" per message to prevent spam."
          )
        }
      ];

      var embed = pages[0].embed;
      if(args[0]){
        if(m.member.permissions.has("KICK_MEMBERS", true) && args[0].toLowerCase() === 'mod'){
          embed = new discord.RichEmbed()
          .setColor(cfg.embeds.default)
          .attachFile(new discord.Attachment(data, "thumbnail.png"))
          .setAuthor('OptiBot Help', 'attachment://thumbnail.png')
          .addField('Moderator Commands', "• `!role <user ID or @mention> <role(s)>` to give users special roles. Valid roles include `shader_dev`, `texture_artist`, and `mod_dev`. You can give multiple roles at once, each separated by a space."
            + "\n• `!rmrole <user ID or @mention> <role(s)>` to remove roles from users."
            + "\n• `!stop [temp]` tells the bot to shut down. `!stop temp` will make the bot automatically restart after approximately one hour."
            + "\n• `!restart` tells the bot to restart. Unless the bot is in debug mode, this will also force-update all libraries."
            + "\n• `!help mod` displays this dialog."
          )
        }
      }
      // send the final message
      work(m, false);
      if(args[0]) {
        if(args[0] === "2") { m.channel.send({embed: pages[1].embed}) }
        else {m.channel.send({embed: embed})}
      } else {
        m.channel.send({embed: embed})
      }
    }
  });
}

function aboutCommandHandler(m) {
  work(m, true);
  fs.readFile('./app/images/optifine_thumbnail.png', (err, data) => {
    if(err) {
      errorHandler(m, err);
    } else {
      fs.readFile('./app/images/opti_about.png', (err2, data2) => {
        if(err2) {
          errorHandler(m, err2);
        } else {
          work(m, false);
          m.channel.send({embed: new discord.RichEmbed()
            .setColor(cfg.embeds.default)
            //.attachFile(new discord.Attachment(data, "thumbnail.png"))
            .attachFiles([new discord.Attachment(data, "thumbnail.png"), new discord.Attachment(data2, "about.png")])
            .setThumbnail('attachment://thumbnail.png')
            .setAuthor('About OptiBot', 'attachment://about.png')
            .setDescription("Created by jackasterisk for the official OptiFine Discord server.")
            .addField("Special Thanks", "**sp614x** - for creating OptiFine 🌞"
              + "\n**3XH6R** - for early bugtesting 🐞"
              + "\n**Builderb0y** - for some great suggestions and advice 💡"
            )
            .setFooter(pkg.version)});
        }
      });
    }
  });
}

function restartCommandHandler(m) {
  if (m.member.permissions.has("KICK_MEMBERS", true)) {
    work(m, false);
    shutdown(m, 0);
  }
}

function stopCommandHandler(m, args) {
  if (m.member.permissions.has("KICK_MEMBERS", true)) {
    if(args[0]){
      if(args[0] === 'temp') {
        // shutdown temporarily for exactly one hour
        work(m, false);
        shutdown(m, 19);
      }
    } else {
      // shutdown completely
      work(m, false);
      shutdown(m, 18);
    }
  }
}

function errorCommandHandler(m, args) {
  if (m.member.permissions.has("KICK_MEMBERS", true)) {
    work(m, true);
    var err = new TypeError("Example error.");
    if(args[0]){
      if(args[0].toLowerCase() === 'fatal') {
        throw(err);
      } else
      if (args[0].toLowerCase() === 'blank') {
        errorHandler(m)
      } else {
        errorHandler(m, err);
      }
    } else {
      errorHandler(m, err);
    }
  }
}

function cooldownHandler(m) {
  if(!cooldownActive) cooldownCounter += 700;

  if(cooldownCounter >= 1000) {
    var cooldownTimer = 5000;
    cooldownActive = true;
    cooldownCounter = 0;

    fs.readFile('./app/images/opti_timeout.png', (err, data) => {
      var embed = new discord.RichEmbed()
        .setColor(cfg.embeds.default)
        .attachFile(new discord.Attachment(data, 'timeout.png'))
        .setDescription("Please wait 5 seconds.")
        .setAuthor("OptiBot is in cooldown mode!", 'attachment://timeout.png')


      activityHandler('cooldownStart');
      log.w('COOLDOWN MODE ACTIVATED', 'warn');
      m.channel.send("_ _", {embed: embed}).then(m => {
        var countdown = bot.setInterval(function(){
          cooldownTimer -= 1000;
          if(cooldownTimer <= 0) {
            cooldownActive = false;
            activityHandler('cooldownEnd');
            m.delete();
            log.w('COOLDOWN MODE DEACTIVATED', 'warn');
            bot.clearInterval(countdown);
          } else {
            embed.description = "Please wait "+(cooldownTimer / 1000)+" seconds.";
            m.edit("_ _", {embed: embed});
          }
        }, 1000);
      });
    });
  }
}

function issueRefHandler(m) {
  var issueMatch = m.content.match(/(?<!\\|<)#\d+/g);
  var searchPromise = new Promise(function(resolve, reject) {
    var issueSearchList = [];
    var issueLinks = [];
    var omitted = false;

    if (issueMatch !== null) {
      work(m, true);
      issueMatch.forEach(function(entry) {
        if(issueSearchList.length !== cfg.gh_refs.limit) {
          var issueNum = parseInt(entry.substr(1));
          if (issueNum != 0 && issueSearchList.indexOf(issueNum) === -1) {
            issueSearchList.push(issueNum);
            log.w('added '+issueNum);
          };
        } else {
          omitted = true;
        }
      });

      var searchesDone = 0;
      var searchIssues = bot.setInterval(function() {
        var issue = issueSearchList[searchesDone];
        request('https://github.com/sp614x/optifine/issues/'+issue+'.json', (err, res, data) => {
          if(err) {
            reject('Error occurred during search.');
            errorHandler(m, err);
            bot.clearInterval(searchIssues);
          } else {
            var title = JSON.parse(data).title;
            if(title) {
              issueLinks.push('[#'+issue+' - '+title+']('+'https://github.com/sp614x/optifine/issues/'+issue+')\n');
            }
            searchesDone++;
            if(searchesDone === issueSearchList.length) {
              resolve([issueLinks, omitted]);
              bot.clearInterval(searchIssues);
            }
          }
        });
      }, 500);
    } else {
      work(m, false);
    }
  });

  searchPromise.then(([issueList, omitted]) => {
    fs.readFile('./app/images/opti_gh.png', (err, data) => {
      if(err) {
        errorHandler(m, err)
      } else {
        var embed = new discord.RichEmbed()
          .attachFile(new discord.Attachment(data, "gh.png"))
          .setColor(cfg.embeds.default);
        var title = 'GitHub issues found';

        if(issueList.length === 1){
          title = issueList.length+' GitHub issue found';
        } else {
          title = issueList.length+' GitHub issues found';
        }

        if(issueList.length !== 0) {
          embed.setAuthor(title, 'attachment://gh.png')
            .setDescription(issueList);

          if(omitted) {
            embed.setFooter('Some issues were removed to prevent excessively long lists.');
          }

          work(m, false);
          m.channel.send({embed: embed});
        } else {
          embed.setAuthor(title, 'attachment://gh.png')
            .setDescription("Existing issues can be found at https://github.com/sp614x/optifine/issues.");

          work(m, false);
          m.channel.send({embed: embed}).then((msg) => {
            msg.delete(10000);
          });
        }
      }
    });
  }).catch(reject => {
    log.w(reject, 'error');
  });
}

function activityHandler(type) {
  if (type === 'startup' || type === 'cooldownEnd') {
    if(debugMode) {
      bot.user.setActivity("with code", {type: 'PLAYING'});
      bot.user.setStatus('dnd');
    } else {
      bot.user.setActivity("!help", {type: 'LISTENING'});
      bot.user.setStatus('online');
    }
  } else
  if(type === 'cooldownStart') {
    bot.user.setActivity(null);
    bot.user.setStatus('idle');
  } else
  if(type === 'shutdown') {
    bot.user.setActivity(null);
    bot.user.setStatus('dnd');
  }
}

function errorHandler(m, err, errorOnly) {
  fs.readFile('./app/images/opti_err.png', (errRead, data) => {
    if(errRead) {
      throw(errRead);
    } else {
      var embed = new discord.RichEmbed()
      .attachFile(new discord.Attachment(data, "err.png"))
      .setAuthor('Error', 'attachment://err.png')
      //.addField('_ _', 'This message will self-destruct in 10 seconds.')
      .setColor(cfg.embeds.error)


      if(err){
        log.w(err, 'error');
        if(errorOnly) {
          embed.setDescription(err);
        } else {
          embed.setFooter(err)
          .setDescription('Something went wrong while doing that. Check your input, or try again later. \n\nIf this continues, try contacting a moderator, and give them this error message:');
        }
      } else {
        embed.setDescription('Something went wrong while doing that. Check your input, or try again later. If this continues, try contacting a moderator.');
      }

      work(m, false);
      m.channel.send({embed: embed}).then(msg => {
        //msg.delete(10000);
      });
    }
  });
}

function work(m, state) {
  if(cfg.processIndicator) {
    if(state){
      log.w('started typing', 'debug');
      m.channel.startTyping();
    } else {
      log.w('stopped typing', 'debug');
      m.channel.stopTyping(true);
    }
  }
}

function shutdown(m, opt) {
  shuttingdown = true;
  activityHandler('shutdown');

  bot.destroy();
  setTimeout(function() {
    process.exit(opt);
  }, 1000)
}

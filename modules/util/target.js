const util = require(`util`);

/**
 * Attempts to get a user from the target input. Returns a promise that resolves with an object containing 2 properties:
 * 1. `type`
 * 2. `target`
 * 
 * `type` will always specify what kind of item the `target` is. This will be one of 3 strings: "user", "id", and "notfound" if no user was found.
 * `target` will usually be a GuildMember object, if at all possible. Otherwise this will be either a user ID, or just `null`.
 * 
 * The boolean generally only returns false if the input was a plain ID, and the ID was not found via `fetchMember()`.
 * Both properties will be undefined if the input is invalid.
 * 
 * @param {Message} m The original input message.
 * @param {String} target The target user. Can be either a Discord mention, shortcuts ("me", "myself", "^", etc...), or just a plain numerical user ID.
 * @param bot OptiBot
 * @returns {Promise<Object>} `{ type, target }`
 */

module.exports = (m, target, bot, data) => {
    const log = bot.log;
    target = String(target);
    return new Promise((resolve, reject) => {
        log(`get target from ${target}`);
        log(`select type ${data.type}`);

        // todo: add string similarity

        function checkServer(id) {
            bot.guilds.cache.get(bot.cfg.guilds.optifine).members.fetch({ user: id, cache: true }).then(mem => {
                if(data.type === 0) {
                    resolve({ type: "user", target: mem });
                } else
                if(data.type === 1) {
                    if(mem.lastMessage) {
                        resolve({ type: "message", target: mem.lastMessage });
                    } else {
                        resolve({ type: "notfound", target: null });
                    }
                }
            }).catch(err => {
                if (err.stack.toLowerCase().indexOf('invalid or uncached') > -1 || err.stack.toLowerCase().indexOf('unknown user') > -1) {
                    resolve({ type: "id", target: id });
                } else {
                    reject(err);
                }
            });
        }

        if (['self', 'myself', 'me'].indexOf(target.toLowerCase()) > -1) {
            log('self')
            if(data.type === 0) {
                resolve({ type: "user", target: data.member });
            } else
            if(data.type === 1) {
                if(data.member.lastMessage) {
                    resolve({ type: "message", target: data.member.lastMessage });
                } else {
                    resolve({ type: "notfound", target: null });
                }
            }
        } else
        if (['someone', 'somebody', 'random', 'something'].indexOf(target.toLowerCase()) > -1) {
            log('random')
            if(m.channel.type === 'dm') {
                if(data.type === 0) {
                    resolve({ type: "user", target: data.member });
                } else
                if(data.type === 1) {
                    if(data.member.lastMessage) {
                        resolve({ type: "message", target: data.member.lastMessage });
                    } else {
                        resolve({ type: "notfound", target: null });
                    }
                }
            } else
            if(data.type === 0) {
                let users = [];
                if(m.guild.id !== bot.cfg.guilds.optifine) {
                    users = [...bot.guilds.cache.get(bot.cfg.guilds.optifine).members.cache.values()];
                } else {
                    users = [...m.guild.members.cache.values()];
                }

                log(users.length)

                let someone = users[~~(Math.random() * users.length)];
                resolve({ type: "user", target: someone });
            } else
            if(data.type === 1) {
                let channels_unfiltered = [...bot.guilds.cache.get(bot.cfg.guilds.optifine).channels.cache.values()];
                let channels = []
                let blacklist = bot.cfg.channels.mod.concat(bot.cfg.channels.blacklist);

                channels_unfiltered.forEach((channel) => {
                    if(blacklist.indexOf(channel.id) === -1 && blacklist.indexOf(channel.parentID) === -1 && channel.type === 'text' && channel.messages.cache.size > 0) {
                        channels.push(channel);
                    }
                });

                if(channels.length === 0) {
                    resolve({ type: "notfound", target: null });
                } else {
                    let fc = channels[~~(Math.random() * channels.length)];

                    log(fc);

                    let fm = [...fc.messages.cache.values()];
                    let final_msg = fm[~~(Math.random() * fm.length)];

                    if(final_msg) {
                        resolve({ type: "message", target: final_msg });
                    } else {
                        resolve({ type: "notfound", target: null });
                    }
                }
            }
        } else
        if (target.match(/^(<@).*(>)$/) !== null && m.mentions.users.size > 0) {
            log('@mention')
            if(m.mentions.members !== null && m.guild.id === bot.cfg.guilds.optifine) {
                let mem = [...m.mentions.members.values()][0];
                if(data.type === 0) {
                    resolve({ type: "user", target: mem });
                } else
                if(data.type === 1) {
                    if(mem.lastMessage) {
                        resolve({ type: "message", target: mem.lastMessage });
                    } else {
                        resolve({ type: "notfound", target: null });
                    }
                }
            } else {
                checkServer([...m.mentions.users.values()][0].id);
            }
        } else
        if (target.match(/^\^{1,10}$/) !== null) {
            log(`"above" shortcut`)
            if(m.channel.type === 'dm') {
                resolve({ type: "notfound", target: null });
            } else {
                m.channel.messages.fetch({ limit: 25 }).then(msgs => {
                    let itr = msgs.values();
                    let skip_t = target.length-1;
                    let skipped = 0;

                    log(`skip target: ${skip_t}`);
    
                    (function search() {
                        let thisID = itr.next();
                        if (thisID.done) {
                            resolve({ type: "notfound", target: null });
                        } else
                        if ([m.author.id, bot.user.id].indexOf(thisID.value.author.id) === -1 && !thisID.value.author.bot) {
                            // valid msg
                            log(`skip: ${skip_t} === ${skipped} (${skip_t === skipped})`)
                            if(skip_t === skipped) {
                                log(`message age: ${(m.createdTimestamp - thisID.value.createdTimestamp).toLocaleString()}ms`)
                                if(thisID.value.createdTimestamp + 1000 > m.createdTimestamp) {
                                    log('extremely recent message skipped', 'debug');
                                    search();
                                } else
                                if(m.guild.id !== bot.cfg.guilds.optifine && data.type === 0) {
                                    checkServer(thisID.value.member.id);
                                } else {
                                    if(data.type === 0) {
                                        resolve({ type: "user", target: thisID.value.member });
                                    } else
                                    if(data.type === 1) {
                                        resolve({ type: "message", target: thisID.value });
                                    }
                                }
                            } else {
                                log(`valid skip ${skipped}`)
                                skipped++;
                                search();
                            }
                        } else {
                            search();
                        }
                    })();
                }).catch(err => reject(err));
            }
        } else
        if (!isNaN(target) && parseInt(target) >= 1420070400000) {
            if(data.type === 0) {
                log('id')
                checkServer(target);
            } else
            if(data.type === 1) {
                resolve();
            }
        } else 
        if(target.indexOf('discordapp.com') > -1) {
            let urls = m.content.match(/\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/gi);

            if(urls !== null) {
                let seg = urls[0].split(/(?<!\/)\/(?!\/)|(?<!\\)\\(?!\\)/g).reverse();

                log(seg.length);

                if(seg.length === 5 && !isNaN(parseInt(seg[0])) && !isNaN(parseInt(seg[1])) && !isNaN(parseInt(seg[2]))) {
                    let rg = seg[2];
                    let rc = seg[1];
                    let rm = seg[0];

                    bot.guilds.cache.get(rg).channels.cache.get(rc).messages.fetch(rm).then(msg => {
                        if(data.type === 0) {
                            resolve({ type: "user", target: msg.member });
                        } else
                        if(data.type === 1) {
                            resolve({ type: "message", target: msg });
                        }
                    }).catch(err => {
                        reject(err);
                    });
                } else {
                    resolve({ type: "notfound", target: null });
                }
            } else {
                resolve();
            }
        } else {
            resolve();
        }
    });
}
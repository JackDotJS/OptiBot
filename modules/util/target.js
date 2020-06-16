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

        function remember(final) {
            if(final && final.type !== "notfound") {
                let slot = bot.memory.targets[m.author.id];
                if(slot) {
                    if (data.type === 0) slot.u = target;
                    if (data.type === 1) slot.m = target;
                } else {
                    bot.memory.targets[m.author.id] = {
                        u: (data.type === 0) ? target : null,
                        m: (data.type === 1) ? target : null
                    };
                }
            }

            let final_fixed = final;

            let userid = final.target; // ID only
            let username = userid;
            let mention = userid;

            if (final.type === 'user') {
                userid = final.target.id; 
                username = final.target.tag; 
                mention = final.target.toString();
            } else 
            if (final.type === 'member') {
                userid = final.target.user.id; 
                username = final.target.user.tag;
                mention = final.target.user.toString();
            }

            final_fixed.id = userid;
            final_fixed.tag = username;
            final_fixed.mention = mention;

            resolve(final_fixed);
        }

        function checkServer(id) {
            bot.guilds.cache.get(bot.cfg.guilds.optifine).members.fetch({ user: id, cache: true }).then(mem => {
                if(data.type === 0) {
                    remember({ type: "member", target: mem });
                } else
                if(data.type === 1) {
                    if(mem.lastMessage) {
                        remember({ type: "message", target: mem.lastMessage });
                    } else {
                        remember({ type: "notfound", target: null });
                    }
                }
            }).catch(err => {
                if (err.stack.match(/invalid or uncached|unknown member|unknown user/i)) {
                    if(data.type === 0) {
                        bot.users.fetch(id).then(user => {
                            remember({ type: "user", target: user });
                        }).catch(err => {
                            reject(err);
                        })
                    } else
                    if(data.type === 1) {
                        remember({ type: "notfound", target: null });
                    }
                } else {
                    reject(err);
                }
            });
        }

        if (['previous', 'last', 'recent', 'prev'].includes(target.toLowerCase())) {
            log('last target')
            if(data.type === 0) {
                target = bot.memory.targets[m.author.id].u;
            } else
            if(data.type === 1) {
                target = bot.memory.targets[m.author.id].m;
            }
        }
        
        if (['self', 'myself', 'me'].includes(target.toLowerCase())) {
            log('self')
            if(data.type === 0) {
                remember({ type: "member", target: data.member });
            } else
            if(data.type === 1) {
                if(data.member.lastMessage) {
                    remember({ type: "message", target: data.member.lastMessage });
                } else {
                    remember({ type: "notfound", target: null });
                }
            }
        } else
        if (['someone', 'somebody', 'random', 'something'].includes(target.toLowerCase())) {
            log('random')
            if(m.channel.type === 'dm') {
                if(data.type === 0) {
                    remember({ type: "member", target: data.member });
                } else
                if(data.type === 1) {
                    if(data.member.lastMessage) {
                        remember({ type: "message", target: data.member.lastMessage });
                    } else {
                        remember({ type: "notfound", target: null });
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
                remember({ type: "member", target: someone });
            } else
            if(data.type === 1) {
                let channels_unfiltered = [...bot.guilds.cache.get(bot.cfg.guilds.optifine).channels.cache.values()];
                let channels = []
                let blacklist = bot.cfg.channels.mod.concat(bot.cfg.channels.blacklist);

                channels_unfiltered.forEach((channel) => {
                    if(!blacklist.includes(channel.id) && !blacklist.includes(channel.parentID) && channel.type === 'text' && channel.messages.cache.size > 0) {
                        channels.push(channel);
                    }
                });

                if(channels.length === 0) {
                    remember({ type: "notfound", target: null });
                } else {
                    let attempts = 0;
                    (function roll() {
                        attempts++;
                        let fc = channels[~~(Math.random() * channels.length)];

                        log(fc);

                        let fm = [...fc.messages.cache.values()];
                        let final_msg = fm[~~(Math.random() * fm.length)];

                        if(final_msg.content.length !== 0) {
                            remember({ type: "message", target: final_msg });
                        } else 
                        if (attempts === 3) {
                            remember({ type: "notfound", target: null });
                        } else {
                            roll();
                        }
                    })();
                }
            }
        } else
        if (target.match(/^(<@).*(>)$/) !== null && m.mentions.users.size > 0) {
            log('@mention')
            if(m.mentions.members !== null && m.guild.id === bot.cfg.guilds.optifine) {
                let mem = [...m.mentions.members.values()][0];
                if(data.type === 0) {
                    remember({ type: "member", target: mem });
                } else
                if(data.type === 1) {
                    if(mem.lastMessage) {
                        remember({ type: "message", target: mem.lastMessage });
                    } else {
                        remember({ type: "notfound", target: null });
                    }
                }
            } else {
                checkServer([...m.mentions.users.values()][0].id);
            }
        } else
        if (target.match(/^\^{1,10}$/) !== null) {
            log(`"above" shortcut`)
            if(m.channel.type === 'dm') {
                remember({ type: "notfound", target: null });
            } else {
                m.channel.messages.fetch({ limit: 25 }).then(msgs => {
                    let itr = msgs.values();
                    let skip_t = target.length-1;
                    let skipped = 0;

                    log(`skip target: ${skip_t}`);
    
                    (function search() {
                        let thisID = itr.next();
                        if (thisID.done) {
                            remember({ type: "notfound", target: null });
                        } else
                        if (![m.author.id, bot.user.id].includes(thisID.value.author.id) && !thisID.value.author.bot) {
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
                                        remember({ type: "member", target: thisID.value.member });
                                    } else
                                    if(data.type === 1) {
                                        remember({ type: "message", target: thisID.value });
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
                remember();
            }
        } else 
        if(target.match(/discordapp\.com|discord.com/i)) {
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
                            remember({ type: "member", target: msg.member });
                        } else
                        if(data.type === 1) {
                            remember({ type: "message", target: msg });
                        }
                    }).catch(err => {
                        reject(err);
                    });
                } else {
                    remember({ type: "notfound", target: null });
                }
            } else {
                remember();
            }
        } else {
            remember();
        }
    });
}
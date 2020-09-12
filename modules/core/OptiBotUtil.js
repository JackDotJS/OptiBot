const util = require('util');
const djs = require('discord.js');
const cid = require('caller-id');
const OptiBot = require('./OptiBotClient.js');
const Profile = require('./OptiBotProfile.js');
const Command = require('./OptiBotCommand.js');
const LogEntry = require('./OptiBotLogEntry.js');
const Memory = require('./OptiBotMemory.js');
const Assets = require('./OptiBotAssetsManager.js');

module.exports = class OptiBotUtilities {
    constructor() {
        throw new Error('Why are you doing this? (Cannot instantiate this class.)');
    }

    static setWindowTitle(text) {
        const bot = Memory.core.client;
        const log = bot.log;

        if(text !== undefined) Memory.wintitle = text;

        function statusName(code) {
            if(code === 0) return 'READY';
            if(code === 1) return 'CONNECTING';
            if(code === 2) return 'RECONNECTING';
            if(code === 3) return 'IDLE';
            if(code === 4) return 'NEARLY';
            if(code === 5) return 'DISCONNECTED';
        }

        const wintitle = [
            `OptiBot ${bot.version}`,
            `OP Mode ${bot.mode}`,
        ];

        if(bot.ws) {
            let code = bot.ws.status;

            if(bot.ws.shards.size > 0) code = bot.ws.shards.first().status;

            wintitle.push(
                `${Math.round(bot.ws.ping)}ms`,
                `WS Code ${code} (${statusName(code)})`
            );
        } else {
            wintitle.push(
                '-0ms',
                `WS Code 3 (${statusName(3)})`
            );
        }

        if(typeof Memory.wintitle === 'string') wintitle.push(Memory.wintitle);

        process.title = wintitle.join(' | ');
    }

    static parseInput(text) {
        const bot = Memory.core.client;
        const log = bot.log;

        if(typeof text !== 'string') text = new String(text);
        const input = text.trim().split('\n', 1)[0]; // first line of the message
        const data = {
            valid: input.match(new RegExp(`^(\\${bot.prefixes.join('|\\')})(?![^a-zA-Z0-9])[a-zA-Z0-9]+(?=\\s|$)`)), // checks if the input starts with the command prefix, immediately followed by valid characters.
            cmd: input.toLowerCase().split(' ')[0].substr(1),
            args: input.split(' ').slice(1).filter(function (e) { return e.length !== 0; })
        };

        if(input.match(/^(\$)(?![^0-9])[0-9]+(?=\s|$)/)) {
            // fixes "$[numbers]" resulting in false command inputs
            data.valid = null;
        }

        return data;
    }

    static getAuthlvl(member, ignoreElevated) {
        /**
         * Authorization Level
         * 
         * -1 = Muted Member (DM ONLY)
         * 0 = Normal Member
         * 1 = Advisor
         * 2 = Jr. Moderator
         * 3 = Moderator
         * 4 = Administrator
         * 5 = Bot Developer
         * 6+ = God himself
         */

        const bot = Memory.core.client;
        const log = bot.log;

        if(member.constructor === djs.User) {
            log('expected object type member, got user instead', 'warn');
            if(bot.cfg.superusers.includes(member.id) && !ignoreElevated) {
                return 5;
            }
        } else
        if(member !== null && member.constructor === djs.GuildMember) {
            if(bot.cfg.superusers.includes(member.user.id) && !ignoreElevated) {
                return 5;
            }
            if(member.permissions.has('ADMINISTRATOR')) {
                return 4;
            } 
            if(member.roles.cache.has(bot.cfg.roles.moderator)) {
                return 3;
            }
            if(member.roles.cache.has(bot.cfg.roles.jrmod)) {
                return 2;
            }
            if(member.roles.cache.has(bot.cfg.roles.advisor)) {
                return 1;
            }
            if(member.roles.cache.has(bot.cfg.roles.muted)) {
                return -1;
            }
        }

        return 0;
    }

    static missingArgs(m, metadata) {
        const bot = Memory.core.client;
        const log = bot.log;

        const embed = new djs.MessageEmbed()
            .setAuthor('Missing Arguments', Assets.getEmoji('ICO_warn').url)
            .setColor(bot.cfg.embed.default)
            .addField('Usage', Command.parseMetadata(metadata).args);

        m.channel.send({embed: embed}).then(bm => OptiBotUtilities.afterSend(bm, m.author.id));
    }

    /**
     * @param {OptiBot} bot OptiBot client.
     * @param {String} id Profile ID to search for.
     * @param {Boolean} [create] If true, and a profile with the given id does not exist, create a new profile. Otherwise, return null.
     * @returns {Promise<Profile>|Promise<null>}
     */
    static getProfile(id, create) {
        const bot = Memory.core.client;
        const log = bot.log;

        return new Promise((resolve, reject) => {
            log('get profile: '+id);
            Memory.db.profiles.find({ id: id, format: 3 }, (err, docs) => {
                if(err) {
                    reject(err);
                } else
                if(docs[0]) {
                    resolve(new Profile(docs[0]));
                } else
                if(create) {
                    resolve(new Profile({ id: id }));
                } else {
                    resolve();
                }
            });
        });
    }

    static updateProfile(data) {
        const bot = Memory.core.client;
        const log = bot.log;

        return new Promise((resolve, reject) => {
            let raw = data;

            if(data instanceof Profile) raw = data.raw;

            Memory.db.profiles.update({ id: raw.id }, raw, { upsert: true }, (err) => {
                if(err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }

    /**
     * Gets a user, member, or message based on various text-based shortcuts.
     * 
     * @param {djs.Message} m Author message.
     * @param {Number} type Target type. 0 = Member. 1 = Message.
     * @param {String} target Input to parse.
     * @param {djs.GuildMember} member Author as an OptiFine guild member.
     * @returns {Promise<Object>}
     */
    static parseTarget(m, type, target, member) {
        const bot = Memory.core.client;
        const log = bot.log;

        return new Promise((resolve, reject) => {
            log(`get target from ${target}`);
            log(`select type ${type}`);

            if(!target) {
                log('auto-target: self');
                target = 'me';
            }

            if (['previous', 'last', 'recent', 'prev'].includes(target.toLowerCase())) {
                log('last target');
                if(Memory.targets[m.author.id] !== undefined) {
                    log('exists');
                    if(type === 0) {
                        target = Memory.targets[m.author.id].u;
                    } else
                    if(type === 1) {
                        target = Memory.targets[m.author.id].m;
                    }
                } else {
                    log('does not exist');
                }
            }

            function remember(final) {
                const final_fixed = final;
    
                if(final) {
                    if(final.type !== 'notfound') {
                        const slot = Memory.targets[m.author.id];
                        if(slot) {
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
                    } else 
                    if (final.type === 'member') {
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
                    if(type === 0) {
                        remember({ type: 'member', target: mem });
                    } else
                    if(type === 1) {
                        if(mem.lastMessage) {
                            remember({ type: 'message', target: mem.lastMessage });
                        } else {
                            remember({ type: 'notfound', target: null });
                        }
                    }
                }).catch(err => {
                    if (err.message.match(/invalid or uncached|unknown member|unknown user/i)) {
                        if(type === 0) {
                            bot.users.fetch(id).then(user => {
                                remember({ type: 'user', target: user });
                            }).catch(err => {
                                if(err.message.match(/invalid or uncached|unknown member|unknown user/i)) {
                                    remember({ type: 'id', target: id });
                                } else {
                                    reject(err);
                                }
                            });
                        } else
                        if(type === 1) {
                            remember({ type: 'notfound', target: null });
                        }
                    } else {
                        reject(err);
                    }
                });
            }
            
            if (['self', 'myself', 'me'].includes(target.toLowerCase())) {
                log('self');
                if(type === 0) {
                    remember({ type: 'member', target: member });
                } else
                if(type === 1) {
                    if(member.lastMessage) {
                        remember({ type: 'message', target: member.lastMessage });
                    } else {
                        remember({ type: 'notfound', target: null });
                    }
                }
            } else
            if (['someone', 'somebody', 'random', 'something'].includes(target.toLowerCase())) {
                log('random');
                if(m.channel.type === 'dm') {
                    if(type === 0) {
                        remember({ type: 'member', target: member });
                    } else
                    if(type === 1) {
                        if(member.lastMessage) {
                            remember({ type: 'message', target: member.lastMessage });
                        } else {
                            remember({ type: 'notfound', target: null });
                        }
                    }
                } else
                if(type === 0) {
                    let users = [];
                    if(m.guild.id !== bot.cfg.guilds.optifine) {
                        users = [...bot.guilds.cache.get(bot.cfg.guilds.optifine).members.cache.values()];
                    } else {
                        users = [...m.guild.members.cache.values()];
                    }
    
                    log(users.length);
    
                    const someone = users[~~(Math.random() * users.length)];
                    remember({ type: 'member', target: someone });
                } else
                if(type === 1) {
                    const channels_unfiltered = [...bot.guilds.cache.get(bot.cfg.guilds.optifine).channels.cache.values()];
                    const channels = [];
                    const blacklist = bot.cfg.channels.mod.concat(bot.cfg.channels.blacklist);
    
                    channels_unfiltered.forEach((channel) => {
                        if(!blacklist.includes(channel.id) && !blacklist.includes(channel.parentID) && channel.type === 'text' && channel.messages.cache.size > 0) {
                            channels.push(channel);
                        }
                    });
    
                    if(channels.length === 0) {
                        remember({ type: 'notfound', target: null });
                    } else {
                        let attempts = 0;
                        (function roll() {
                            attempts++;
                            const fc = channels[~~(Math.random() * channels.length)];
    
                            log(fc);
    
                            const fm = [...fc.messages.cache.values()];
                            const final_msg = fm[~~(Math.random() * fm.length)];
    
                            if(final_msg.content.length !== 0) {
                                remember({ type: 'message', target: final_msg });
                            } else 
                            if (attempts === 3) {
                                remember({ type: 'notfound', target: null });
                            } else {
                                roll();
                            }
                        })();
                    }
                }
            } else
            if (target.match(/<@!?\d{13,}>/) !== null) {
                log('@mention');
    
                const id = target.match(/\d{13,}/)[0];
    
                if (Number.isInteger(parseInt(id)) && parseInt(id) >= 1420070400000) {
                    checkServer(id);
                } else {
                    remember();
                }
            } else
            if (target.match(/^\^{1,10}$/) !== null) {
                log('arrow shortcut');
                if(m.channel.type === 'dm') {
                    remember({ type: 'notfound', target: null });
                } else {
                    m.channel.messages.fetch({ limit: 25 }).then(msgs => {
                        const itr = msgs.values();
                        const skip_t = target.length-1;
                        let skipped = 0;
    
                        log(`skip target: ${skip_t}`);
        
                        (function search() {
                            const thisID = itr.next();
                            if (thisID.done) {
                                remember({ type: 'notfound', target: null });
                            } else
                            if (![m.author.id, bot.user.id].includes(thisID.value.author.id) && !thisID.value.author.bot) {
                                // valid msg
                                log(`skip: ${skip_t} === ${skipped} (${skip_t === skipped})`);
                                if(skip_t === skipped) {
                                    log(`message age: ${(m.createdTimestamp - thisID.value.createdTimestamp).toLocaleString()}ms`);
                                    if(thisID.value.createdTimestamp + 1000 > m.createdTimestamp) {
                                        log('extremely recent message skipped', 'debug');
                                        search();
                                    } else
                                    if(m.guild.id !== bot.cfg.guilds.optifine && type === 0) {
                                        checkServer(thisID.value.member.id);
                                    } else {
                                        if(type === 0) {
                                            remember({ type: 'member', target: thisID.value.member });
                                        } else
                                        if(type === 1) {
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
            } else
            if (!isNaN(target) && parseInt(target) >= 1420070400000) {
                log('id');
                if(type === 0) {
                    checkServer(target);
                } else
                if(type === 1) {
                    remember();
                }
            } else 
            if(target.match(/discordapp\.com|discord.com/i)) {
                log('url');
                const urls = m.content.match(/\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/gi);
    
                if(urls !== null) {
                    const seg = urls[0].split(/(?<!\/)\/(?!\/)|(?<!\\)\\(?!\\)/g).reverse();
    
                    log(seg.length);
    
                    if(seg.length === 5 && !isNaN(parseInt(seg[0])) && !isNaN(parseInt(seg[1])) && !isNaN(parseInt(seg[2]))) {
                        const rg = seg[2];
                        const rc = seg[1];
                        const rm = seg[0];
    
                        bot.guilds.cache.get(rg).channels.cache.get(rc).messages.fetch(rm).then(msg => {
                            if(type === 0) {
                                remember({ type: 'member', target: msg.member });
                            } else
                            if(type === 1) {
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
    }

    static confirm(m, bm) {
        const bot = Memory.core.client;
        const log = bot.log;

        return new Promise((resolve, reject) => {
            m.channel.stopTyping(true);
    
            const filter = (r, user) => [bot.cfg.emoji.confirm, bot.cfg.emoji.cancel].indexOf(r.emoji.id) > -1 && user.id === m.author.id;
            const df = bm.createReactionCollector(filter, { time: (1000 * 60 * 5) });
    
            df.on('collect', r => {
                df.stop('done');
    
                if(r.emoji.id === bot.cfg.emoji.confirm) {
                    resolve(1);
                } else {
                    resolve(0);
                }
            });
    
            df.on('end', (c, reason) => {
                if(!bm.deleted) {
                    bm.reactions.removeAll().then(() => {
                        if(reason === 'done') {
                            return;
                        } else
                        if(reason === 'time') {
                            resolve(-1);
                        } else {
                            log(reason, 'error');
                        }
                    });
                }
            });
    
            const ob = bot.guilds.cache.get(bot.cfg.guilds.optibot);
            bm.react(ob.emojis.cache.get(bot.cfg.emoji.confirm)).then(() => {
                bm.react(ob.emojis.cache.get(bot.cfg.emoji.cancel)).catch(err => {
                    df.stop();
                    reject(err);
                });
            }).catch(err => {
                df.stop();
                reject(err);
            });
        });
    }

    /**
     * Creates a simple, pre-formatted error message.
     * 
     * @param {(Error|String)} err The error message or object.
     * @param {OptiBot} [bot] OptiBot
     */
    static err(err, data = {}) {
        const bot = Memory.core.client;
        const log = bot.log;
    
        const embed = new djs.MessageEmbed()
            .setColor(bot.cfg.embed.error);
    
        if(err instanceof Error) {
            log(err.stack, 'error');

            const lines = err.stack.split('\n');

            let formatted = [
                err.toString()
            ];

            if(bot.mode < 2) {
                for(const line of lines) {
                    if(line.includes('node_modules')) break;
    
                    let file = line.match(new RegExp(`${Memory.core.root.drive}\\[^,]+\\d+:\\d+`));
                    if(!file) continue;
                    file = file[0];
    
                    let trace = line.match(/(?<=at\s)[^\r\n\t\f\v(< ]+/);
                    if(trace) trace = trace[0];
    
                    let evalTrace = line.match(/(?<=<anonymous>):\d+:\d+/);
                    if(evalTrace) evalTrace = evalTrace[0];
    
                    let str = '';

                    const fileshort = file.replace(Memory.core.root.dir, '~');
    
                    if(trace && trace !== file) {
                        if(trace === 'eval') {
                            str += trace + evalTrace;
                            formatted.push(str);
                            formatted.push(fileshort);
                        } else 
                        if(evalTrace) {
                            str += `${trace} (at eval${evalTrace}, ${fileshort})`;
                            formatted.push(str);
                        } else {
                            str += `${trace} (${fileshort})`;
                            formatted.push(str);
                        }
                    } else {
                        str += fileshort;
                        formatted.push(str);
                    }
                }
    
                formatted = [...new Set(formatted)];
            }
    
            embed.setAuthor('Something went wrong.', Assets.getEmoji('ICO_error').url)
                .setTitle(bot.cfg.messages.error[~~(Math.random() * bot.cfg.messages.error.length)])
                .setDescription(`\`\`\`diff\n- ${formatted.join('\n-   at ')}\`\`\``);
        } else {
            embed.setAuthor(err, Assets.getEmoji('ICO_error').url);
        }
    
        // log(util.inspect(data));
    
        if(data.m) {
            data.m.channel.send({embed: embed}).then(bm => {
                OptiBotUtilities.afterSend(bm, data.m.author.id);
            }).catch(e => log(e.stack, 'error'));
        } else {
            return embed;
        }
    }

    static parseTime(input) {
        const bot = Memory.core.client;
        const log = bot.log;

        const result = {
            valid: false,
            string: '1 hour',
            ms: 1000 * 60 * 60
        };
    
        if(typeof input !== 'string' || input.length === 0) {
            return result;
        }
    
        const split = input.split(/(?<=\d)(?=\D)/g);
        const num = parseInt(split[0]);
        const measure = (split[1]) ? split[1].toLowerCase() : 'h';
        let tm = 'hour';
    
        if (isNaN(num)) {
            return result;
        }
    
        result.valid = true;
    
        if(measure === 's') {
            tm = 'second';
            result.ms = 1000 * num;
        } else
        if(measure === 'm') {
            tm = 'minute';
            result.ms = 1000 * 60 * num;
        } else
        if(measure === 'd') {
            tm = 'day';
            result.ms = 1000 * 60 * 60 * 24 * num;
        } else
        if(measure === 'w') {
            tm = 'week';
            result.ms = 1000 * 60 * 60 * 24 * 7 * num;
        } else {
            tm = 'hour';
            result.ms = 1000 * 60 * 60 * num;
        }
    
        result.string = `${num} ${tm}${(num !== 1) ? 's' : ''}`;
        result.split = split;
    
        return result;
    }

    /**
     * Performs various actions after sending a message.
     * This should ONLY be used in the `then()` function of a `channel.send()` promise.
     * 
     * @param {djs.Message} bm The message that OptiBot has just sent.
     * @param {String} author The original message author ID.
     * 
     * 
     */
    static afterSend(bm, author) {
        const bot = Memory.core.client;
        const log = bot.log;

        bm.channel.stopTyping(true);
        if(bm.channel.type === 'dm') return;
    
        log('message sent, adding to cache', 'debug');
        bm.react(bot.guilds.cache.get(bot.cfg.guilds.optibot).emojis.cache.get(bot.cfg.emoji.deleter)).then(() => {
            const cacheData = {
                guild: bm.guild.id,
                channel: bm.channel.id,
                message: bm.id,
                user: author
            };

            Memory.db.msg.insert(cacheData, (err) => {
                if (err) {
                    OptiBotUtilities.err(err);
                } else {
                    log('successfully added message to cache', 'debug');
                    log('checking cache limit', 'debug');
                    Memory.db.msg.find({}).sort({ message: 1 }).exec((err, docs) => {
                        if (err) {
                            OptiBotUtilities.err(err);
                        } else
                        if (docs.length > bot.cfg.db.limit) {
                            log('reached cache limit, removing first element from cache.', 'debug');
                            Memory.db.msg.remove(docs[0], {}, (err) => {
                                if (err) {
                                    OptiBotUtilities.err(err);
                                } else {
                                    try {
                                        bot.guilds.cache.get(docs[0].guild).channels.cache.get(docs[0].channel).messages.fetch(docs[0].message).then((msg) => {
                                            const reaction = msg.reactions.cache.get('click_to_delete:'+bot.cfg.emoji.deleter);
    
                                            if(reaction && reaction.me) {
                                                reaction.remove().then(() => {
                                                    log('Time expired for message deletion.', 'trace');
                                                }).catch(err => {
                                                    OptiBotUtilities.err(err);
                                                });
                                            }
                                        }).catch(err => {
                                            OptiBotUtilities.err(err);
                                        });
                                    }
                                    catch(err) {
                                        OptiBotUtilities.err(err);
                                    }
                                }
                            });
                        }
                    });
                }
            });
        }).catch(err => {
            OptiBotUtilities.err(err);
        });
    }

    static unmuter(id) {
        const bot = Memory.core.client;
        const log = bot.log;

        return new Promise((resolve, reject) => {
            const errHandler = (err, user) => {
                OptiBotUtilities.err(err);
        
                let type = null;
                if(user) type = (user.constructor === djs.User) ? 'user' : 'member';
        
                const logEntry = new LogEntry({channel: 'moderation'})
                    .setColor(bot.cfg.embed.error)
                    .setIcon(Assets.getEmoji('ICO_error').url)
                    .setTitle('Member Unmute Failure', 'Member Mute Removal Failure Report')
                    .setHeader('An error occurred while trying to unmute a user.')
                    .setDescription(`\`\`\`diff\n-${err}\`\`\``);
        
                if(user) {
                    logEntry.addSection('Member', (type === 'user') ? user : user.user)
                        .setThumbnail(((type === 'user') ? user : user.user).displayAvatarURL({format:'png'}));
                } else {
                    logEntry.addSection('Member', 'Unknown. (Error occurred before or during fetch operation)');
                }
        
                logEntry.submit().then(() => {
                    resolve();
                }).catch(err => {
                    OptiBotUtilities.err(err);
                    resolve();
                });
            };

            bot.mainGuild.members.fetch(id).then(mem => {
                removeRole(mem);
            }).catch(err => {
                if (err.message.match(/invalid or uncached|unknown member|unknown user/i)) {
                    bot.users.fetch(id).then(user => {
                        removeRole(user);
                    }).catch(err => {
                        errHandler(err);
                    });
                } else {
                    errHandler(err);
                }
            });
        
            function removeRole(user) {
                if(user.constructor === djs.User) {
                    removeProfileData(user, 'user');
                } else {
                    user.roles.remove(bot.cfg.roles.muted, 'Mute period expired.').then(() => {
                        removeProfileData(user, 'member');
                    }).catch(err => {
                        log(util.inspect(user));
                        errHandler(err, user);
                    });
                }
            }
        
            function removeProfileData(user, type) {
                OptiBotUtilities.getProfile(id, false).then(profile => {
                    if(profile) {
                        /* let entry = new RecordEntry()
                        .setMod(bot.user.id)
                        .setAction('mute')
                        .setActionType('remove')
                        .setReason(bot.user, `Mute period expired.`)
                        .setParent(bot.user, profile.edata.mute.caseID)
        
                        if(!profile.edata.record) profile.edata.record = [];
                        profile.edata.record.push(entry.raw); */
        
                        delete profile.edata.mute;
        
                        OptiBotUtilities.updateProfile(profile).then(() => {
                            finish(user, type);
                        }).catch(err => {
                            errHandler(err, user);
                        });
                    } else {
                        finish(user, type);
                    }
                }).catch(err => {
                    errHandler(err, user);
                });
            }
        
            function finish(user, type) {
                for(let i = 0; i < Memory.mutes.length; i++) {
                    const mute = Memory.mutes[i];
                    if(mute.id === id) {
                        Memory.mutes.splice(i, 1);
                    }
                }
        
                const logEntry = new LogEntry({channel: 'moderation'})
                    .setColor(bot.cfg.embed.default)
                    .setIcon(Assets.getEmoji('ICO_unmute').url)
                    .setTitle('Member Unmuted', 'Member Mute Removal Report')
                    .setHeader('Reason: Mute period expired.')
                    .addSection('Member Unmuted', (type === 'user') ? user : user.user)
                    .setThumbnail(((type === 'user') ? user : user.user).displayAvatarURL({format:'png'}))
                    .submit().then(() => {
                        resolve();
                    }).catch(err => {
                        OptiBotUtilities.err(err);
                        resolve();
                    });
            }
        });
    }

    /**
     * end my fucking life
     * 
     * @param {String} str text to uwuify
     */
    static uwu(str) {
        const bot = Memory.core.client;
        const log = bot.log;
        
        const words = str.split(' ');
        let newStr = '';
        const url = /\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/gi;
    
        const replacements = [
            {
                match: ['you'],
                replace: ['you', 'u', 'yu', 'yew']
            },
            {
                match: ['your'],
                replace: ['your', 'ur', 'yur', 'yer']
            },
            {
                match: ['stuff'],
                replace: ['stuff', 'stuffz', 'stuffs']
            },
            {
                match: ['lol', 'lel', 'lul', 'xd'],
                replace: ['lol', 'xD', 'xDDD', 'lol xDD', 'lol XD UwU']
            },
            {
                match: [':)', 'c:', 'ouo', ':3'],
                replace: [':3', 'UwU', 'OwO']
            },
            {
                match: [':(', ':C', 'T-T'],
                replace: ['QwQ']
            },
            {
                match: ['what', 'wut'],
                replace: ['what', 'wat']
            },
            {
                match: ['over'],
                replace: ['ova', 'ovuh', 'ovoh']
            },
        ];
    
        const exceptions = [
            'your',
            'ur',
            'or',
            'over'
        ];
    
        const exclamation = (match) => {
            // procedural exclamation/question mark generator
            // because why the fuck not
    
            const minLength = Math.max(match.length, 3); // original marks, 3 chars absolute minimum
            const maxLength = Math.min(match.length+6, 12); // original marks + 6, 12 chars absolute maximum
            const length = ~~(Math.random() * (maxLength - minLength + 1) + minLength);
    
            let weight = 0; // weight of exclamation points. max is 1.0
            if(match.indexOf('!') > -1 && match.indexOf('?') == -1) {
                weight = 1;
            } else if (match.indexOf('?') > -1 && match.indexOf('!') == -1) {
                weight = 0.25;
            } else {
                weight = (match.split('!').length-1 / match.length);
            }
    
            let ex = '';
            for(let i = 0; i < length; i++) {
                if(Math.random() > weight) {
                    ex += (Math.random() < (weight / 4)) ? '1' : '!';
                } else {
                    ex += '?';
                }
            }
    
            return ex;
        };
    
        for(let i = 0; i < words.length; i++) {
            let word = words[i];
    
            if(word.match(url) === null) {
                if(exceptions.indexOf(word) == -1) {
                    word = word.replace(/[rl]/g, 'w')
                        .replace(/[RL]/g, 'W')
                        .replace(/n([aeiou])(?=\S)/g, 'ny$1')
                        .replace(/N([aeiou])(?=\S)/g, 'Ny$1')
                        .replace(/N([AEIOU])(?=\S)/g, 'Ny$1')
                        .replace(/ove/g, 'uv')
                        .replace(/OVE/g, 'UV')
                        .replace(/[!?]+$/g, exclamation);
                }
    
                for(let i2 = 0; i2 < replacements.length; i2++) {
                    const r = replacements[i2];
                    for(let i3 = 0; i3 < replacements.length; i3++) {
                        if(word.toLowerCase() == r.match[i3]) {
                            word = r.replace[~~(Math.random() * r.replace.length)];
                        }
                    }
                }
    
                log(word);
                newStr += word+' ';
            }
        }
    
        const face = ['OwO', 'UwU', '', ''];
    
        return `${newStr}${face[~~(Math.random() * face.length)]}`;
    }

    static verifyDonator(member) {
        const bot = Memory.core.client;
        const log = bot.log;
        
        return new Promise((resolve, reject) => {
            log(`${member.user.tag} (${member.user.id}) joined OptiFine Donator server!`, 'info');

            function grantRole() {
                member.roles.add(bot.cfg.roles.donatorServer, 'Verified Donator via OptiFine Server.').then(() => {
                    log(`${member.user.tag} (${member.user.id}) has been successfully verified as a donator.`, 'info');
                    resolve();
                }).catch(err => {
                    log(`Error occurred while verifying ${member.user.tag} (${member.user.id}) as a donator.`, 'error');
                    reject(err);
                });
            }

            function kick() {
                member.kick('Unverified Donator.').then(() => {
                    log(`Kicked ${member.user.tag} (${member.user.id}) for not being a verified donator.`, 'info');
                    resolve();
                }).catch(err => {
                    log(`Error occurred while kicking ${member.user.tag} (${member.user.id}) from donator server.`, 'error');
                    reject(err);
                });
            }
            
            bot.mainGuild.members.fetch(member.user.id).then((ofm) => {
                if (ofm.roles.cache.has(bot.cfg.roles.donator)) {
                    if(!member.roles.cache.has(bot.cfg.roles.donatorServer)) {
                        grantRole();
                    } else {
                        resolve();
                    }
                } else {
                    kick();
                }
            }).catch(err => {
                if(err.message.match(/invalid or uncached|unknown member|unknown user/i) !== null) {
                    kick();
                } else {
                    log(`Error occurred while verifying ${member.user.tag} (${member.user.id}) as a donator.`, 'error');
                    reject(err);
                }
            });
        });
    }

    static calculatePoints(date, total) {
        const bot = Memory.core.client;
        const log = bot.log;

        const daysSince = Math.round((Date.now() - date) / (1000 * 60 * 60 * 24));

        log(`days since: ${daysSince}`);
            
        if (daysSince > bot.cfg.points.decayDelay) {
            const decay = total - (bot.cfg.points.dailyDecay * (daysSince - bot.cfg.points.decayDelay));
            const minimum = (bot.cfg.points.minPercentDecay / 100) * total;

            log(`decay: ${decay}`);
            log(`minimum: ${minimum}`);

            return Math.max(decay, minimum);
        }

        return total;
    }
};
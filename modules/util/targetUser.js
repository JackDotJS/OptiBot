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
 * @param {Function} log A function to send log events to. These are pretty much only for debugging.
 * @returns {Promise<Object>} `{ type, target }`
 */

module.exports = (m, target, bot, log = function(){}, data) => {
    return new Promise((resolve, reject) => {
        log('get user id out of '+target, 'trace');

        log(target.match(/^(<@).*(>)$/) !== null, 'trace');
        log(m.mentions.users.size > 0, 'trace');
        log(target.match(/^(<@).*(>)$/) !== null && m.mentions.users.size > 0, 'trace');

        function checkServer(id) {
            bot.guilds.get(bot.cfg.guilds.optifine).fetchMember(id).then(mem => {
                resolve({ type: "user", target: mem });
            }).catch(err => {
                if (err.stack.indexOf('Invalid or uncached') > -1) {
                    resolve({ type: "id", target: id });
                } else {
                    reject(err);
                }
            });
        }

        if (target.toLowerCase() === 'me' || target.toLowerCase() === 'myself') {
            log('self')
            resolve({ type: "user", target: data.member });
        } else
        if (target.toLowerCase() === 'someone' || target.toLowerCase() === 'somebody' || target.toLowerCase() === 'random') {
            log('random user')
            if(m.channel.type === 'dm') {
                checkServer(m.author.id);
            } else {
                let users = [];
                if(m.guild.id !== bot.cfg.guilds.optifine) {
                    users = [...bot.guilds.get(bot.cfg.guilds.optifine).members.values()];
                } else {
                    users = [...m.guild.members.values()];
                }

                log(users.length)

                let someone = users[~~(Math.random() * users.length)];
                resolve({ type: "user", target: someone });
            }
        } else
        if (target.match(/^(<@).*(>)$/) !== null && m.mentions.users.size > 0) {
            log('@mention')
            if(m.mentions.members !== null && m.guild.id === bot.cfg.guilds.optifine) {
                resolve({ type: "user", target: m.mentions.members.first(1)[0] });
            } else {
                checkServer(m.mentions.users.first(1)[0].id);
            }
        } else
        if (target === "^") {
            log('target shortcut')
            m.channel.fetchMessages({ limit: 25 }).then(msgs => {
                let itr = msgs.values();

                (function search() {
                    let thisID = itr.next();
                    if (thisID.done) {
                        resolve({ type: "notfound", target: null });
                    } else
                        if ([m.author.id, bot.user.id].indexOf(thisID.value.author.id) === -1 && !thisID.value.author.bot) {
                            if(m.guild.id !== bot.cfg.guilds.optifine) {
                                checkServer(thisID.value.member.user.id);
                            } else {
                                resolve({ type: "user", target: thisID.value.member });
                            }
                        } else {
                            search();
                        }
                })();
            }).catch(err => reject(err));
        } else
        if (!isNaN(target)) {
            log('id')
            checkServer(target);
        } else {
            resolve();
        }
    });
}
const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    aliases: ['pingmods', 'moderator', 'moderators'],
    short_desc: `Ping server moderators.`,
    long_desc: `Pings server moderators. This command should only be used for *legitimate reasons,* such as reporting rule breakers or requesting server roles. Think of it as actually pinging a role. **Continually using this command improperly will not be tolerated.** \n\nAdditionally, this command tries to minimize mass pings by only selecting moderators that have sent a message in the past 10 minutes, or those who are simply online. \nThe selection priority works as followed:\n\n**1.** Recent Messages\n**2.** "Online" status\n**3.** All with the <@&467060304145023006> or <@&644668061818945557> roles.`,
    authlvl: 0,
    flags: ['NO_DM', 'NO_TYPER', 'STRICT'],
    run: null
}


metadata.run = (m, args, data) => {
    let pinged = [m.author.id];
    
    let pingType = 0;
    let attempts = 0;
    let text = null;
    let text_ur = null;

    let guild = bot.guilds.cache.get(bot.cfg.guilds.optifine);
    let role_mod = guild.roles.cache.get(bot.cfg.roles.moderator);
    let role_jrmod = guild.roles.cache.get(bot.cfg.roles.jrmod);

    function getPings() {
        let pings_msg = [];
        let pings_status = [];
        let pings_all = [];
        let pings_everyone = [];
        for(let i = 0; i < Memory.mods.length; i++) {
            let mod = Memory.mods[i];
            if(pinged.indexOf(mod.id) === -1) {
                if(mod.status === 'online') {
                    pings_status.push(mod.id);
                }
                if((mod.last_message + 600000) > new Date().getTime()) {
                    pings_msg.push(mod.id);
                }
                pings_all.push(mod.id);
            }
            pings_everyone.push(mod.id);

            if(i+1 === Memory.mods.length) {
                if(attempts === 0) {
                    if(pings_msg.length > 1) pings_msg = [pings_msg[~~(Math.random() * pings_msg.length)]];
                    if(pings_status.length > 1) pings_status = [pings_status[~~(Math.random() * pings_status.length)]];
                }

                return {
                    recent: pings_msg,
                    online: pings_status,
                    all: pings_all,
                    everyone: pings_everyone
                }
            }
        }
    }

    if(Memory.mpc.indexOf(m.channel.id) > -1) {
        m.channel.send(`Sorry ${m.author}, this command is currently on cooldown in this channel. Please wait a few moments before trying this again.`)
        .then(bm => OBUtil.afterSend(bm, m.author.id));
        return
    }

    let result = getPings();

    if(result.recent.length === 0) {
        pingType = 1;
        if(result.online.length === 0) {
            pingType = 2;
            // worst case scenario: no active mods, no online mods.

            if((role_mod.mentionable && role_jrmod.mentionable) || guild.members.cache.get(bot.user.id).hasPermission('MENTION_EVERYONE', {checkAdmin: true})) {
                text = `${m.author}, a moderator should be with you soon! \n${role_mod} ${role_jrmod}`;
            } else {
                text = `${m.author}, one of these moderators should be with you soon! \n<@${result.all.join('> <@')}>`;
            }
        } else
        if(result.online.length === 1) {
            // no active mods, one online mod
            pinged.push(result.online[0]);
            text = `${m.author}, moderator <@${result.online[0]}> should be with you soon!`;
        } else {
            // no active mods, some online mods
            pinged = pinged.concat(result.online);
            text = `${m.author}, one of these moderators should be with you soon! \n<@${result.online.join('> <@')}>`;
        }
    } else 
    if(result.recent.length === 1) {
        // one active mod
        pinged.push(result.recent[0]);
        text = `${m.author}, moderator <@${result.recent[0]}> should be with you soon!`;
    } else {
        // best case scenario: some active mods
        pinged = pinged.concat(result.recent);
        text = `${m.author}, one of these moderators should be with you soon! \n<@${result.recent.join('> <@')}>`;
    }

    if(pingType !== 2) text_ur = `${text}\n\nModerators: If you see this and you're available, please use the reaction button (<:confirm:672309254279135263>) or send a message in this channel to begin resolving this issue.`;

    m.channel.send(text_ur).then(msg => {
        Memory.mpc.push(m.channel.id);
        attempts++;

        const filter = (r, user) => r.emoji.id === bot.cfg.emoji.confirm && result.everyone.indexOf(user.id) > -1;
        const filter_m = (mm) => result.everyone.indexOf(mm.author.id) > -1;
        
        function tryResolution(godfuckingdammit) {
            if(pingType === 2) return;
            const df = msg.createReactionCollector(filter, { time: (1000 * 60) });
            const mc = msg.channel.createMessageCollector(filter_m);

            df.on('collect', (r, user) => {
                df.stop('resolved');
                
                resolve()
                msg.edit(`~~${text}~~ \n\n**Resolved by ${user.toString()}**`)
            });

            mc.on('collect', (mm) => {
                /**
                 * the only reason we need the bot's own reaction
                 * is explicitly so this exact function works. the
                 * reaction is literally never used for anything
                 * except to prevent D.JS from throwing an error
                 * here. its fucking stupid i know but it's the
                 * only way i can make this work right now and im
                 * tired. fuck you
                 */
                df.handleCollect(godfuckingdammit, mm.author);
            })

            df.on('end', (c, reason) => {
                mc.stop();
                if(reason === 'time') {
                    // post next level of pings
                    if(pingType !== 2 && pinged.length !== result.everyone.length) {
                        result = getPings();
                        let newtext = [
                            `**Original Message: <${msg.url}>**`,
                            ``,
                            `It seems like they were busy. Let's try pinging some others.`
                        ]

                        if(pingType === 0 && result.online.length > 0) {
                            if(result.online.length === 1) {
                                pinged.push(result.online[0]);
                                newtext.push(`<@${result.online[0]}>`);
                            } else {
                                pinged = pinged.concat(result.online);
                                newtext.push(`<@${result.online.join('> <@')}>`);
                            }
                        } else {
                            pinged = pinged.concat(result.all);
                            newtext.push(`<@${result.all.join('> <@')}>`);
                        }

                        if(pinged.length !== result.everyone.length) {
                            newtext.push(``, `Moderators: If you see this and you're available, please post a message here or use the reaction button **on the original message above** to begin resolving this issue.`)
                        } else {
                            msg.edit(text)
                        }

                        m.channel.send(newtext.join('\n')).then(() => {
                            attempts++;
                            if(pinged.length !== result.everyone.length) {
                                if(attempts > 2) pingType++;
                                tryResolution(godfuckingdammit);
                            } else {
                                resolve()
                            }
                        });
                    } else {
                        resolve()
                    }
                } else
                if(reason !== 'resolved') {
                    log(reason, 'error');
                }
            });
        }

        function resolve() {
            Memory.mpc.splice(Memory.mpc.indexOf(m.channel.id), 1);
            if(!msg.deleted) {

                msg.reactions.removeAll();
            }
        }

        msg.react(bot.guilds.cache.get(bot.cfg.guilds.optibot).emojis.cache.get(bot.cfg.emoji.confirm)).then(r => {
            tryResolution(r);
        }).catch(err => {
            OBUtil.err(err, {m:m});
        });
    })
}

module.exports = new Command(metadata);
const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    aliases: ['pingmods', 'moderator', 'moderators', 'mods'],
    short_desc: `Ping server moderators.`,
    long_desc: `Pings server moderators. This command should only be used for *legitimate reasons,* such as reporting rule breakers or requesting server roles. Think of it as actually pinging a role. **Continually using this command improperly will not be tolerated.** \n\nAdditionally, this command tries to minimize mass pings by only selecting moderators that have sent a message in the past 10 minutes, or those who are simply online. \nThe selection priority works as followed:\n\n**1.** Recent Messages\n**2.** "Online" status\n**3.** All with the <@&467060304145023006> or <@&644668061818945557> roles.`,
    authlvl: 0,
    flags: ['NO_DM', 'NO_TYPER', 'STRICT'],
    run: null
}


metadata.run = (m, args, data) => {
    let pinged = [m.author.id];

    let pings = null;
    
    let pingType = 0;
    let attempts = 0;
    let startMsg = []

    function getPings() {
        let pings = {
            recent: [],
            online: [],
            all: [],
            everyone: [], // everyone including already pinged
        }

        let data = {
            ids: null,
            selectTier: 0,
            mentions: null,
            count: null
        }

        for(let i = 0; i < Memory.mods.length; i++) {
            let mod = Memory.mods[i];

            pings.everyone.push(mod.id);

            if(!pinged.includes(mod.id)) {
                pings.all.push(mod.id);

                if(mod.status === 'online') {
                    pings.online.push(mod.id);
                }

                if((mod.last_message + 600000) > new Date().getTime()) {
                    pings.recent.push(mod.id);
                }
            }
        }

        if(attempts === 0) {
            if(pings.recent.length > 1) pings.recent = [pings.recent[~~(Math.random() * pings.recent.length)]];
            if(pings.online.length > 1) pings.online = [pings.online[~~(Math.random() * pings.online.length)]];
            if(pings.all.length > 1) pings.all = [pings.all[~~(Math.random() * pings.all.length)]];
        }

        if(pings.recent.length === 0) {
            if(pings.online.length === 0) {
                // worst case scenario: no active mods, no online mods.

                data.selectTier = 2;

                let role_mod = bot.mainGuild.roles.cache.get(bot.cfg.roles.moderator);
                let role_jrmod = bot.mainGuild.roles.cache.get(bot.cfg.roles.jrmod);

                if(pinged.length === 1 && ((role_mod.mentionable && role_jrmod.mentionable) || bot.mainGuild.me.hasPermission('MENTION_EVERYONE', {checkAdmin: true}))) {
                    data.count = pings.everyone.length;
                    data.mentions = `${role_mod} ${role_jrmod}`;
                } else {
                    pinged.push(...pings.all);
                    data.count = pings.all.length;
                    data.mentions = `<@${pings.all.join('> <@')}>`;
                }
            } else {
                // no active mods, AT LEAST ONE online mod
                data.selectTier = 1;

                pinged.push(...pings.online);
                data.count = pings.online.length;
                data.mentions = `<@${pings.online.join('> <@')}>`;
            }
        } else {
            // best case scenario: AT LEAST ONE active mod
            pinged.push(...pings.recent);
            data.count = pings.recent.length;
            data.mentions = `<@${pings.recent.join('> <@')}>`;
        }

        data.ids = pings;
        return data;
    }

    if(Memory.mpc.includes(m.channel.id)) {
        return m.channel.send(`Sorry ${m.author}, this command is currently on cooldown in this channel. Please wait a few moments before trying this again.`)
        .then(bm => OBUtil.afterSend(bm, m.author.id));
    } else {
        Memory.mpc.push(m.channel.id);
    }

    pings = getPings();

    if (pings.count > 5) {
        startMsg.push(`${m.author}, a moderator should be with you soon! \n${pings.mentions}`);
    } else
    if (pings.count === 1) {
        startMsg.push(`${m.author}, moderator ${pings.mentions} should be with you soon!`);
    } else {
        startMsg.push(`${m.author}, one of these moderators should be with you soon! \n${pings.mentions}`);
    }

    if(pings.selectTier !== 2) startMsg.push(
        ``,
        `Moderators: If you're available, please use the reaction button (<:confirm:672309254279135263>) or send a message in this channel to begin resolving this issue.`
    );

    m.channel.send(startMsg.join('\n')).then(msg => {
        attempts++;

        // reaction filter
        const filter = (r, user) => r.emoji.id === bot.cfg.emoji.confirm && pings.ids.everyone.includes(user.id);
        // message filter
        const filter_m = (mm) => pings.ids.everyone.includes(mm.author.id);
        
        function tryResolution(godfuckingdammit) {
            if(pings.selectTier === 2 && attempts === 0) return;

            let timeout = (1000 * 30 * attempts);

            log(`modping: waiting for ${timeout/1000} seconds`);

            const df = msg.createReactionCollector(filter, { time: timeout });
            const mc = msg.channel.createMessageCollector(filter_m);

            df.on('collect', (r, user) => {
                df.stop('resolved');
                
                resolve()
                msg.edit([
                    `~~${startMsg[0]}~~`,
                    ``,
                    `**Resolved by ${user.toString()}**`
                ].join('\n'))
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
                    if(pingType !== 2 && pinged.length !== pings.ids.everyone.length) {
                        pings = getPings();

                        let newtext = [
                            `**Original Message: <${msg.url}>**`,
                            ``,
                            `It seems like they were busy. Let's try pinging some others.`,
                            pings.mentions
                        ];

                        if(pinged.length !== pings.ids.everyone.length) {
                            newtext.push(
                                ``, 
                                `Moderators: If you're available, please post a message here or use the reaction button **on the original message above** to begin resolving this issue.`
                            )
                        } else {
                            msg.edit(startMsg[0])
                        }

                        m.channel.send(newtext.join('\n')).then(() => {
                            attempts++;
                            if(pinged.length !== pings.ids.everyone.length) {
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
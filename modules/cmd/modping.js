const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    aliases: ['pingmods', 'moderator'],
    short_desc: `Get moderator attention for issues or requests.`,
    long_desc: `Pings server moderators. This command should only be used for *legitimate reasons,* such as reporting rule breakers or requesting server roles. Think of it as actually pinging a role. **Continually using this command improperly will not be tolerated.** \n\nAdditionally, this command tries to minimize mass pings by only selecting moderators that have sent a message in the past 10 minutes, or those who are simply online. \nThe selection priority works as followed:\n\n**1.** Recent Messages\n**2.** "Online" status\n**3.** All with the <@&467060304145023006> or <@&644668061818945557> roles.`,
    authlvl: 0,
    tags: ['NO_DM', 'INSTANT'],

    run: (m, args, data) => {
        let pings_msg = [];
        let pings_status = [];
        let pings_all = [];
        for(let i = 0; i < bot.memory.mods.length; i++) {
            let mod = bot.memory.mods[i];
            if(mod.status === 'online') {
                pings_status.push(`<@${mod.id}>`);
            }
            if((mod.last_message + 600000) > new Date().getTime()) {
                pings_msg.push(`<@${mod.id}>`);
            }
            pings_all.push(`<@${mod.id}>`);

            if(i+1 === bot.memory.mods.length) {
                if(pings_msg.length === 0) {
                    if(pings_status.length === 0) {
                        // worst case scenario: no active mods, no online mods.
                        let guild = bot.guilds.cache.get(bot.cfg.guilds.optifine);
                        let role_mod = guild.roles.cache.get(bot.cfg.roles.moderator);
                        let role_jrmod = guild.roles.cache.get(bot.cfg.roles.jrmod);

                        if((role_mod.mentionable && role_jrmod.mentionable) || guild.members.cache.get(bot.user.id).hasPermission('MENTION_EVERYONE', {checkAdmin: true})) {
                            m.channel.send(`${m.author}, a moderator should be with you soon! \n\n${role_mod} ${role_jrmod}`)
                        } else {
                            m.channel.send(`${m.author}, one of the following moderators should be with you soon! \n\n${pings_all.join(', ')}`);
                        }
                    } else
                    if(pings_status.length === 1) {
                        // no active mods, one online mod
                        m.channel.send(`${m.author}, moderator ${pings_status[0]} should be with you soon!`)
                    } else {
                        // no active mods, some online mods
                        m.channel.send(`${m.author}, one of the following moderators should be with you soon! \n\n${pings_status.join(', ')}`)
                    }
                } else 
                if(pings_msg.length === 1) {
                    // one active mod
                    m.channel.send(`${m.author}, moderator ${pings_msg[0]} should be with you soon!`)
                } else {
                    // best case scenario: some active mods
                    m.channel.send(`${m.author}, one of the following moderators should be with you soon! \n\n${pings_msg.join(', ')}`)
                }
            }
        }
    }
})}
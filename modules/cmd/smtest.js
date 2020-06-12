const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    short_desc: `Short description. Shows in \`${bot.prefix}list\``,
    long_desc: `Long description. Shows in \`${bot.prefix}help\` and tooltips in \`${bot.prefix}list\``,
    args: `[args]`,
    authlvl: 5,
    flags: ['DM_OPTIONAL', 'NO_TYPER', 'HIDDEN'],

    run: (m, args, data) => {
        let channels = [...bot.guilds.cache.get(bot.cfg.guilds.optifine).channels.cache.values()].filter((c) => c.type === 'text').sort((a,b) => a.rawPosition-b.rawPosition);
        let lines = [];

        for(let i in channels) {
            let channel = channels[i];

            let str = `#${channel.name} (${channel.id})`;

            if(bot.cfg.channels.bot.indexOf(channel.id) > -1 || bot.cfg.channels.bot.indexOf(channel.parentID) > -1) {
                str += `\n- bot channel`;
            }

            if(bot.cfg.channels.mod.indexOf(channel.id) > -1 || bot.cfg.channels.mod.indexOf(channel.parentID) > -1) {
                str += `\n- mod channel`;
            }

            if(bot.cfg.channels.blacklist.indexOf(channel.id) > -1 || bot.cfg.channels.blacklist.indexOf(channel.parentID) > -1) {
                str += `\n- blacklisted`;
            }

            if(bot.cfg.channels.nomodify.indexOf(channel.id) > -1 || bot.cfg.channels.nomodify.indexOf(channel.parentID) > -1) {
                str += `\n- no modification`;
            }

            if(str === `#${channel.name} (${channel.id})`) {
                str += `\n-`
            }

            str += '\n';

            lines.push(str);

            if(parseInt(i)+1 >= channels.length) {
                log(lines.join('\n'), 'info');
                m.channel.send('channels perms calculated');
            }
        }
    }
})}
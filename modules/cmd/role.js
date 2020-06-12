const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const sim = require('string-similarity');
const Command = require(path.resolve(`./modules/core/command.js`));

const setup = (bot) => { 
    return new Command(bot, {
        name: path.parse(__filename).name,
        aliases: ['rank'],
        short_desc: `Add or remove member roles.`,
        long_desc: `Adds or removes roles for the specified member.`,
        args: `<discord member> <role>`,
        authlvl: 2,
        flags: ['NO_DM', 'LITE'],
        run: func
    });
}

const func = (m, args, data) => {
    const bot = data.bot;
    const log = data.log;

    if(!args[1]) {
        data.cmd.noArgs(m);
    } else {
        bot.util.target(m, args[0], bot, {type: 0, member:data.member}).then((result) => {
            if (!result) {
                bot.util.err('You must specify a valid user.', bot, {m:m})
            } else
            if (result.type === 'notfound' || result.type === 'id') {
                bot.util.err('Unable to find a user.', bot, {m:m})
            } else
            if (result.target.user.id === m.author.id || result.target.user.id === bot.user.id) {
                bot.util.err('Nice try.', bot, {m:m})
            } else 
            if (bot.getAuthlvl(result.target) > data.authlvl) {
                bot.util.err(`You aren't powerful enough to update this user's roles.`, bot, {m:m})
            } else {
                let roles = [...bot.guilds.cache.get(bot.cfg.guilds.optifine).roles.cache.filter(role => bot.cfg.roles.grantable.indexOf(role.id) > -1).values()];
                let match = {
                    role: null,
                    rating: 0,
                };
                let reqrole = m.content.substring((`${bot.prefix}${path.parse(__filename).name} ${args[0]} `).length);
                for(let role of roles) {
                    let newrating = sim.compareTwoStrings(reqrole, role.name)
                    if( newrating > match.rating ) {
                        match.role = role;
                        match.rating = newrating;
                    }
                }

                log(match);

                if (match.rating < 0.2) {
                    bot.util.err('What kind of role is that?', bot, {m:m})
                } else
                if (!result.target.roles.cache.has(match.role.id)) {
                    result.target.roles.add(match.role.id, `Role granted by ${m.author.tag}`).then(() => {
                        let embed = new djs.MessageEmbed()
                        .setColor(bot.cfg.embed.okay)
                        .setAuthor(`Role added`, bot.icons.find('ICO_okay'))
                        .setDescription(`${result.target} has been given the ${match.role} role.`)

                        m.channel.send({embed: embed}).then(bm => bot.util.responder(m.author.id, bm, bot))
                    }).catch(err => bot.util.err(err, bot, {m:m}));
                } else {
                    result.target.roles.remove(match.role.id, `Role removed by ${m.author.tag}`).then(() => {
                        let embed = new djs.MessageEmbed()
                        .setColor(bot.cfg.embed.okay)
                        .setAuthor(`Role removed`, bot.icons.find('ICO_okay'))
                        .setDescription(`${result.target} no longer has the ${match.role} role.`)

                        m.channel.send({embed: embed}).then(bm => bot.util.responder(m.author.id, bm, bot))
                    }).catch(err => bot.util.err(err, bot, {m:m}));
                }
            }
        }).catch(err => bot.util.err(err, bot, {m:m}));
    }
}

module.exports = setup;
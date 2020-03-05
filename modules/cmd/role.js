const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const sim = require('string-similarity');
const Command = require(path.resolve(`./modules/core/command.js`));
const erm = require(path.resolve(`./modules/util/simpleError.js`));
const targetUser = require(path.resolve(`./modules/util/targetUser.js`));
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    aliases: ['rank'],
    short_desc: `Add or remove member roles.`,
    long_desc: `Adds or removes roles for the specified member.`,
    usage: `<discord user> <role?>`,
    authlevel: 1,
    tags: ['NO_DM', 'LITE'],

    run: (m, args, data) => {
        if(!args[0]) {
            data.cmd.noArgs(m);
        } else {
            targetUser(m, args[0], bot, data).then((result) => {
                if (!result) {
                    erm('You must specify a valid user.', bot, {m:m})
                } else
                if (result.type === 'notfound' || result.type === 'id') {
                    erm('Unable to find a user.', bot, {m:m})
                } else
                if (result.target.user.id === m.author.id || result.target.user.id === bot.user.id) {
                    erm('Nice try.', bot, {m:m})
                } else {
                    let roles = [...bot.guilds.cache.get(bot.cfg.guilds.optifine).roles.filter(role => bot.cfg.roles.grantable.indexOf(role.id) > -1).values()];
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
                        erm('What kind of role is that?', bot, {m:m})
                    } else
                    if (!result.target.roles.has(match.role.id)) {
                        result.target.addRole(match.role.id, `Role granted by ${m.author.tag}`).then(() => {
                            let embed = new djs.MessageEmbed()
                            .setColor(bot.cfg.embed.okay)
                            .setAuthor(`Role added`, bot.icons.find('ICO_okay'))
                            .setDescription(`${result.target} has been given the ${match.role} role.`)

                            m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot))
                        }).catch(err => erm(err, bot, {m:m}));
                    } else {
                        result.target.removeRole(match.role.id, `Role removed by ${m.author.tag}`).then(() => {
                            let embed = new djs.MessageEmbed()
                            .setColor(bot.cfg.embed.okay)
                            .setAuthor(`Role removed`, bot.icons.find('ICO_okay'))
                            .setDescription(`${result.target} no longer has the ${match.role} role.`)

                            m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot))
                        }).catch(err => erm(err, bot, {m:m}));
                    }
                }
            }).catch(err => erm(err, bot, {m:m}));
        }
    }
})}
const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));
const erm = require(path.resolve(`./modules/util/simpleError.js`));
const targetUser = require(path.resolve(`./modules/util/targetUser.js`));
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    short_desc: `Warn a user.`,
    long_desc: `Warns a user, as opposed to muting/kicking/banning. All warnings are saved to a users record, but otherwise do nothing.`,
    usage: `<discord user> [reason]`,
    authlevel: 1,
    tags: ['NO_DM', 'LITE'],

    run: (m, args, data) => {
        if(!args[0]) {
            data.cmd.noArgs(m);
        } else {
            let now = new Date().getTime();
            targetUser(m, args[0], bot, data).then((result) => {
                if (!result) {
                    erm('You must specify a valid user.', bot, {m:m})
                } else
                if (result.type === 'notfound' || result.type === 'id') {
                    erm('Unable to find a user.', bot, {m:m})
                } else
                if (result.target.user.id === m.author.id) {
                    erm('Nice try.', bot, {m:m})
                } else
                if (result.target.user.id === bot.user.id) {
                    erm(':(', bot, {m:m})
                } else 
                if (result.target.permissions.has("KICK_MEMBERS", true) || result.target.roles.cache.has(bot.cfg.roles.jrmod)) {
                    erm(`You cannot.`, bot, {m:m})
                } else {
                    bot.getProfile(result.target.user.id, true).then(profile => {
                        if(!profile.data.record) profile.data.record = [];
                        let reason = m.content.substring( `${bot.prefix}${path.parse(__filename).name} ${args[0]} `.length )

                        profile.data.record.push({
                            date: now,
                            moderator: m.author.id,
                            url: m.url,
                            action: 'Warning',
                            reason: (args[1]) ? reason : `No reason provided.`,
                            details: null
                        });

                        bot.updateProfile(result.target.user.id, profile).then(() => {
                            let embed = new djs.MessageEmbed()
                            .setAuthor(`User warned`, bot.icons.find('ICO_warn'))
                            .setColor(bot.cfg.embed.default)
                            .setDescription(`${result.target} has been warned.`)

                            if(args[1]) embed.addField('Reason', reason)

                            m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot));
                        }).catch(err => erm(err, bot, {m:m}));
                    }).catch(err => erm(err, bot, {m:m}));
                }
            }).catch(err => erm(err, bot, {m:m}));
        }
    }
})}
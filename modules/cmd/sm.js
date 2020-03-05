const path = require(`path`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));
const erm = require(path.resolve(`./modules/util/simpleError.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    aliases: ['slowmode', 'slow'],
    short_desc: `Set manual slowmode time.`,
    long_desc: `Manually sets interval for slowmode in the current channel. If specified, OptiBot will keep slowmode on until the given time limit is up. Once finished, OptiBot will return to dynamic slowmode. If not specified, the bot will keep slowmode enabled until manually disabled.`,
    usage: `<seconds> [time limit]`,
    authlevel: 1,
    tags: ['NO_DM', 'INSTANT'],

    run: (m, args, data) => {
        if(!args[0]) {
            data.cmd.noArgs(m);
        } else
        if(bot.cfg.channels.nomodify.indexOf(m.channel.id) > -1 || bot.cfg.channels.nomodify.indexOf(m.channel.parentID) > -1) {
            let embed = new djs.MessageEmbed()
            .setAuthor('This channel is not allowed to be modified.', bot.icons.find('ICO_error'))
            .setColor(bot.cfg.embed.error)

            m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot));
        } else
        if(parseInt(args[0]) > 21600) {
            let embed = new djs.MessageEmbed()
            .setAuthor('Slowmode cannot exceed 6 hours. (21,600 seconds)', bot.icons.find('ICO_error'))
            .setColor(bot.cfg.embed.error)

            m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot));
        } else 
        if(parseInt(args[0]) < 0) {
            let embed = new djs.MessageEmbed()
            .setAuthor('Slowmode cannot use negative values.', bot.icons.find('ICO_error'))
            .setColor(bot.cfg.embed.error)

            m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot));
        } else {
            m.channel.setRateLimitPerUser(parseInt(args[0]), `Slowmode set by ${m.author.tag} (${m.author.id})`).then(() => {
                let embed = new djs.MessageEmbed()
                .setAuthor(`Slowmode ${(parseInt(args[0]) === 0) ? `disabled.` : `set to ${parseInt(args[0]).toLocaleString()} second(s).`}`, bot.icons.find('ICO_okay'))
                .setColor(bot.cfg.embed.okay)

                m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot));
            }).catch(err => {
                erm(err, bot, {m:m})
            })
        }
    }
})}
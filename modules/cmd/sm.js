const path = require(`path`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./core/command.js`));
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    short_desc: `Set manual slowmode time.`,
    long_desc: `Manually sets interval for slowmode in the current channel. If specified, OptiBot will keep slowmode on until the given time limit is up. Once finished, OptiBot will return to dynamic slowmode. If not specified, the bot will keep slowmode enabled until manually disabled.`,
    usage: `<seconds> [time limit]`,
    authlevel: 1,
    tags: ['NO_DM', 'INSTANT'],

    run: (m, args, data) => {
        if(!args[0]) {
            let embed = new djs.RichEmbed()
            .setAuthor(`Usage:`, bot.icons.find('ICO_info'))
            .setDescription(`\`\`\`${data.cmd.metadata.usage}\`\`\``)
            .setColor(bot.cfg.embed.default);

            m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot, log));
        } else
        if(bot.cfg.channels.nomodify.indexOf(m.channel.id) > -1 || bot.cfg.channels.nomodify.indexOf(m.channel.parentID) > -1) {
            let embed = new djs.RichEmbed()
            .setAuthor('This channel is not allowed to be modified.', bot.icons.find('ICO_error'))
            .setColor(bot.cfg.embed.error)

            m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot, log));
        } else
        if(parseInt(args[0]) > 21600) {
            let embed = new djs.RichEmbed()
            .setAuthor('Slowmode cannot exceed 6 hours. (21,600 seconds)', bot.icons.find('ICO_error'))
            .setColor(bot.cfg.embed.error)

            m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot, log));
        } else 
        if(parseInt(args[0]) < 0) {
            let embed = new djs.RichEmbed()
            .setAuthor('Slowmode cannot use negative values.', bot.icons.find('ICO_error'))
            .setColor(bot.cfg.embed.error)

            m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot, log));
        } else {
            m.channel.setRateLimitPerUser(parseInt(args[0]), `Slowmode set by ${m.author.tag} (${m.author.id})`).then(() => {
                let ds = parseInt(args[0]) === 0;
                let embed = new djs.RichEmbed()
                .setAuthor(`Slowmode ${(ds) ? `disabled.` : `set to ${parseInt(args[0]).toLocaleString()} second(s).`}`, bot.icons.find('ICO_okay'))
                .setColor(bot.cfg.embed.okay)

                m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot, log));
            });
        }
    }
})}
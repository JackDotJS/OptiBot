const path = require(`path`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    aliases: ['slowmode', 'slow'],
    short_desc: `Set slowmode time.`,
    long_desc: `Manually sets interval for slowmode in the current channel.`,
    usage: `<time:slowmode>`,
    authlvl: 2,
    tags: ['NO_DM', 'INSTANT'],

    run: (m, args, data) => {

        // todo: add time parser

        if(!args[0]) {
            data.cmd.noArgs(m);
        } else
        if(bot.cfg.channels.nomodify.indexOf(m.channel.id) > -1 || bot.cfg.channels.nomodify.indexOf(m.channel.parentID) > -1) {
            bot.util.err('This channel is not allowed to be modified.', bot, {m:m});
        } else
        if(parseInt(args[0]) > 600) {
            bot.util.err('Slowmode cannot exceed 10 minutes.', bot, {m:m});
        } else 
        if(parseInt(args[0]) < 0) {
            bot.util.err('Slowmode cannot use negative values.', bot, {m:m});
        } else {
            m.channel.setRateLimitPerUser(parseInt(args[0]), `Slowmode set by ${m.author.tag} (${m.author.id})`).then(() => {
                let embed = new djs.MessageEmbed()
                .setAuthor(`Slowmode ${(parseInt(args[0]) === 0) ? `disabled.` : `set to ${parseInt(args[0]).toLocaleString()} second(s).`}`, bot.icons.find('ICO_okay'))
                .setColor(bot.cfg.embed.okay)

                m.channel.send({embed: embed}).then(bm => bot.util.responder(m.author.id, bm, bot));
            }).catch(err => {
                bot.util.err(err, bot, {m:m})
            })
        }
    }
})}
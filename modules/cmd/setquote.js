const path = require(`path`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));
const erm = require(path.resolve(`./modules/util/simpleError.js`));
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    short_desc: `Update or add a quote to your profile.`,
    usage: `<text>`,
    authlevel: 0,
    tags: ['DM_OPTIONAL', 'INSTANT'],

    run: (m, args, data) => {
        if(!args[0]) {
            data.cmd.noArgs(m);
        } else 
        if(m.content.substring(`${bot.prefix}${path.parse(__filename).name} `.length).length > 256) {
            erm('Message cannot exceed 256 characters in length.', bot, {m:m})
        } else {
            bot.getProfile(m.author.id, true).then(profile => {
                profile.data.quote = m.content.substring(`${bot.prefix}${path.parse(__filename).name} `.length);

                bot.updateProfile(m.author.id, profile).then(() => {
                    let embed = new djs.MessageEmbed()
                    .setAuthor(`Your profile has been updated`, bot.icons.find('ICO_okay'))
                    .setColor(bot.cfg.embed.okay);

                    m.channel.send({embed: embed}).then(msg => { msgFinalizer(m.author.id, msg, bot); });
                }).catch(err => {
                    erm(err, bot, {m:m})
                });
            }).catch(err => {
                erm(err, bot, {m:m})
            });
        }
    }
})}
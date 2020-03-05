const path = require(`path`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));
const erm = require(path.resolve(`./modules/util/simpleError.js`));
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));
const confirm = require(path.resolve(`./modules/util/confirm.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    aliases: ['unquote'],
    short_desc: `Remove a quote from your profile.`,
    authlevel: 0,
    tags: ['DM_OPTIONAL', 'INSTANT'],

    run: (m, args, data) => {
        bot.getProfile(m.author.id, false).then(profile => {
            if(!profile || (profile && !profile.data.quote)) {
                erm('Your profile does not have a quote message.', bot, {m:m})
            } else {
                let embed = new djs.MessageEmbed()
                .setAuthor('Are you sure?', bot.icons.find('ICO_warn'))
                .setColor(bot.cfg.embed.default)
                .setDescription(`The following quote will be permanently removed from your OptiBot profile: \n> ${profile.data.quote}`)

                m.channel.send('_ _', {embed: embed}).then(msg => {
                    confirm(m.author.id, msg, bot)
                });

                // TODO: add confirmation stuff

                /* bot.updateProfile(m.author.id, profile).then(() => {
                    let embed = new djs.MessageEmbed()
                    .setAuthor(`Your profile has been updated`, bot.icons.find('ICO_okay'))
                    .setColor(bot.cfg.embed.okay);

                    m.channel.send({embed: embed}).then(msg => { msgFinalizer(m.author.id, msg, bot); });
                }); */
            }
        });
    }
})}
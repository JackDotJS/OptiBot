const path = require(`path`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));
const errMsg = require(path.resolve(`./modules/util/simpleError.js`));
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    short_desc: `Remove a quote from your profile.`,
    authlevel: 0,
    tags: ['DM_OPTIONAL', 'INSTANT'],

    run: (m, args, data) => {
        bot.getProfile(m.author.id, false).then(profile => {
            if(!profile) {
                // no existing profile
            } else
            if(!profile.data.quote) {
                // no existing quote
            } else {
                delete profile.data.quote

                // TODO: add confirmation stuff

                /* bot.updateProfile(m.author.id, profile).then(() => {
                    let embed = new djs.RichEmbed()
                    .setAuthor(`Your profile has been updated`, bot.icons.find('ICO_okay'))
                    .setColor(bot.cfg.embed.okay);

                    m.channel.send({embed: embed}).then(msg => { msgFinalizer(m.author.id, msg, bot, log); });
                }); */
            }
        });
    }
})}
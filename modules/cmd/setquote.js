const path = require(`path`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));
const errMsg = require(path.resolve(`./modules/util/simpleError.js`));
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    short_desc: `Update or add a quote to your profile.`,
    usage: `<text>`,
    authlevel: 0,
    tags: ['DM_OPTIONAL', 'INSTANT'],

    run: (m, args, data) => {
        if(!args[0]) {
            let embed = new djs.RichEmbed()
            .setAuthor(`Usage:`, bot.icons.find('ICO_info'))
            .setDescription(`\`\`\`${data.cmd.metadata.usage}\`\`\``)
            .setColor(bot.cfg.embed.default);

            m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot, log));
        } else 
        if(m.content.substring(`${bot.trigger}${path.parse(__filename).name} `.length).length > 256) {
            let embed = errMsg('Message cannot exceed 256 characters in length.', bot, log);
            m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot, log));
        } else {
            bot.getProfile(m.author.id, true).then(profile => {
                profile.data.quote = m.content.substring(`${bot.trigger}${path.parse(__filename).name} `.length);

                bot.updateProfile(m.author.id, profile).then(() => {
                    let embed = new djs.RichEmbed()
                    .setAuthor(`Your profile has been updated`, bot.icons.find('ICO_okay'))
                    .setColor(bot.cfg.embed.okay);

                    m.channel.send({embed: embed}).then(msg => { msgFinalizer(m.author.id, msg, bot, log); });
                })
            });
        }
    }
})}
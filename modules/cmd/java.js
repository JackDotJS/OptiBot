const path = require(`path`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));
const errMsg = require(path.resolve(`./modules/util/simpleError.js`));
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    aliases: ['jdk', 'jre'],
    short_desc: `Provides a link to download AdoptOpenJDK.`,
    authlevel: 0,
    tags: ['DM_OPTIONAL', 'INSTANT'],

    run: (m, args, data) => {
        let embed = new djs.RichEmbed()
        .setColor(bot.cfg.embed.default)
        .setAuthor('AdoptOpenJDK', bot.icons.find('ICO_jdk'))
        .setTitle('https://adoptopenjdk.net/')

        m.channel.send({ embed: embed })
        .then(bm => msgFinalizer(m.author.id, bm, bot, log))
        .catch(err => {
            m.channel.send({embed: errMsg(err, bot, log)})
            .catch(e => { log(err.stack, 'error') });
        });
    }
})}
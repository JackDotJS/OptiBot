const path = require(`path`);
const djs = require(`discord.js`);
const { Command } = require(`../core/OptiBot.js`);

const setup = (bot) => { 
    return new Command(bot, {
        name: path.parse(__filename).name,
        aliases: ['jdk', 'jre', `ojdk`, `openjdk`],
        short_desc: `Provides some links to download Java.`,
        authlvl: 0,
        flags: ['DM_OPTIONAL', 'NO_TYPER'],
        run: func
    });
}

const func = (m, args, data) => {
    const bot = data.bot;
    const log = data.log;
    
    let embed = new djs.MessageEmbed()
    .setColor(bot.cfg.embed.default)
    .setAuthor('AdoptOpenJDK', bot.icons.find('ICO_jdk'))
    .setTitle('https://adoptopenjdk.net/')

    m.channel.send({ embed: embed }).then(bm => bot.util.responder(m.author.id, bm, bot))
}

module.exports = setup;
const path = require(`path`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));

const setup = (bot) => { 
    return new Command(bot, {
        name: path.parse(__filename).name,
        short_desc: `Restart OptiBot.`,
        authlvl: 3,
        flags: ['NO_DM', 'NO_TYPER', 'LITE'],
        run: func
    });
}

const func = (m, args, data) => {
    const bot = data.bot;
    const log = data.log;

    let logEntry = new bot.util.LogEntry(bot, {time: new Date()})
    .setColor(bot.cfg.embed.default)
    .setIcon(bot.icons.find('ICO_door'))
    .setTitle(`OptiBot is now restarting...`, `OptiBot Restart Report`)
    .submit("misc")

    let embed = new djs.MessageEmbed()
    .setAuthor('Restarting...', bot.icons.find('ICO_load'))
    .setColor(bot.cfg.embed.default);

    m.channel.send('_ _', {embed: embed}).then((msg) => {
        process.send({ 
            type: 'restart',
            guild: msg.guild.id,
            channel: msg.channel.id,
            message: msg.id,
            author: m.author.id
        }, (err) => {
            if(err) {
                bot.util.err(err.stack, bot, {m:m});
            } else {
                bot.exit(16);
            }
        });
    });
}

module.exports = setup;
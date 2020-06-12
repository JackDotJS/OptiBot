const path = require(`path`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));

const setup = (bot) => { 
    return new Command(bot, {
        name: path.parse(__filename).name,
        short_desc: `Shut down OptiBot.`,
        authlvl: 4,
        flags: ['NO_DM', 'NO_TYPER'],
        run: func
    });
}

const func = (m, args, data) => {
    const bot = data.bot;
    const log = data.log;
    
    let embed = new djs.MessageEmbed()
    .setAuthor('Shutting down. Goodbye!', bot.icons.find('ICO_door'))
    .setColor(bot.cfg.embed.default);

    m.channel.send({embed: embed}).then(() => {
        bot.exit();
    });
}

module.exports = setup;
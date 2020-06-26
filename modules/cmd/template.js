const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const { Command } = require(`../core/OptiBot.js`);

/*
const setup = (bot) => { 
    return new Command(bot, {
        run: func
    });
}
const bot = data.bot;
    const log = data.log;
const func = 

module.exports = setup;
*/

const setup = (bot) => { 
    return new Command(bot, {
        name: path.parse(__filename).name,
        // aliases: ['aliases'],
        short_desc: `Short description. Shows in \`${bot.prefix}list\``,
        long_desc: `Long description. Shows in \`${bot.prefix}help\` and tooltips in \`${bot.prefix}list\``,
        args: `[args]`,
        image: 'IMG_args.png',
        authlvl: 5,
        flags: ['DM_OPTIONAL', 'NO_TYPER', 'HIDDEN'],
        run: func
    });
}

const func = (m, args, data) => {
    const bot = data.bot;
    const log = data.log;

    let embed = new djs.MessageEmbed()
    .setAuthor(`Example MessageEmbed`, bot.icons.index[~~(Math.random() * bot.icons.index.length)].data)
    .setColor(bot.cfg.embed.default)

    m.channel.send({embed: embed}).then(bm => bot.util.responder(m.author.id, bm, bot));
}

module.exports = setup;
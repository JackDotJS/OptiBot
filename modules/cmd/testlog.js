const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));

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

    let logEntry = new bot.util.LogEntry(bot)
    .setColor(bot.cfg.embed.default)
    .setIcon(bot.icons.find('ICO_load'))
    .setTitle(`Embed Title`, `Report Title`)
    .setHeader(`Embed Header`, `Plaintext Header`)
    .setDescription(`Embed Description`, `Plaintext Description`)
    .addSection(`Section 1 Title`, {
        data: `Section 1 Embed Content`,
        raw: `Section 1 Plaintext Content`
    })
    .addSection(`Section 2 Title`, {
        data: `Section 2 Embed Content`,
        raw: `Section 2 Plaintext Content`
    })
    .submit()
}

module.exports = setup;
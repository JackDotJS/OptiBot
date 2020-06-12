const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));

const setup = (bot) => { 
    return new Command(bot, {
        name: path.parse(__filename).name,
        aliases: ['poop', 'shit'],
        short_desc: `You know what this does.`,
        authlvl: 4,
        flags: ['DM_OPTIONAL', 'NO_TYPER'],
        run: func
    });
}

const func = (m, args, data) => {
    const bot = data.bot;
    const log = data.log;

    m.channel.send({
        files: [new djs.MessageAttachment(path.resolve(`./assets/img/IMG_shitcord.png`), 'shitcord.png')]
    }).then(bm => bot.util.responder(m.author.id, bm, bot));
}

module.exports = setup;
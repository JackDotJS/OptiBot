const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const { Command } = require(`../core/OptiBot.js`);

const setup = (bot) => { 
    return new Command(bot, {
        name: path.parse(__filename).name,
        short_desc: `die`,
        long_desc: `die`,
        authlvl: 1,
        flags: ['DM_OPTIONAL', 'NO_TYPER', 'HIDDEN'],
        run: func
    });
}

const func = (m, args, data) => {
    const bot = data.bot;
    const log = data.log;

    m.channel.send(new djs.MessageAttachment(bot.images.find('IMG_marcelo_die.gif'), 'marcelo_die.gif')).then(bm => bot.util.responder(m.author.id, bm, bot));
}

module.exports = setup;
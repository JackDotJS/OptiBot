const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);

const { Command } = require(`../core/OptiBot.js`);

const setup = (bot) => { 
    return new Command(bot, {
        name: path.parse(__filename).name,
        authlvl: 5,
        flags: ['DM_OPTIONAL', 'NO_TYPER', 'HIDDEN'],
        run: func
    });
}


const func = (m, args, data) => {
    const bot = data.bot;
    const log = data.log;

    bot.pb.createPaste(m.cleanContent, 'API test', null, 1, '10M').then((data) => {
        m.channel.send(data)
    });
}

module.exports = setup;
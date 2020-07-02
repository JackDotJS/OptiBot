const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);

const { Command, OBUtil, Memory } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    authlvl: 5,
    flags: ['DM_OPTIONAL', 'NO_TYPER', 'HIDDEN'],
    run: null
}


metadata.run = (m, args, data) => {
    bot.pb.createPaste(m.cleanContent, 'API test', null, 1, '10M').then((data) => {
        m.channel.send(data)
    });
}

module.exports = new Command(metadata);
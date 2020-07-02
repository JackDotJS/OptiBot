const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const { Command, OBUtil, Memory } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    aliases: ['poop', 'shit'],
    short_desc: `You know what this does.`,
    authlvl: 4,
    flags: ['DM_OPTIONAL', 'NO_TYPER'],
    run: null
}

metadata.run = (m, args, data) => {
    m.channel.send({
        files: [new djs.MessageAttachment(path.resolve(`./assets/img/IMG_shitcord.png`), 'shitcord.png')]
    }).then(bm => OBUtil.afterSend(bm, m.author.id));
}

module.exports = new Command(metadata);
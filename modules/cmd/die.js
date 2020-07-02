const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const { Command, OBUtil, Memory } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    short_desc: `die`,
    long_desc: `die`,
    authlvl: 1,
    flags: ['DM_OPTIONAL', 'NO_TYPER', 'HIDDEN'],
    run: null
}

metadata.run = (m, args, data) => {
    m.channel.send(new djs.MessageAttachment(bot.images.find('IMG_marcelo_die.gif'), 'marcelo_die.gif')).then(bm => OBUtil.afterSend(bm, m.author.id));
}

module.exports = new Command(metadata);
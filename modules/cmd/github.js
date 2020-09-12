const path = require('path');
const djs = require('discord.js');
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    aliases: ['issues', 'git', 'issue'],
    short_desc: 'Provides a link to OptiFine\'s issue tracker.',
    authlvl: 0,
    flags: ['DM_OPTIONAL', 'NO_TYPER'],
    run: null
};

metadata.run = (m, args, data) => {
    const embed = new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .setAuthor('OptiFine Issue Tracker', Assets.getEmoji('ICO_git').url)
        .setTitle('https://github.com/sp614x/optifine/issues');

    m.channel.send({ embed: embed }).then(bm => OBUtil.afterSend(bm, m.author.id));
};

module.exports = new Command(metadata);
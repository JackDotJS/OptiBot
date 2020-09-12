const path = require('path');
const util = require('util');
const djs = require('discord.js');
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    aliases: ['latency', 'pong'],
    short_desc: 'Measure bot latency and response lag.',
    authlvl: 1,
    flags: ['DM_OPTIONAL', 'NO_TYPER'],
    run: null
};

metadata.run = (m, args, data) => {
    const embed = new djs.MessageEmbed()
        .setAuthor((data.input.cmd === 'pong') ? 'Pong...' : 'Ping...', Assets.getEmoji('ICO_wifi').url)
        .setColor(bot.cfg.embed.default)
        .setDescription('API Latency: ... \nMessage Latency: ...');

    const timeStart = new Date().getTime();
    m.channel.send('_ _', {embed: embed}).then(msg => {
        const timeTaken = new Date().getTime() - timeStart;
        bot.setTimeout(() => {
            const desc = [];
            const api = Math.round(bot.ws.ping);
            const message = timeTaken;

            if(api < 100) {
                desc.push(`API Latency: ${api.toLocaleString()}ms (Great)`);
            } else
            if(api < 200) {
                desc.push(`API Latency: ${api.toLocaleString()}ms (Good)`);
            } else
            if(api < 700) {
                desc.push(`API Latency: ${api.toLocaleString()}ms (Okay)`);
            } else
            if(api < 2000) {
                desc.push(`API Latency: ${api.toLocaleString()}ms (Bad)`);
            } else
            if(api >= 2000) {
                desc.push(`API Latency: ${api.toLocaleString()}ms (Awful)`);
            }

            if(message < 100) {
                desc.push(`Message Latency: ${message.toLocaleString()}ms (Great)`);
            } else
            if(message < 200) {
                desc.push(`Message Latency: ${message.toLocaleString()}ms (Good)`);
            } else
            if(message < 700) {
                desc.push(`Message Latency: ${message.toLocaleString()}ms (Okay)`);
            } else
            if(message < 2000) {
                desc.push(`Message Latency: ${message.toLocaleString()}ms (Bad)`);
            } else
            if(message >= 2000) {
                desc.push(`Message Latency: ${message.toLocaleString()}ms (Awful)`);
            }

            embed.author.name = (data.input.cmd === 'pong') ? 'Ping!' : 'Pong!';
            embed.description = desc.join('\n');
            msg.edit('_ _', {embed:embed}).then(() => {
                OBUtil.afterSend(msg, m.author.id);
            }).catch(err => {
                OBUtil.err(err, {m: m});
            });
        }, 1000);
    });
};

module.exports = new Command(metadata);
const path = require('path');
const djs = require('discord.js');
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    short_desc: 'Restart OptiBot.',
    authlvl: 3,
    flags: ['NO_DM', 'NO_TYPER', 'LITE'],
    run: null
};

metadata.run = (m, args, data) => {
    const logEntry = new LogEntry()
        .setColor(bot.cfg.embed.default)
        .setIcon(Assets.getEmoji('ICO_door').url)
        .setTitle('OptiBot is now restarting...', 'OptiBot Restart Report')
        .addSection('Command Issuer', m.author)
        .submit().then(() => {
            const embed = new djs.MessageEmbed()
                .setAuthor('Restarting...', Assets.getEmoji('ICO_load').url)
                .setColor(bot.cfg.embed.default);

            m.channel.send('_ _', {embed: embed}).then((msg) => {
                if(msg.channel.type === 'dm') {
                    bot.exit(16);
                } else {
                    process.send({ 
                        type: 'restart',
                        guild: msg.guild.id,
                        channel: msg.channel.id,
                        message: msg.id,
                        author: m.author.id
                    }, (err) => {
                        if(err) {
                            OBUtil.err(err.stack, {m:m});
                        } else {
                            bot.exit(16);
                        }
                    });
                }
            });
        });
};

module.exports = new Command(metadata);
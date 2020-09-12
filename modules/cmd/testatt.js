const path = require('path');
const util = require('util');
const crypto = require('crypto');
const djs = require('discord.js');
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    short_desc: `Short description. Shows in \`${bot.prefix}list\``,
    long_desc: `Long description. Shows in \`${bot.prefix}help\` and tooltips in \`${bot.prefix}list\``,
    args: '[args]',
    image: 'IMG_args',
    authlvl: 5,
    flags: ['DM_OPTIONAL', 'NO_TYPER', 'HIDDEN'],
    run: null
};

metadata.run = (m, args, data) => {
    const embed1 = new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .setTitle('Loading...');

    m.channel.send(embed1).then(entry => {
        bot.setTimeout(() => {
            const randomText = crypto.randomBytes(1234).toString('hex');

            bot.guilds.cache.get(bot.cfg.guilds.optibot).channels.cache.get(bot.cfg.channels.logFiles).send({
                files: [new djs.MessageAttachment(Buffer.from(randomText), 'exampleFile.txt')]
            }).then(att => {
                const attachment = [...att.attachments.values()][0];

                const embed2 = new djs.MessageEmbed()
                    .setColor(bot.cfg.embed.default)
                    .setAuthor('blah', Assets.getEmoji('ICO_jarfix').url, attachment.url)
                    .setTitle('Something Cool');

                entry.edit(embed2);
            });

        }, 5000);
    });
};

module.exports = new Command(metadata);
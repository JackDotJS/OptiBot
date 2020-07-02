const path = require(`path`);
const util = require(`util`);
const crypto = require(`crypto`);
const djs = require(`discord.js`);
const { Command, OBUtil, Memory } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    short_desc: `Short description. Shows in \`${bot.prefix}list\``,
    long_desc: `Long description. Shows in \`${bot.prefix}help\` and tooltips in \`${bot.prefix}list\``,
    args: `[args]`,
    image: 'IMG_args.png',
    authlvl: 5,
    flags: ['DM_OPTIONAL', 'NO_TYPER', 'HIDDEN'],
    run: null
}

metadata.run = (m, args, data) => {
    let embed1 = new djs.MessageEmbed()
    .setColor(bot.cfg.embed.default)
    .setTitle(`Loading...`);

    m.channel.send(embed1).then(entry => {
        bot.setTimeout(() => {
            let randomText = crypto.randomBytes(1234).toString('hex');

            bot.guilds.cache.get(bot.cfg.guilds.optibot).channels.cache.get(bot.cfg.channels.logFiles).send({
                files: [new djs.MessageAttachment(Buffer.from(randomText), 'exampleFile.txt')]
            }).then(att => {
                let attachment = [...att.attachments.values()][0];

                let embed2 = new djs.MessageEmbed()
                .setColor(bot.cfg.embed.default)
                .setAuthor('blah', bot.icons.find('ICO_jarfix'), attachment.url)
                .setTitle(`Something Cool`)

                entry.edit(embed2);
            })

        }, 5000)
    })
}

module.exports = new Command(metadata);
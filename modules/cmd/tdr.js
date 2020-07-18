const path = require(`path`);
const djs = require(`discord.js`);
const request = require('request');
const { Command, OBUtil, Memory } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    aliases: ['togglecolor', 'dc'],
    short_desc: `Toggle donator role color.`,
    long_desc: `Toggles the donator role color. Useful if you have any special "creator" role.\n\n**You must already be a verified donator to use this command.** Type \`${bot.prefix}help dr\` for details.`,
    authlvl: 0,
    image: 'IMG_token.png',
    flags: ['DM_OPTIONAL', 'NO_TYPER', 'LITE'],
    run: null
}

metadata.run = (m, args, data) => {
    if(data.member.roles.cache.has(bot.cfg.roles.donator)) {
        // has donator
        if(data.member.roles.cache.has(bot.cfg.roles.donatorColor)) {
            data.member.roles.remove(bot.cfg.roles.donatorColor, 'Color toggled by user.').then(() => {
                let embed = new djs.MessageEmbed()
                .setColor(bot.cfg.embed.okay)
                .setAuthor('Donator color disabled.', OBUtil.getEmoji('ICO_okay').url)

                m.channel.send({ embed: embed }).then(bm => OBUtil.afterSend(bm, m.author.id));
            });
        } else {
            data.member.roles.add(bot.cfg.roles.donatorColor, 'Color toggled by user.').then(() => {
                let embed = new djs.MessageEmbed()
                .setColor(bot.cfg.embed.okay)
                .setAuthor('Donator color enabled.', OBUtil.getEmoji('ICO_okay').url)

                m.channel.send({ embed: embed }).then(bm => OBUtil.afterSend(bm, m.author.id));
            });
        }
    } else {
        OBUtil.err(`You are not a verified donator.`, {m:m});
    }
}

module.exports = new Command(metadata);
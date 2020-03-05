const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));
const erm = require(path.resolve(`./modules/util/simpleError.js`));
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    aliases: ['poop', 'shit'],
    short_desc: `You know what this does.`,
    authlevel: 4,
    tags: ['DM_OPTIONAL', 'INSTANT', 'HIDDEN'],

    run: (m, args, data) => {
        let embed = new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .attachFile(new djs.MessageAttachment(path.resolve(`./assets/img/IMG_shitcord.png`), 'shitcord.png'))
        .setImage('attachment://shitcord.png')

        m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot));
    }
})}
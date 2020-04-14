const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    aliases: ['poop', 'shit'],
    short_desc: `You know what this does.`,
    authlvl: 4,
    tags: ['DM_OPTIONAL', 'INSTANT'],

    run: (m, args, data) => {
        m.channel.send({
            files: [new djs.MessageAttachment(path.resolve(`./assets/img/IMG_shitcord.png`), 'shitcord.png')]
        }).then(bm => bot.util.responder(m.author.id, bm, bot));
    }
})}
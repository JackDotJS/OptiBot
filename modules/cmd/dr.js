const path = require(`path`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));
const errMsg = require(path.resolve(`./modules/util/simpleError.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    short_desc: `Verify donator role.`,
    long_desc: `Verifies your donator status. If successful, this will grant you the donator role, and reset your donator token in the process. \n\nYou can find your donator token by logging in through the website, at https://optifine.net/login. Look at the bottom of the page for a string of random characters (see picture for example). \n**Remember that your "Donation ID" is NOT your token!**\n\nPlease note that this will NOT automatically verify you for the \`${bot.trigger}cape\` command. [See this FAQ entry for instructions on that.](https://discordapp.com/channels/423430686880301056/531622141393764352/622494425616089099)`,
    usage: `<e-mail> <token>`,
    authlevel: 0,
    image: 'IMG_token.png',
    tags: ['DM_ONLY', 'STRICT', 'DELETE_ON_MISUSE', 'INSTANT', 'CONFIDENTIAL'],
    
    run: (m, args, data) => {
        if(data.member.roles.has(bot.cfg.roles.donator)) {
            let embed = new djs.RichEmbed()
            .setAuthor(`You already have the Donator role!`, bot.icons.find('ICO_error'))
            .setColor(bot.cfg.embed.error)

            m.channel.send({embed: embed})
        } else
        if(!args[0]) {
            let embed = new djs.RichEmbed()
            .setAuthor(`Usage:`, bot.icons.find('ICO_info'))
            .setDescription(`\`\`\`${data.cmd.metadata.usage}\`\`\``)
            .setColor(bot.cfg.embed.default);

            m.channel.send({embed: embed})
        } else
        if (args[0].indexOf('@') < 0 && args[0].indexOf('.') < 0) {
            let embed = new djs.RichEmbed()
            .setAuthor(`You must specify a valid e-mail address.`, bot.icons.find('ICO_error'))
            .setColor(bot.cfg.embed.error)

            m.channel.send({embed: embed})
        } else
        if(!args[1]) {
            let embed = new djs.RichEmbed()
            .setAuthor(`You must specify your donator token.`, bot.icons.find('ICO_error'))
            .setColor(bot.cfg.embed.error)

            m.channel.send({embed: embed})
        } else {
            request({ url: 'https://optifine.net/validateToken?e=' + encodeURIComponent(args[0]) + '&t=' + encodeURIComponent(args[1]), headers: { 'User-Agent': 'optibot' } }, (err, res, body) => {
                if (err || !res || !body || res.statusCode !== 200) {
                    throw new Error('Failed to get a response from the OptiFine API')
                } else 
                if (body === 'true') {
                    data.member.addRole(bot.cfg.roles.donator, 'Donator status verified.').then(() => {
                        let embed = new discord.RichEmbed()
                        .setColor(bot.cfg.embed.okay)
                        .setAuthor('Thank you for your contribution! Your donator role has been granted.', bot.icons.find('ICO_okay'))
                        .setDescription('Please note, your token has been reset.');

                        m.channel.send({ embed: embed });
                    })
                } else {
                    let embed = new djs.RichEmbed()
                    .setAuthor(`Invalid credentials.`, bot.icons.find('ICO_error'))
                    .setDescription(`Make sure that your token and e-mail are the same as what you see on https://optifine.net/login.`)
                    .setColor(bot.cfg.embed.error)

                    m.channel.send({embed: embed})
                }
            });
        }
    }
})}
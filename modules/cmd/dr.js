const path = require(`path`);
const djs = require(`discord.js`);
const request = require('request');
const Command = require(path.resolve(`./modules/core/command.js`));

const setup = (bot) => { 
    return new Command(bot, {
        name: path.parse(__filename).name,
        short_desc: `Verify donator role.`,
        long_desc: `Verifies your donator status. If successful, this will grant you the donator role, and reset your donator token in the process. \n\nYou can find your donator token by logging in through the website, at https://optifine.net/login. Look at the bottom of the page for a string of random characters (see picture for example). \n**Remember that your "Donation ID" is NOT your token!**\n\nPlease note that this will NOT automatically verify you for the \`${bot.prefix}cape\` command. Use this command for details: \`${bot.prefix}faq verify cape\``,
        args: `<e-mail> <token>`,
        authlvl: 0,
        image: 'IMG_token.png',
        flags: ['DM_ONLY', 'STRICT', 'DELETE_ON_MISUSE', 'NO_TYPER', 'CONFIDENTIAL', 'LITE'],
        run: func
    })
}

const func = (m, args, data) => {
    const bot = data.bot;
    const log = data.log;

    if(data.member.roles.cache.has(bot.cfg.roles.donator)) {
        bot.util.err(`You already have the Donator role.`, bot, {m:m});
    } else
    if(!args[0]) {
        data.cmd.noArgs(m);
    } else
    if (args[0].indexOf('@') < 0 && args[0].indexOf('.') < 0) {
        bot.util.err(`You must specify a valid e-mail address.`, bot, {m:m});
    } else
    if(!args[1]) {
        bot.util.err(`You must specify your donator token.`, bot, {m:m});
    } else {
        request({ url: 'https://optifine.net/validateToken?e=' + encodeURIComponent(args[0]) + '&t=' + encodeURIComponent(args[1]), headers: { 'User-Agent': 'optibot' } }, (err, res, body) => {
            if (err || !res || !body || res.statusCode !== 200) {
                bot.util.err(err || new Error('Failed to get a response from the OptiFine API'), bot, {m:m});
            } else 
            if (body === 'true') {
                data.member.roles.add(bot.cfg.roles.donator, 'Donator status verified.').then(() => {
                    let embed = new djs.MessageEmbed()
                    .setColor(bot.cfg.embed.okay)
                    .setAuthor('Thank you for your contribution! Your donator role has been granted.', bot.icons.find('ICO_okay'))
                    .setDescription('Please note, your token has been reset.');

                    m.channel.send({ embed: embed })

                    /* let embed2 = new djs.MessageEmbed()
                    .setColor(bot.cfg.embed.donator)
                    .setAuthor('Donator Role Granted', bot.icons.find('ICO_donator'))
                    .setDescription(`${m.author} | ${m.author.tag} \n\`\`\`yaml\n${m.author.id}\`\`\``)
                    .setThumbnail(m.author.displayAvatarURL)
                    .setFooter(`Event logged on ${new Date().toUTCString()}`)
                    .setTimestamp(new Date())

                    bot.guilds.cache.get(bot.cfg.logging.guild).channels.cache.get(bot.cfg.logging.channel).send({embed: embed2}); */
                })
            } else {
                let embed = bot.util.err(`Invalid credentials.`, bot)
                .setDescription(`Make sure that your token and e-mail are the same as what you see on https://optifine.net/login.`)

                m.channel.send({embed: embed})
            }
        });
    }
}

module.exports = setup;
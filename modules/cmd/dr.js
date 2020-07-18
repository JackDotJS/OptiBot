const path = require(`path`);
const djs = require(`discord.js`);
const request = require('request');
const { Command, OBUtil, Memory } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    aliases: ['verify', 'donator'],
    short_desc: `Verify donator status.`,
    long_desc: `Verifies your donator status. If successful, this will grant you the donator access role, and reset your donator token in the process. \n\nYou can find your donator token by logging in through the website, at https://optifine.net/login. Look at the bottom of the page for a string of random characters (see picture for example). \n**Remember that your "Donation ID" is NOT your token!**\n\nPlease note that this will NOT automatically verify you for the \`${bot.prefix}cape\` command. Use this command for details: \`${bot.prefix}faq verify cape\``,
    args: `<e-mail> <token>`,
    authlvl: 0,
    image: 'IMG_token.png',
    flags: ['DM_ONLY', 'STRICT', 'DELETE_ON_MISUSE', 'NO_TYPER', 'CONFIDENTIAL', 'LITE'],
    run: null
}

metadata.run = (m, args, data) => {
    if(data.member.roles.cache.has(bot.cfg.roles.donator)) {
        OBUtil.err(`You already have the Donator role.`, {m:m});
    } else
    if(!args[0]) {
        OBUtil.missingArgs(m, metadata);
    } else
    if (args[0].indexOf('@') < 0 && args[0].indexOf('.') < 0) {
        OBUtil.err(`You must specify a valid e-mail address.`, {m:m});
    } else
    if(!args[1]) {
        OBUtil.err(`You must specify your donator token.`, {m:m});
    } else {
        request({ url: 'https://optifine.net/validateToken?e=' + encodeURIComponent(args[0]) + '&t=' + encodeURIComponent(args[1]), headers: { 'User-Agent': 'optibot' } }, (err, res, body) => {
            if (err || !res || !body || res.statusCode !== 200) {
                OBUtil.err(err || new Error('Failed to get a response from the OptiFine API'), {m:m});
            } else 
            if (body === 'true') {
                data.member.roles.add(bot.cfg.roles.donator, 'Donator status verified.').then(() => {
                    let embed = new djs.MessageEmbed()
                    .setColor(bot.cfg.embed.okay)
                    .setAuthor('Thank you for your contribution! Your donator role has been granted.', OBUtil.getEmoji('ICO_okay').url)
                    .setDescription('Please note, your token has been reset.');

                    m.channel.send({ embed: embed })

                    /* let embed2 = new djs.MessageEmbed()
                    .setColor(bot.cfg.embed.donator)
                    .setAuthor('Donator Role Granted', OBUtil.getEmoji('ICO_donator').url)
                    .setDescription(`${m.author} | ${m.author.tag} \n\`\`\`yaml\n${m.author.id}\`\`\``)
                    .setThumbnail(m.author.displayAvatarURL)
                    .setFooter(`Event logged on ${new Date().toUTCString()}`)
                    .setTimestamp(new Date())

                    bot.guilds.cache.get(bot.cfg.logging.guild).channels.cache.get(bot.cfg.logging.channel).send({embed: embed2}); */
                })
            } else {
                let embed = OBUtil.err(`Invalid credentials.`)
                .setDescription(`Make sure that your token and e-mail are the same as what you see on https://optifine.net/login.`)

                m.channel.send({embed: embed})
            }
        });
    }
}

module.exports = new Command(metadata);
const path = require(`path`);
const Command = require(`../core/command.js`)

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    short_desc: `Verify donator role.`,
    long_desc: `Verifies your donator status. If successful, this will grant you the donator role, and reset your donator token in the process. \n\nYou can find your donator token by logging in through the website, at https://optifine.net/login. Look at the bottom of the page for a string of random characters (see picture for example). \n**Remember that your "Donation ID" is NOT your token!**\n\nPlease note that this will NOT automatically verify you for the \`${bot.trigger}cape\` command. [See this FAQ entry for instructions on that.](https://discordapp.com/channels/423430686880301056/531622141393764352/622494425616089099)`,
    usage: `<e-mail> <token>`,
    authlevel: 0,
    image: 'IMG_token.png',
    tags: ['DM_ONLY', 'STRICT', 'DELETE_ON_MISUSE'],
    
    run: (m, args, data) => {
        m.reply('Success!');
    }
})}
const path = require(`path`);
const djs = require(`discord.js`);
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    //aliases: [''],
    short_desc: `Information about OptiFine donations.`,
    authlvl: 0,
    flags: ['DM_OPTIONAL', 'NO_TYPER'],
    run: null
}

metadata.run = (m, args, data) => {
    let now = new Date();
    let birthdate = new Date('April 8, 2011 12:00:00')
    let years = now.getUTCFullYear() - birthdate.getUTCFullYear();

    let month_now = now.getUTCMonth();
    let month_birth = birthdate.getUTCMonth();

    if (month_birth > month_now) {
        years--;
    } else
    if (month_birth == month_now && birthdate.getUTCDate() > now.getUTCDate()) {
        years--;
    }

    let embed = new djs.MessageEmbed()
    .setColor(bot.cfg.embed.default)
    .setAuthor('OptiFine Donations', Assets.getEmoji('ICO_heart').url)
    .setTitle('https://optifine.net/donate')
    .setDescription(`OptiFine has been created, developed, and maintained solely by <@202558206495555585> for ${years} whole years and counting. Please consider donating to support the mod's continued development!\n\nFor a one-time donation of $10 USD, you'll (optionally) receive a customizable in-game cape, visible to all other OptiFine players, all in recognition of your awesomeness!`)
    .setFooter(`Thank you for your consideration!`)

    m.channel.send({ embed: embed }).then(bm => OBUtil.afterSend(bm, m.author.id))
}

module.exports = new Command(metadata);
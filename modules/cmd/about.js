const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));

const contributors = require(path.resolve('./cfg/contributors.json'));
const donators = require(path.resolve('./cfg/donators.json'));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    short_desc: `About OptiBot.`,
    authlvl: 0,
    tags: ['DM_OPTIONAL', 'INSTANT', 'BOT_CHANNEL_ONLY'],

    run: (m, args, data) => {
        function uptime(ut) {
            let seconds = (ut / 1000).toFixed(1);
            let minutes = (ut / (1000 * 60)).toFixed(1);
            let hours = (ut / (1000 * 60 * 60)).toFixed(1);
            let days = (ut / (1000 * 60 * 60 * 24)).toFixed(1);

            if (seconds < 60) {
                return seconds + " Seconds";
            } else if (minutes < 60) {
                return minutes + " Minutes";
            } else if (hours < 24) {
                return hours + " Hours";
            } else {
                return days + " Days"
            }
        }

        let embed = new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .setAuthor('About', bot.icons.find('ICO_info'))
        .setThumbnail(bot.user.displayAvatarURL({ format: 'png', size: 64 }))
        .setTitle(`The official OptiFine Discord server bot. \n\n`)
        .setDescription(`Developed and maintained by <@181214529340833792>, <@251778569397600256>, and <@225738946661974017> out of love for a great community.`)
        .addField('Version', bot.version, true)
        .addField('Session Uptime', uptime(process.uptime() * 1000), true)
        .addField(`Contributors`, contributors.join(' '))
        .addField(`Ko-fi Supporters`, donators.join(' '))


        m.channel.send('_ _', {embed: embed}).then(msg => bot.util.responder(m.author.id, msg, bot))
    }
})}

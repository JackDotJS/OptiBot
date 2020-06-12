const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));

const setup = (bot) => {
    return new Command(bot, {
        name: path.parse(__filename).name,
        aliases: ['latency'],
        short_desc: `Measure bot latency and response lag.`,
        authlvl: 1,
        flags: ['DM_OPTIONAL', 'NO_TYPER'],
        run: func
    });
}

const func = (m, args, data) => {
    const bot = data.bot;
    const log = data.log;

    let embed = new djs.MessageEmbed()
    .setAuthor(`Ping...`, bot.icons.find('ICO_wifi'))
    .setColor(bot.cfg.embed.default)
    .setDescription(`API Latency: ... \nMessage Latency: ...`)

    let timeStart = new Date().getTime();
    m.channel.send('_ _', {embed: embed}).then(msg => {
        let timeTaken = new Date().getTime() - timeStart;
        bot.setTimeout(() => {
            let desc = []
            let api = Math.round(bot.ws.ping).toLocaleString();
            let message = timeTaken.toLocaleString();

            if(api < 100) {
                desc.push(`API Latency: ${api}ms (Great)`)
            } else
            if(api < 200) {
                desc.push(`API Latency: ${api}ms (Good)`)
            } else
            if(api < 700) {
                desc.push(`API Latency: ${api}ms (Okay)`)
            } else
            if(api < 2000) {
                desc.push(`API Latency: ${api}ms (Bad)`)
            } else
            if(api >= 2000) {
                desc.push(`API Latency: ${api}ms (Awful)`)
            }

            if(message < 100) {
                desc.push(`Message Latency: ${message}ms (Great)`)
            } else
            if(message < 200) {
                desc.push(`Message Latency: ${message}ms (Good)`)
            } else
            if(message < 700) {
                desc.push(`Message Latency: ${message}ms (Okay)`)
            } else
            if(message < 2000) {
                desc.push(`Message Latency: ${message}ms (Bad)`)
            } else
            if(message >= 2000) {
                desc.push(`Message Latency: ${message}ms (Awful)`)
            }


            embed.author.name = `Pong!`
            embed.description = desc.join('\n');
            msg.edit('_ _', {embed:embed}).then(() => {
                bot.util.responder(m.author.id, msg, bot);
            }).catch(err => {
                bot.util.err(err, bot, {m: m});
            });
        }, 1000);
    });
}

module.exports = setup;
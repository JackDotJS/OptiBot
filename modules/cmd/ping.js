const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));
const errMsg = require(path.resolve(`./modules/util/simpleError.js`));
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    aliases: ['latency'],
    short_desc: `Measure bot latency and response lag.`,
    authlevel: 1,
    tags: ['DM_OPTIONAL', 'INSTANT'],

    run: (m, args, data) => {
        let embed = new djs.RichEmbed()
        .setAuthor(`Ping...`, bot.icons.find('ICO_wifi'))
        .setColor(bot.cfg.embed.default)
        .setDescription(`API Latency: ... \nMessage Latency: ...`)

        let timeStart = new Date().getTime();
        m.channel.send('_ _', {embed: embed})
        .then(msg => {
            let timeTaken = new Date().getTime() - timeStart;
            bot.setTimeout(() => {
                let desc = []
                let api = Math.round(bot.ping).toLocaleString();
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
                    msgFinalizer(m.author.id, msg, bot, log);
                }).catch(err => {
                    m.channel.send({embed: errMsg(err, bot, log)})
                    .catch(err => { log(err.stack, 'error') });
                });
            }, 1000);
        }).catch(err => {
            m.channel.send({embed: errMsg(err, bot, log)})
            .catch(err => { log(err.stack, 'error') });
        });
    }
})}
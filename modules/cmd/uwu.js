const path = require(`path`);
const djs = require(`discord.js`);
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    aliases: ['owo'],
    short_desc: `UwU`,
    long_desc: `UwU OwO UwU`,
    args: `<text | discord message>`,
    authlvl: 1,
    flags: ['DM_OPTIONAL', 'NO_TYPER'],
    run: null
}

metadata.run = (m, args, data) => {
    if (!args[0]) {
        OBUtil.missingArgs(m, metadata);
    } else {
        function translate(message) {
            m.channel.send(OBUtil.uwu(message)).then(bm => OBUtil.afterSend(bm, m.author.id));
        }

        OBUtil.parseTarget(m, 1, args[0], data.member).then(result => {
            if(result && result.type === 'message') {
                translate(result.target.cleanContent);
            } else {
                translate(m.cleanContent.substring(`${bot.prefix}${metadata.name} `.length));
            }
        }).catch(err => {
            OBUtil.err(err, {m:m});
        });
    }
}

module.exports = new Command(metadata);
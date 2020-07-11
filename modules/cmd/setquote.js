const path = require(`path`);
const djs = require(`discord.js`);
const { Command, OBUtil, Memory } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    short_desc: `Update or add a quote to your profile.`,
    args: `<text>`,
    authlvl: 0,
    flags: ['DM_OPTIONAL', 'NO_TYPER'],
    run: null
}

metadata.run = (m, args, data) => {
    if(!args[0]) {
        OBUtil.missingArgs(m, metadata);
    } else 
    if(m.content.substring(`${bot.prefix}${metadata.name} `.length).length > 256) {
        OBUtil.err('Message cannot exceed 256 characters in length.', {m:m})
    } else {
        OBUtil.getProfile(m.author.id, true).then(profile => {
            let lines = m.content.substring(`${bot.prefix}${metadata.name} `.length).replace(/\>/g, '\\>').split('\n');
            let quote = [];
            
            for(let line of lines) {
                quote.push(line.trim());
            }

            profile.ndata.quote = quote.join(' ');

            OBUtil.updateProfile(profile).then(() => {
                let embed = new djs.MessageEmbed()
                .setAuthor(`Your profile has been updated`, OBUtil.getEmoji('ICO_okay').url)
                .setColor(bot.cfg.embed.okay);

                m.channel.send({embed: embed}).then(msg => { OBUtil.afterSend(msg, m.author.id); });
            }).catch(err => {
                OBUtil.err(err, {m:m})
            });
        }).catch(err => {
            OBUtil.err(err, {m:m})
        });
    }
}

module.exports = new Command(metadata);
const path = require(`path`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));

const setup = (bot) => { 
    return new Command(bot, {
        name: path.parse(__filename).name,
        short_desc: `Update or add a quote to your profile.`,
        args: `<text>`,
        authlvl: 0,
        flags: ['DM_OPTIONAL', 'NO_TYPER'],
        run: func
    });
}

const func = (m, args, data) => {
    const bot = data.bot;
    const log = data.log;

    if(!args[0]) {
        data.cmd.noArgs(m);
    } else 
    if(m.content.substring(`${bot.prefix}${data.input.cmd} `.length).length > 256) {
        bot.util.err('Message cannot exceed 256 characters in length.', bot, {m:m})
    } else {
        bot.getProfile(m.author.id, true).then(profile => {
            let lines = m.content.substring(`${bot.prefix}${data.input.cmd} `.length).replace(/\>/g, '\\>').split('\n');
            let quote = [];
            
            for(let line of lines) {
                quote.push(line.trim());
            }

            profile.data.quote = quote.join(' ');

            bot.updateProfile(m.author.id, profile).then(() => {
                let embed = new djs.MessageEmbed()
                .setAuthor(`Your profile has been updated`, bot.icons.find('ICO_okay'))
                .setColor(bot.cfg.embed.okay);

                m.channel.send({embed: embed}).then(msg => { bot.util.responder(m.author.id, msg, bot); });
            }).catch(err => {
                bot.util.err(err, bot, {m:m})
            });
        }).catch(err => {
            bot.util.err(err, bot, {m:m})
        });
    }
}

module.exports = setup;
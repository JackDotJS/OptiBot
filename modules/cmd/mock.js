const path = require(`path`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./core/command.js`))
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    short_desc: `MoCkInG tOnE translator`,
    long_desc: `Rewrites a message with a mOcKiNg tOnE. In other words, this will pseudo-randomize the capitalization of each letter in the given text.`,
    usage: `<text|^ shortcut>`,
    authlevel: 1,
    tags: ['DM_OPTIONAL', 'INSTANT'],

    run: (m, args, data) => {
        if (!args[0]) {
            let embed = new djs.RichEmbed()
            .setAuthor(`Usage:`, bot.icons.find('ICO_info'))
            .setDescription(`\`\`\`${data.cmd.metadata.usage}\`\`\``)
            .setColor(bot.cfg.embed.default);

            m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot, log));
        } else {
            let translate = function(message) {
                let newStr = '';

                for(let i = 0; i < message.length; i++) {
                    let thisChar = message.charAt(i);

                    let fss = i;

                    fss ^= fss >>> 16;
                    fss ^= fss >>> 8;
                    fss ^= fss >>> 4;
                    fss ^= fss >>> 2;
                    fss ^= fss >>> 1;
                    fss = fss & 1;

                    
                    if (fss) {
                        thisChar = thisChar.toUpperCase();
                    } else {
                        thisChar = thisChar.toLowerCase();
                    }

                    newStr += thisChar;

                    if (i+1 === message.length) {
                        m.channel.stopTyping();
                        m.channel.send(newStr).then(bm => msgFinalizer(m.author.id, bm, bot, log));
                    }
                }
            }

            if(args[0] !== '^') {
                translate(m.content.substring(`${bot.trigger}${data.cmd.metadata.name} `.length));
            } else {
                m.channel.fetchMessages({ limit: 5 }).then(msgs => {
                    let itr = msgs.values();
        
                    (function search() {
                        let thisID = itr.next();

                        if (thisID.done) {
                            let embed = new djs.RichEmbed()
                            .setColor(bot.cfg.embed.error)
                            .setAuthor(`Could not find a user.`, bot.icons.find('ICO_error'))
                            .setFooter('Note that this shortcut will skip yourself, and any Discord bot.');
        
                            m.channel.send({ embed: embed }).then(bm => msgFinalizer(m.author.id, bm, bot, log));
                        } else
                        if ([m.author.id, bot.user.id].indexOf(thisID.value.author.id) === -1 && !thisID.value.author.bot) {
                            translate(thisID.value.content);
                        } else search();
                    })();
                })
            }
        }
    }
})}
const path = require(`path`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    short_desc: `MoCkInG tOnE translator.`,
    long_desc: `Rewrites a message with a mOcKiNg tOnE. In other words, this will pseudo-randomize the capitalization of each letter in the given text.`,
    args: `<text | discord message>`,
    authlvl: 1,
    flags: ['DM_OPTIONAL', 'NO_TYPER'],

    run: (m, args, data) => {
        if (!args[0]) {
            data.cmd.noArgs(m);
        } else {
            let translate = function(message) {
                if((Math.random() * 100) < 1) {
                    // 1% chance of UwU
                    m.channel.send(bot.util.uwu(message)).then(bm => bot.util.responder(m.author.id, bm, bot));
                } else {
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
                            m.channel.send(newStr).then(bm => bot.util.responder(m.author.id, bm, bot))
                        }
                    }
                }
            }

            bot.util.target(m, args[0], bot, {type: 1, member: data.member}).then(result => {
                if(result && result.type === 'message') {
                    translate(result.target.cleanContent);
                } else {
                    translate(m.cleanContent.substring(`${bot.prefix}${data.input.cmd} `.length));
                }
            }).catch(err => {
                bot.util.err(err, bot, {m:m});
            });
        }
    }
})}
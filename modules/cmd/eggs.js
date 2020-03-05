const path = require(`path`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));
const erm = require(path.resolve(`./modules/util/simpleError.js`));
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));
const eggs = require(path.resolve(`./cfg/eggs.json`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    aliases: ['secret'],
    short_desc: `...`,
    authlevel: 0,
    tags: ['DM_ONLY', 'INSTANT', 'STRICT'],

    run: (m, args, data) => {
        bot.getProfile(m.author.id, false).then(profile => {
            if(!profile || (typeof profile !== 'undefined' && typeof profile.data.eggs === 'undefined')) {
                let embed = new djs.MessageEmbed()
                .setAuthor(`Not yet.`, bot.icons.find('ICO_z'))
                .setColor(bot.cfg.embed.egg)

                m.channel.send({embed: embed}).then(msg => msgFinalizer(m.author.id, msg, bot))
            } else {
                let unlockedEggs = Object.keys(profile.data.eggs);
                let embed = new djs.MessageEmbed()
                .setAuthor(`You've found ${unlockedEggs.length} secret${(unlockedEggs.length === 1) ? '.' : 's.'}`, bot.icons.find('ICO_z'))
                .setColor(bot.cfg.embed.egg)

                let i = 0;
                (function getEggID() {
                    for(let egg of eggs) {
                        log(unlockedEggs[i])
                        log(egg)
                        if(parseInt(unlockedEggs[i]) === egg.id) {
                            embed.addField(egg.name, `> ${egg.desc}\n(Unlocked on ${new Date(profile.data.eggs[unlockedEggs[i]]).toUTCString()})`, true);

                            if(i+1 === unlockedEggs.length) {
                                m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot));
                            } else {
                                i++;
                                getEggID();
                            }
                        }
                    }
                })();
            }
        });
    }
})}
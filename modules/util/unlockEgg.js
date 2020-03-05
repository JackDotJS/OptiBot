const util = require(`util`);
const path = require(`path`);
const djs = require(`discord.js`);
const eggs = require(path.resolve(`./cfg/eggs.json`));

/**
 * Unlocks OptiBot easter eggs.
 * 
 * @param id Easter Egg ID.
 * @param m User Message.
 * @param bot OptiBot itself.
 */

module.exports = (id, m, bot) => {
    const log = bot.log;
    for(let i in eggs) {
        if(eggs[i].id === id) {
            bot.getProfile(m.author.id, true).then(profile => {
                let first = false;
                if(!profile.data.eggs) {
                    profile.data.eggs = {};
                    first = true;
                }
    
                if(!profile.data.eggs[`${id}`]) {
                    profile.data.eggs[`${id}`] = new Date().getTime();
    
                    bot.updateProfile(m.author.id, profile).then(() => {
                        let embed = new djs.MessageEmbed()
                        .setAuthor(eggs[i].name, bot.icons.find('ICO_z'))
                        .setColor(bot.cfg.embed.egg)
    
                        if(first) {
                            embed.setDescription(`The \`${bot.prefix}eggs\` command has been unlocked for you.`)
                        } else {
                            embed.setDescription(`Secret unlocked.`)
                        }
    
                        m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot));
                    });
                } else {
                    let embed = new djs.MessageEmbed()
                    .setAuthor(`No longer here.`, bot.icons.find('ICO_z'))
                    .setColor(bot.cfg.embed.egg)
    
                    m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot));
                }
            });
            break;
        } else
        if(i+1 === eggs.length) {
            throw new Error('Invalid Easter Egg ID');
        }
    }
}
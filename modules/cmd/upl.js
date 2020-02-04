const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));
const errMsg = require(path.resolve(`./modules/util/simpleError.js`));
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    authlevel: 4,
    tags: ['DM_OPTIONAL'],

    run: (m, args, data) => {
        let policies = require(path.resolve(`./cfg/policies.js`))(bot);
        let channel = bot.guilds.get(bot.cfg.policies.guild).channels.get(bot.cfg.policies.channel);
        let timeStart = new Date().getTime();

        let lastEmbed = new djs.RichEmbed()
        .setColor(bot.cfg.embed.default)
        .setTitle('Final Remarks & Index')
        .setDescription(`With all the said, please keep in mind that **these policies can, and** ***will*** **change.** It's only natural that, as our server grows, we too should evolve to moderate it effectively as times change. Be sure to also review these policies every once in a while, and ESPECIALLY before punishing a user for rule violations. You can quickly view and search policies with the \`${bot.prefix}policy\` command.`)

        let itext = []

        channel.bulkDelete(50).then(() => {
            let i = 0;
            (function postPol() {
                bot.guilds.get(bot.cfg.policies.guild).channels.get(bot.cfg.policies.channel).send({embed: policies[i].embed, files: policies[i].files}).then((pm) => {
                    if(policies[i].type === 0) {
                        itext.push(`● [${policies[i].title}](${pm.url})`)
                    }

                    if(i+1 === policies.length) {
                        lastEmbed.addField('Jump to section', itext.join('\n'));

                        bot.guilds.get(bot.cfg.policies.guild).channels.get(bot.cfg.policies.channel).send({embed: lastEmbed}).then(() => {
                            let embed = new djs.RichEmbed()
                            .setColor(bot.cfg.embed.okay)
                            .setAuthor(`Policies successfully updated in ${((new Date().getTime() - timeStart) / 1000).toFixed(2)} seconds.`, bot.icons.find('ICO_okay'))

                            m.channel.send({embed: embed}).then((msg) => {
                                msgFinalizer(m.author.id, msg, bot, log);
                            });
                        });
                    } else {
                        i++;
                        postPol();
                    }
                }).catch((err) => {
                    m.channel.send({embed: errMsg(err, bot, log)})
                    .catch(err => { log(err.stack, 'error') });
                });
            })()
        }).catch((err) => {
            m.channel.send({embed: errMsg(err, bot, log)})
            .catch(err => { log(err.stack, 'error') });
        });
    }
})}
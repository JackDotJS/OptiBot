const path = require(`path`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));
const targetUser = require(path.resolve(`./modules/util/targetUser.js`))
const errMsg = require(path.resolve(`./modules/util/simpleError.js`));
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    short_desc: `Get beaned.`,
    long_desc: `Beans a user. This is a very serious command and has very serious consequences if used incorrectly. **You have been warned.**`,
    usage: `[discord user]`,
    authlevel: 1,
    tags: ['DM_OPTIONAL', 'INSTANT'],

    run: (m, args, data) => {
        let embed = new djs.RichEmbed()
        .setAuthor(`Successfully beaned user`, bot.icons.find('ICO_okay'))
        .setColor(bot.cfg.embed.okay);

        if(!args[0]) {
            let msgs = [
                "Somebody has been beaned. Probably.",
                "Your mom was beaned. Ha, Gotem. \n\\*dabs epicly\\*",
                `${bot.user.toString()} has been beaned.\nWait, that wasn't supposed to happe-`,
                'Beans and Beans and Beans and Beans.',
                `[Dr. Robotnik's Mean Bean Machine](https://en.wikipedia.org/wiki/Dr._Robotnik%27s_Mean_Bean_Machine) is a [falling block puzzle game](https://en.wikipedia.org/wiki/List_of_puzzle_video_games#Falling_block_puzzles) developed by [Compile](https://en.wikipedia.org/wiki/Compile_(company)) and published by [Sega](https://en.wikipedia.org/wiki/Sega). It was released for the [Genesis/Mega Drive](https://en.wikipedia.org/wiki/Sega_Genesis) in North America and Europe in November 1993, and was ported to the [Game Gear](https://en.wikipedia.org/wiki/Game_Gear) and [Master System](https://en.wikipedia.org/wiki/Master_System) in December 1993 and June 1994, respectively. The plot revolves around [Sonic the Hedgehog](https://en.wikipedia.org/wiki/Sonic_the_Hedgehog) series antagonist [Doctor Robotnik](https://en.wikipedia.org/wiki/Doctor_Eggman) kidnapping residents from Beanville and turning them into robots, with the purpose of removing all joy from the planet Mobius.`,
                `<:ICO_okay:657533487602991114> _ _ Success`,
                `_ _`,
                `\${response}`
            ]
            embed.setDescription(msgs[Math.floor(Math.random() * msgs.length)])

            m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot, log));
        } else {
            let target = m.content.substring( `${bot.trigger}${path.parse(__filename).name} `.length ).trim();
            let botTarget = false;
            let selfTarget = false;

            targetUser(m, target, bot, log, data).then((result) => {
                if(result && result.type === 'user') {
                    target = result.target.toString();

                    if(result.target.id === bot.user.id) {
                        botTarget = true;
                    } else
                    if(result.target.id === m.author.id) {
                        selfTarget = true;
                    }
                }

                if(botTarget) {
                    m.channel.send('bruh');
                } else {
                    embed.setDescription(`${selfTarget ? `You have` : `User ${target} has` } been beaned.`)

                    m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot, log));
                }
            });
        }
    }
})}

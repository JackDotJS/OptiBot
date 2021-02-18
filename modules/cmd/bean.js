const path = require('path');
const djs = require('discord.js');
const { Command, memory, Assets } = require('../core/optibot.js');

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  short_desc: 'Get beaned.',
  long_desc: 'Beans a user. This is a Very Serious(TM) command and has Very Serious(TM) consequences if used incorrectly.',
  args: '[discord member] [reason]',
  authlvl: 1,
  flags: ['DM_OPTIONAL', 'NO_TYPER'],
  run: null
};

metadata.run = (m, args, data) => {
  const embed = new djs.MessageEmbed()
    .setAuthor('Successfully beaned user', Assets.getEmoji('ICO_okay').url)
    .setColor(bot.cfg.embed.okay);

  if (!args[0]) {
    const msgs = [
      'Somebody has been beaned. Probably.',
      'you\'r mom was beaned. \n\\*dabs epicaly\\*',
      `${bot.user.toString()} has been beaned.\n\nWait, wha-`,
      'Beans and Beans and Beans and Beans.',
      '[Dr. Robotnik\'s Mean Bean Machine](https://en.wikipedia.org/wiki/Dr._Robotnik%27s_Mean_Bean_Machine) is a [falling block puzzle game](https://en.wikipedia.org/wiki/List_of_puzzle_video_games#Falling_block_puzzles) developed by [Compile](https://en.wikipedia.org/wiki/Compile_(company)) and published by [Sega](https://en.wikipedia.org/wiki/Sega). It was released for the [Genesis/Mega Drive](https://en.wikipedia.org/wiki/Sega_Genesis) in North America and Europe in November 1993, and was ported to the [Game Gear](https://en.wikipedia.org/wiki/Game_Gear) and [Master System](https://en.wikipedia.org/wiki/Master_System) in December 1993 and June 1994, respectively. The plot revolves around [Sonic the Hedgehog](https://en.wikipedia.org/wiki/Sonic_the_Hedgehog) series antagonist [Doctor Robotnik](https://en.wikipedia.org/wiki/Doctor_Eggman) kidnapping residents from Beanville and turning them into robots, with the purpose of removing all joy from the planet Mobius.',
      `<:ICO_okay:657533487602991114> _​ _ _​ _ ${embed.author.name}`, // warning: zero width chars here
      '_ _',
      '${response}',
      'you forgot to say who got beaned you absolute fucking melon'
    ];
    embed.setDescription(msgs[Math.floor(Math.random() * msgs.length)]);

    m.channel.send(embed).then(bm => bot.util.afterSend(m.author.id, bm, bot));
  } else {
    let target = args[0];
    const reason = (args[1]) ? m.content.substring(`${bot.prefix}${path.parse(__filename).name} ${args[0]} `.length) : null;
    let botTarget = false;
    let selfTarget = false;

    bot.util.parseTarget(m, 0, target, data.member).then((result) => {
      if (args[0] && result && result.type !== 'notfound') {
        target = result.target.toString();

        if (result.id === bot.user.id) {
          botTarget = true;
        } else if (result.id === m.author.id) {
          selfTarget = true;
        }
      }

      if (botTarget) {
        m.channel.send('bruh');
      } else {
        embed.setDescription(`${selfTarget ? 'You have' : `User ${target} has`} been beaned.`);

        if (reason) {
          embed.addField('Reason', reason);
        }

        m.channel.send(embed).then(bm => bot.util.afterSend(m.author.id, bm, bot));
      }
    });
  }
};

module.exports = new Command(metadata);

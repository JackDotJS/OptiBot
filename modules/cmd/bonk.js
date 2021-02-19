const path = require(`path`);
const djs = require(`discord.js`);
const { Command, memory, Assets } = require(`../core/optibot.js`);

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  aliases: [`boatvan`, `botevan`],
  short_desc: `Start a vote to bonk a user.`,
  long_desc: `Starts a vote to bonk a given user. \n\n__**THIS IS A JOKE COMMAND.**__`,
  args: `<discord member> [reason]`,
  image: `IMG_banhammer`,
  authlvl: 1,
  flags: [`DM_OPTIONAL`, `NO_TYPER`, `HIDDEN`],
  run: null
};

metadata.run = (m, args, data) => {
  let target = (args[0] || `*Someone™*`);
  let reason = (args[1]) ? m.content.substring( `${bot.prefix}${data.input.cmd} ${args[0]} `.length ) : null;

  if(!reason) {
    const someReason = [
      `who cares lmao`,
      `used 1996 Ford F-150`,
      `they called optibot stinky`,
      `7`,
      `they delayed cyberpunk 2077 again`,
      `uhhhhhhhhh`,
      `ummmmmmmmmmmm uhhhh`,
      `the`,
      `&`,
      `\\*cough\\*`
    ];

    reason = someReason[Math.floor(Math.random() * someReason.length)];
  }

  bot.util.parseTarget(m, 0, target, bot, data.member).then((result) => {
    if(result && result.type !== `notfound`) {
      if(result.id === bot.user.id) {
        return m.channel.send(`fuck you`);
      } else {
        target = result.target.toString();
      }
    }

    let embed = new djs.MessageEmbed()
      .setColor(bot.cfg.embed.default)
      .setAuthor(`Vote Bonk`, Assets.getEmoji(`ICO_unban`).url)
      .setTitle(`Vote started.`)
      .setDescription(`Bonking: ${target} \nWaiting for ${bot.mainGuild.memberCount.toLocaleString()} votes...`)
      .addField(`Reason`, reason);

    m.channel.send(embed).then(bm => (
      bm.react(bot.guilds.cache.get(bot.cfg.guilds.optibot).emojis.cache.get(bot.cfg.emoji.confirm)).then(() => {
        bot.setTimeout(() => {
          const total = bm.reactions.cache.get(bot.cfg.emoji.confirm);
          embed = new djs.MessageEmbed()
            .setColor(bot.cfg.embed.error)
            .setAuthor(`Vote Bonk`, Assets.getEmoji(`ICO_ban`).url)
            .setTitle(`Vote ended.`)
            .addField(`Reason`, reason);

          if(total.count) {
            embed.setDescription([
              `Received ${total.count}/${bot.mainGuild.memberCount.toLocaleString()} votes.`,
              `(${+parseFloat(total.count / bot.mainGuild.memberCount).toFixed(8)}%)`,
              ``,
              ``,
              `Meh, close enough.`,
              `${target} has been bonked.`
            ].join(`\n`));
          } else {
            embed.setDescription([
              `Received [whatever]/${bot.mainGuild.memberCount.toLocaleString()} votes.`,
              `(blahblahblah%)`,
              ``,
              ``,
              `Meh, close enough.`,
              `${target} has been bonked.`
            ].join(`\n`));
          }

          bm.edit(embed).then(bm2 => {
            bm2.reactions.removeAll().then(() => {
              bot.util.afterSend(bm2, m.author.id);
            });
          });

        }, 1000 * 30);
      })
    ));
  });
};

module.exports = new Command(metadata);

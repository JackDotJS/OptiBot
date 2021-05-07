const path = require(`path`);
const djs = require(`discord.js`);
const { Command, memory, LogEntry, Assets } = require(`../core/modules.js`);

const bot = memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  aliases: [`lockdown`],
  description: {
    short: `Lock ALL server channels.`,
    long: `Locks ALL channels in the server.`
  },
  dm: false,
  flags: [ `LITE` ],
  dperm: `MANAGE_GUILD`,
  run: null
};

metadata.run = (m, args, data) => {
  const channels = [...bot.mainGuild.channels.cache
    .filter((channel) => channel.type === `text` && !bot.cfg.channels.nomodify.some(id => [channel.id, channel.parentID].includes(id)))
    .sort((a, b) => a.rawPosition - b.rawPosition)
    .values()
  ];

  let embed = new djs.MessageEmbed()
    .setAuthor(`Are you sure?`, Assets.getEmoji(`ICO_warn`).url)
    .setColor(bot.cfg.colors.default)
    .setDescription(`ALL of the following channels will be locked: \n> ${channels.join(`\n> `)}`);

  bot.send(m, { embed }).then(bres => {
    const msg = bres.msg;

    bot.util.confirm(m, msg).then(res => {
      if (res === 1) {
        embed = new djs.MessageEmbed()
          .setAuthor(`Locking all channels...`, Assets.getEmoji(`ICO_wait`).url)
          .setColor(bot.cfg.colors.default);

        msg.edit({ embed: embed }).then(() => {
          const logEntry = new LogEntry({ channel: `moderation` })
            .preLoad();

          let i = 0;
          let success = 0;
          let fail = 0;
          (function nextChannel() {
            const channel = channels[i];

            if (channel.permissionOverwrites.get(bot.mainGuild.id).deny.has(`SEND_MESSAGES`)) {
              log(`Skipping channel #${channel.name} (${channel.id}) since it has already been locked.`, `info`);
              i++;
              return nextChannel();
            }

            channel.updateOverwrite(bot.mainGuild.id, { SEND_MESSAGES: false }, `Channel locked by ${m.author.tag} (${m.author.id}) via ${bot.prefix}${data.input.cmd}`).then(() => {
              success++;

              if (i + 1 >= channels.length) {
                logEntry.setColor(bot.cfg.colors.default)
                  .setIcon(Assets.getEmoji(`ICO_lock`).url)
                  .setTitle(`All Channels Locked`, `Channel Lock Report`)
                  .addSection(`Successful Locks`, success, true)
                  .addSection(`Failed Locks`, fail, true)
                  .addSection(`Moderator Responsible`, m.author)
                  .addSection(`Command Location`, m);

                const embed = new djs.MessageEmbed()
                  .setAuthor(`All channels locked.`, Assets.getEmoji(`ICO_okay`).url)
                  .setColor(bot.cfg.colors.okay)
                  .addField(`Successful Locks`, success, true)
                  .addField(`Failed Locks`, fail, true);
                
                msg.edit({ embed: embed });
                logEntry.submit();
              } else {
                i++;
                nextChannel();
              }
            }).catch(err => {
              bot.util.err(err);

              fail++;
              i++;
              nextChannel();
            });
          })();
        });
      } else if (res === 0) {
        const update = new djs.MessageEmbed()
          .setAuthor(`Cancelled`, Assets.getEmoji(`ICO_load`).url)
          .setColor(bot.cfg.colors.default)
          .setDescription(`No channels have been changed.`);

        msg.edit({ embed: update }).then(() => bres.addControl);
      } else {
        const update = new djs.MessageEmbed()
          .setAuthor(`Timed out`, Assets.getEmoji(`ICO_load`).url)
          .setColor(bot.cfg.colors.default)
          .setDescription(`Sorry, you didn't respond in time. Please try again.`);

        msg.edit({ embed: update }).then(() => bres.addControl);
      }
    }).catch(err => {
      bot.util.err(err, { m: m });
    });
  });
};

module.exports = new Command(metadata);
const path = require('path');
const djs = require('discord.js');
const request = require('request');
const { Command, OBUtil, Memory, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  short_desc: `Force update <#${bot.cfg.channels.policies}>.`,
  long_desc: `Forcefully updates the <#${bot.cfg.channels.policies}> channel with a given file.`,
  args: [
    '<attachment>',
    'test <attachment>'
  ],
  authlvl: 4,
  flags: ['NO_DM', 'MOD_CHANNEL_ONLY', 'STRICT', 'DELETE_ON_MISUSE', 'LITE', 'IGNORE_ELEVATED'],
  run: null
};

metadata.run = (m, args) => {
  if (m.attachments.size === 0 || (m.attachments.first().height !== null && m.attachments.first().height !== undefined) || !m.attachments.first().url.endsWith('.js')) {
    return OBUtil.err('You must upload a new set of policies as a valid file attachment.', { m });
  }

  let policies = [];
  let channel = bot.guilds.cache.get(bot.cfg.guilds.policies).channels.cache.get(bot.cfg.channels.policies);
  let deleteOld = true;
  let time = 0;

  const itext = [];
  const itext_trimmed = [];
  let hcount = 0;

  let embed = new djs.MessageEmbed()
    .setAuthor('Are you sure?', Assets.getEmoji('ICO_warn').url)
    .setColor(bot.cfg.embed.default);

  if (args[0] && args[0].toLowerCase() === 'test') {
    channel = m.channel;
    deleteOld = false;
    embed.setDescription('(TEST) The given policies will be loaded in this channel. This action may take several minutes.');
  } else {
    embed.setDescription(`The <#${bot.cfg.channels.policies}> channel will be completely reset and replaced with the given file. This action may take several minutes, and **cannot be undone.**`);
  }

  m.channel.send(embed).then(msg => {
    OBUtil.confirm(m, msg).then(res => {
      if (res === 1) {
        request(m.attachments.first().url, (err, res, data) => {
          if (err || !res || !data) {
            OBUtil.err(err || new Error('Unable to download attachment.'), { m });
          } else {
            const update = new djs.MessageEmbed()
              .setColor(bot.cfg.embed.default)
              .setAuthor('Reloading staff policies...', Assets.getEmoji('ICO_load').url);

            msg.edit({ embed: update }).then((msg) => {
              time = new Date();

              policies = eval(data);

              if (deleteOld) {
                Memory.db.pol.remove({}, {}, (err) => {
                  if (err) {
                    OBUtil.err(err, { m });
                  } else {
                    channel.bulkDelete(100).then(() => {
                      finallyPostShit(msg);
                    }).catch(err => {
                      OBUtil.err(err);
                      planBthisfucker(msg);
                    });
                  }
                });
              } else {
                finallyPostShit(msg);
              }
            }).catch((err) => OBUtil.err(err, { m }));
          }
        });
      } else if (res === 0) {
        const update = new djs.MessageEmbed()
          .setAuthor('Cancelled', Assets.getEmoji('ICO_load').url)
          .setColor(bot.cfg.embed.default)
          .setDescription('Staff policies has not been changed.');

        msg.edit({ embed: update }).then(msg => { OBUtil.afterSend(msg, m.author.id); });
      } else {
        const update = new djs.MessageEmbed()
          .setAuthor('Timed out', Assets.getEmoji('ICO_load').url)
          .setColor(bot.cfg.embed.default)
          .setDescription('Sorry, you didn\'t respond in time. Please try again.');

        msg.edit({ embed: update }).then(msg => { OBUtil.afterSend(msg, m.author.id); });
      }
    }).catch(err => {
      OBUtil.err(err, { m });
    });
  });

  function planBthisfucker(msg) {
    /**
         * discords api will flat out refuse to bulk
         * delete messages that are over 2 weeks old.
         * im sure the massive cunt nugget responsible
         * for that design is feeling real proud.
         * anyway, this alt method will just fetch all 
         * messages and delete them manually.
         * 
         * yknow, one by one.
         * 
         * with massive ratelimiting and everything.
         * 
         * :)
         */

    channel.messages.fetch().then(ms => {
      const msgs = [...ms.values()];
      let im = 0;
      (function delmsg() {
        msgs[im].delete().then(() => {
          if (im + 1 >= msgs.length) {
            finallyPostShit(msg);
          } else {
            im++;
            delmsg();
          }
        }).catch((err) => OBUtil.err(err, { m }));
      })();
    }).catch((err) => OBUtil.err(err, { m }));
  }

  function finallyPostShit(msg) {
    // NOW we can post the new policies
    let i = 0;
    (function postPol() {
      channel.send({ embed: policies[i].embed, files: policies[i].files }).then((pm) => {
        function cont() {
          if (i + 1 === policies.length) {
            let temp = '';
            for (let it = 0; it < itext.length; it++) {
              temp += itext[it] + '\n';

              if (itext[it + 1]) {
                // check if next line is longer than the room we have left
                if (itext[it + 1].length > (2000 - temp.length)) {
                  itext_trimmed.push(temp);
                  temp = '';
                }
              } else if (temp.length > 0) {
                // no more lines left, push whatever we have now
                itext_trimmed.push(temp);
              }

              if (it + 1 === itext.length) {
                postIndex();
              }
            }
          } else {
            i++;
            postPol();
          }
        }

        if (policies[i].files != null && policies[i].title != null) {
          hcount++;
          itext.push(`${hcount}. [${policies[i].title}](${pm.url})<:space:704617016774098967>`); // blank emoji used for spacing
        } else if (policies[i].title != null) {
          // underscores with a zero width character in-between to prevent trimming
          itext.push(`__ • [${policies[i].title}](${pm.url})<:space:704617016774098967>`); // blank emoji used for spacing
        }

        if (policies[i].kw && deleteOld) {
          Memory.db.pol.insert({ id: pm.id, kw: policies[i].kw }, (err) => {
            if (err) {
              OBUtil.err(err, { m });
            } else {
              cont();
            }
          });
        } else {
          cont();
        }
      }).catch((err) => OBUtil.err(err, { m }));
    })();

    let pi = 0;
    function postIndex() {
      const lastEmbed = new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .setDescription(itext_trimmed[pi]);

      if (pi === 0) {
        lastEmbed.setTitle('Table of Contents');
      }

      if (pi + 1 === itext_trimmed.length) {
        lastEmbed.setFooter(`Last Modified Date: ${time.toUTCString()}`)
          .setTimestamp(time);
      }

      channel.send({ embed: lastEmbed }).then(() => {
        if (pi + 1 === itext_trimmed.length) {
          embed = new djs.MessageEmbed()
            .setColor(bot.cfg.embed.okay)
            .setAuthor(`Policies successfully updated in ${((new Date().getTime() - time.getTime()) / 1000).toFixed(2)} seconds.`, Assets.getEmoji('ICO_okay').url);

          msg.edit(embed).then((msg) => OBUtil.afterSend(msg, m.author.id)).catch((err) => OBUtil.err(err, { m }));
        } else {
          pi++;
          postIndex();
        }
      }).catch((err) => OBUtil.err(err, { m }));
    }
  }
};

module.exports = new Command(metadata);
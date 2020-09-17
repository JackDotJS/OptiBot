const djs = require('discord.js');
const { OptiBit, OBUtil, Memory, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;

const metadata = {
  name: 'Message Quotes',
  description: 'todo',
  usage: 'Simply post any Discord message URL.',
  priority: 1,
  concurrent: false,
  authlvl: 0,
  flags: ['DM_OPTIONAL'],
  validator: null,
  run: null
};

metadata.validator = m => {
  if (m.content.match(/discord(?:app)?\.com/i)) {
    const urls = m.content.match(/\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/gi); // eslint-disable-line no-useless-escape

    if (urls != null) {
      return true;
    } else return false;
  } else return false;
};

metadata.executable = m => {
  Memory.li = new Date().getTime();
  const urls = m.content.match(/\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/gi); // eslint-disable-line no-useless-escape

  for (const link of urls) {
    const seg = link.split(/(?<!\/)\/(?!\/)|(?<!\\)\\(?!\\)/g).reverse();

    if (link.match(/discordapp\.com|discord\.com/i) && seg.length === 5 && !isNaN(parseInt(seg[0])) && !isNaN(parseInt(seg[1])) && !isNaN(parseInt(seg[2]))) {
      const rg = seg[2];
      const rc = seg[1];
      const rm = seg[0];

      const guild = bot.guilds.cache.get(rg);
      let channel;
      if (guild != null) channel = guild.channels.cache.get(rc);

      if (channel != null) {
        channel.messages.fetch(rm).then(msg => {
          let contents = msg.content;
          let image = null;
          let title = 'Message posted';
          const embed = new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            //.setTitle((msg.member.nickname != null) ? `${msg.member.nickname} [${msg.author.tag}]` : msg.author.tag)
            .setThumbnail(msg.author.displayAvatarURL({ format: 'png', size: 64, dynamic: true }))
            .setFooter(`Quoted by ${m.author.tag}`);

          if (msg.content.length === 0) {
            contents = [];
            if (msg.embeds.length > 0) {
              contents.push(`\`[${msg.embeds.length} Embed(s)]\``);
            }

            if (msg.attachments.size > 0) {
              const attURL = msg.attachments.first().url;
              if (attURL.endsWith('.png') || attURL.endsWith('.jpg') || attURL.endsWith('.jpeg') || attURL.endsWith('.gif')) {
                image = attURL;

                if ((msg.attachments.size - 1) > 0) {
                  contents.push(`\`[${msg.attachments.size} Attachment(s)]\``);
                }
              } else {
                contents.push(`\`[${msg.attachments.size} Attachment(s)]\``);
              }
            }

            if (contents.length > 0) {
              contents = contents.join('\n');
            }
          } else {
            if (OBUtil.parseInput(msg.content).valid) title = 'Command issued';

            if (msg.attachments.size > 0) {
              const attURL = msg.attachments.first().url;
              if (attURL.endsWith('.png') || attURL.endsWith('.jpg') || attURL.endsWith('.jpeg') || attURL.endsWith('.gif')) {
                image = attURL;
              }
            }
          }

          if (contents.length !== 0) embed.setDescription(contents);

          if (image != null) {
            embed.setImage(image);

            if (contents.length === 0) {
              title = 'Image posted';
            }
          }

          embed.setAuthor(`${title} by ${msg.author.tag}`, Assets.getEmoji('ICO_quote').url);

          m.channel.send({ embed: embed }).then(bm => OBUtil.afterSend(bm, m.author.id));
        }).catch(err => {
          if (err.stack.toLowerCase().indexOf('unknown message') === -1) {
            OBUtil.err(err);
          }
        });
      }

      break;
    }
  }
};

module.exports = new OptiBit(metadata);
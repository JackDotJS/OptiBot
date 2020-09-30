const djs = require('discord.js');
const { OptiBit, OBUtil, Memory, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
  name: 'General URL Handler',
  description: 'Performs various actions when a URL is detected in messages.',
  priority: 1000,
  concurrent: true,
  authlvl: 0,
  flags: ['DM_OPTIONAL', 'HIDDEN'],
  validator: null,
  executable: null
};

metadata.validator = m => {
  const urls = m.content.match(/\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/gi); // eslint-disable-line no-useless-escape

  return urls != null;
};

metadata.executable = m => {
  //remove everything in single and multi-line codeblocks.
  const filtered = m.content.replace(/`{3}[^```]+`{3}|`{1}[^`]+`{1}/gi, '');

  let urls = filtered.match(/\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/gi); // eslint-disable-line no-useless-escape

  if (urls === null) return;

  // get all unique URLs, removing duplicates by using a set and converting back to an array
  urls = [...new Set(urls)];

  log(urls);

  const detected = [];
  const quotes = [];

  for (const url of urls) {
    try {
      const url_obj = new URL(url);

      if (url_obj.username || url_obj.password) {
        detected.push(url);
      }

      if(url_obj.hostname.match(/discordapp\.com|discord\.com/i)) {
        quotes.push(url);
      }
    }
    catch (err) {
      OBUtil.err(err);
    }
  }

  log(detected);

  if (detected.length > 0) {
    const plan_a = [
      `[Original message](${m.url} "${m.url}") posted by ${m.author}`,
      `\`\`\`${detected.slice(0, 3).join('\n')} \n${(detected.length > 3) ? `... (${detected.length - 3} more)` : ''}\`\`\``
    ].join('\n');

    const plan_b = [
      `[Original message](${m.url} "${m.url}") posted by ${m.author}`,
      `\`\`\`Error: Too long to show in an embed. (Detected ${detected.length} link(s) overall)\`\`\``
    ].join('\n');

    const embed = new djs.MessageEmbed()
      .setColor(bot.cfg.embed.default)
      .setAuthor('Hidden Text Detected', Assets.getEmoji('ICO_warn').url)
      .setFooter([
        'This detector was added to combat a recently discovered Discord exploit.',
        'It may not be 100% perfect. Sorry for any false flags!'
      ].join('\n'));

    if (plan_a.length < 2000) {
      embed.setDescription(plan_a);
    } else {
      embed.setDescription(plan_b);
    }

    m.channel.send({ embed: embed });
  } else if (quotes.length > 0) {
    for (const quote of quotes) {
      const seg = quote.split(/(?<!\/)\/(?!\/)|(?<!\\)\\(?!\\)/g).reverse();
  
      if (seg.length === 5 && !isNaN(parseInt(seg[0])) && !isNaN(parseInt(seg[1])) && !isNaN(parseInt(seg[2]))) {
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
  }
};

module.exports = new OptiBit(metadata);
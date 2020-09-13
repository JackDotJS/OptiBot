const path = require('path');
const util = require('util');
const request = require('request');
const djs = require('discord.js');
const { OptiBit, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
  name: 'Hidden URL Text Detector',
  description: 'Description.',
  priority: 1000,
  concurrent: true,
  authlvl: 0,
  flags: ['DM_OPTIONAL', 'HIDDEN'],
  validator: null,
  run: null
};

metadata.validator = (m, member, authlvl) => {
  const urls = m.content.match(/\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/gi); // eslint-disable-line no-useless-escape

  return (urls != null);
};

metadata.executable = (m, member, authlvl) => {
  //remove everything in single and multi-line codeblocks.
  const filtered = m.content.replace(/`{3}[^```]+`{3}|`{1}[^`]+`{1}/gi, '');

  let urls = filtered.match(/\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/gi); // eslint-disable-line no-useless-escape

  if (urls === null) return;

  // get all unique URLs, removing duplicates by using a set and converting back to an array
  urls = [...new Set(urls)];

  log(urls);

  const detected = [];

  for (const url of urls) {
    try {
      const url_obj = new URL(url);

      if (url_obj.username || url_obj.password) {
        detected.push(url);
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
        'This system was added to combat a recently discovered Discord exploit.',
        'It may not be 100% perfect. Sorry for any false flags!'
      ].join('\n'));

    if (plan_a.length < 2000) {
      embed.setDescription(plan_a);
    } else {
      embed.setDescription(plan_b);
    }

    m.channel.send({ embed: embed });
  }
};

module.exports = new OptiBit(metadata);
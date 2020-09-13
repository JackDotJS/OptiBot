const path = require('path');
const util = require('util');
const djs = require('discord.js');
const { OptiBit, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
  name: 'Direct Message Default Response',
  description: 'Description.',
  image: 'IMG_args',
  priority: 0,
  concurrent: false,
  authlvl: -1,
  flags: ['DM_ONLY', 'HIDDEN'],
  validator: null,
  run: null
};

metadata.validator = () => true;

metadata.executable = (m, member, authlvl) => {
  const embed = new djs.MessageEmbed()
    .setColor(bot.cfg.embed.default)
    //.setAuthor(`Hi there!`, Assets.getEmoji('ICO_info').url)
    .setTitle('Hi there!')
    .setDescription(`For a list of commands, type \`${bot.prefix}list\`. If you've donated and you'd like to receive your donator role, type \`${bot.prefix}help dr\` for instructions.`);

  m.channel.send({ embed });
};

module.exports = new OptiBit(metadata);
/* eslint-disable */
const path = require('path');
const util = require('util');
const djs = require('discord.js');
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets, OptiBit } = require('../core/OptiBot.js');

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  aliases: ['showtag'],
  short_desc: `Retrieves a tag from the tag database`,
  long_desc: `Retrieves a tag from the tag database.`,
  args: '<tag name>',
  image: 'IMG_args',
  authlvl: 0,
  flags: ['DM_OPTIONAL', 'LITE'],
  run: null
};

metadata.run = (m, args, data) => {
  const tagsDB = Memory.db.tags;

  const tagName = args[0];

  if (!tagName) return OBUtil.err('Missing tag name', { m });

  tagsDB.find({ name: tagName }, (err, doc) => {
    if (err) return OBUtil.err(err, { m });

    if (doc.length === 0) return OBUtil.err(':x: **I couldn\'t find a tag by that name!**', { m });

    const embed = new djs.MessageEmbed()
      .setColor(bot.cfg.colors.default)

    m.channel.send(doc[0].description).then(bm => OBUtil.afterSend(bm, m.author.id));
  });
};

module.exports = new Command(metadata);
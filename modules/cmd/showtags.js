/* eslint-disable */
const path = require('path');
const util = require('util');
const djs = require('discord.js');
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets, OptiBit } = require('../core/OptiBot.js');

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  aliases: ['showalltags', 'tags', 'alltags'],
  short_desc: `Shows all the tags in the database`,
  long_desc: `Shows all the tags in the database`,
  image: 'IMG_args',
  authlvl: 0,
  flags: ['DM_OPTIONAL', 'LITE'],
  run: null
};

metadata.run = (m, args, data) => {
  const tagsDB = Memory.db.tags;

  tagsDB.find({}, (err, doc) => {
    if (err) return OBUtil.err(err, { m });

    m.channel.send(`:pencil: **List of tags:**\n${doc.map(g => `\`${g.name}\``).join(', ')}`)
      .then(bm => OBUtil.afterSend(bm, m.author.id));
  });
};

module.exports = new Command(metadata);
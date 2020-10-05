/* eslint-disable */
const path = require('path');
const util = require('util');
const djs = require('discord.js');
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets, OptiBit } = require('../core/OptiBot.js');

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  // aliases: ['aliases'],
  short_desc: `Adds a tag to the tag database`,
  long_desc: `Adds a tag to the tag database. Can be retrieved by typing \`${bot.prefix}tag <tag name>\``,
  args: '<tag name> <tag content>',
  image: 'IMG_args',
  authlvl: 3,
  flags: ['DM_OPTIONAL', 'LITE'],
  run: null
};

metadata.run = (m, args, data) => {
  const tagsDB = Memory.db.tags;

  const tagName = args[0];
  const tagDescription = args.splice(1).join(' ');

  if (!tagName) return OBUtil.err('Missing tag name', { m });
  if (!tagDescription) return OBUtil.err('Missing tag description', { m });

  tagsDB.insert({ name: tagName, description: tagDescription, username: m.author.username }, (err, doc) => {
    if (err) return OBUtil.err(err, { m });

    m.channel.send(`✅ \`|\` :pencil: **Tag \`${doc.name}\` created.**`).then(bm => OBUtil.afterSend(bm, m.author.id));
  });
};

module.exports = new Command(metadata);
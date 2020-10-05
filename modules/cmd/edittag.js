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
  short_desc: `Edits a tag in the tag database`,
  long_desc: `Changes the description of the tag in a database.`,
  args: '<tag name> <new description>',
  image: 'IMG_args',
  authlvl: 1,
  flags: ['DM_OPTIONAL', 'LITE'],
  run: null
};

metadata.run = (m, args, data) => {
  const tagsDB = Memory.db.tags;

  const tagName = args[0];
  const tagDescription = args.splice(1).join(' ');

  if (!tagName) return OBUtil.err('Missing tag name', { m });

  tagsDB.find({ name: tagName }, (err, doc) => {
    if (err) return OBUtil.err(err, { m });

    if(m.author.id !== doc[0].userID) return OBUtil.err('You cannot edit this user\'s tag!');

    tagsDB.update({ name: tagName }, { $set: { description: tagDescription } }, {}, (err, numReplaced) => {
      if (err) return OBUtil.err(err, { m });
  
      return m.channel.send(`✅ \`|\` :pencil: **Tag \`${tagName}\` edited.**`).then(bm => OBUtil.afterSend(bm, m.author.id));
    });
  });
};

module.exports = new Command(metadata);
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
  short_desc: `Deletes a tag from the tag database`,
  long_desc: `Deletes a tag from the tag database. This action **CANNOT BE UNDONE**`,
  args: '<tag name>',
  image: 'IMG_args',
  authlvl: 1,
  flags: ['DM_OPTIONAL', 'LITE'],
  run: null
};

metadata.run = (m, args, data) => {
  const tagsDB = Memory.db.tags;

  const tagName = args[0];

  if (!tagName) return OBUtil.err('Missing tag name', { m });

  tagsDB.find({ name: tagName }, (err, doc) => {
    if (err) return OBUtil.err(err, { m });

    if (m.author.id !== doc[0].userID || OBUtil.getAuthlvl(bot.mainGuild.members.cache.get(doc[0].userID)) >= data.authlvl ) 
      return OBUtil.err('You cannot delete this user\'s tag!', { m });

    tagsDB.remove({ name: tagName }, {}, (err, numRemoved) => {
      if (err) return OBUtil.err(err, { m });
  
      m.channel.send(`✅ \`|\` :pencil: **Tag \`${tagName}\` deleted.**`).then(bm => OBUtil.afterSend(bm, m.author.id));
    });
  });
};

module.exports = new Command(metadata);
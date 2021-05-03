const djs = require(`discord.js`);
const memory = require(`../core/memory.js`);

const bot = memory.core.client;
const log = bot.log;


module.exports = async (guild) => {
  if (guild == null) return null;

  const cfg = {};
  const sources = [ bot.gcfg ];

  const docs = await memory.db.guilds.find({ _id: bot.guilds.resolveID(guild) });

  if (docs.length > 0) sources.push(docs[0]);

  return Object.assign(cfg, sources);
};
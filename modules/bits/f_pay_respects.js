const { OptiBit, memory } = require(`../core/modules.js`);

const bot = memory.core.client;

const metadata = {
  name: `F in the chat`,
  description: `Self-explanatory.`,
  priority: 0,
  concurrent: false,
  authlvl: 0,
  flags: [`DM_OPTIONAL`, `HIDDEN`],
  validator: null,
  executable: null
};

metadata.validator = m => m.content.toLowerCase().trim() === `f`;

metadata.executable = m => m.react(`🇫`).catch(bot.util.err);

module.exports = new OptiBit(metadata);
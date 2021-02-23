const { OptiBit, memory } = require(`../core/OptiBot.js`);

const bot = memory.core.client;

const metadata = {
  name: `Band Emojis`,
  description: `🎺 🎸 🥁 🎤`,
  usage: `Just type "band". Not case-sensitive. Does not work if your message contains any more text.`,
  priority: 0,
  concurrent: true,
  authlvl: 1,
  flags: [`DM_OPTIONAL`],
  validator: null,
  executable: null
};

metadata.validator = m => m.content.toLowerCase() === `band`;

metadata.executable = async m => {
  Promise.all([
    m.react(`🎺`),
    m.react(`🎸`),
    m.react(`🥁`),
    m.react(`🎤`)
  ]).catch(bot.util.err);
};

module.exports = new OptiBit(metadata);
const { OptiBit, Assets, memory } = require(`../core/modules.js`);

const bot = memory.core.client;

const metadata = {
  name: `Reddit moment`,
  description: `When someone mentions Reddit or a subreddit`,
  priority: 0,
  concurrent: false,
  authlvl: 0,
  flags: [`DM_OPTIONAL`, `HIDDEN`],
  validator: null,
  executable: null
};

metadata.validator = m => /(\s|sub|^)+((reddit\W*\s?)|(r\/\S*\s?))/ig.test(m.content);

metadata.executable = m => {
  Promise.all([
    m.react(Assets.getEmoji(`upvote`)),
    m.react(Assets.getEmoji(`downvote`))
  ]).catch(bot.util.err);
};

module.exports = new OptiBit(metadata);
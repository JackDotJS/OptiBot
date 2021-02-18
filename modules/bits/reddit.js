const { OptiBit, OBUtil, Assets } = require('../core/OptiBot.js');

const metadata = {
  name: 'Reddit moment',
  description: 'When someone mentions Reddit or a subreddit',
  priority: 0,
  concurrent: false,
  authlvl: 0,
  flags: ['DM_OPTIONAL', 'HIDDEN'],
  validator: null,
  executable: null
};

metadata.validator = m => (m.content.toLowerCase().includes("reddit") || m.content.toLowerCase().includes("r/"));

metadata.executable = m => {
    m.react(Assets.getEmoji("upvote")).catch(OBUtil.err);
    m.react(Assets.getEmoji("downvote")).catch(OBUtil.err);
};

module.exports = new OptiBit(metadata);
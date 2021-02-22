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

metadata.validator = m => /(\s|sub|^)+((reddit\W*\s?)|(r\/\S*\s?))/ig.test(m.content);

metadata.executable = m => {
    m.react(Assets.getEmoji("upvote")).catch(OBUtil.err);
    m.react(Assets.getEmoji("downvote")).catch(OBUtil.err);
};

module.exports = new OptiBit(metadata);
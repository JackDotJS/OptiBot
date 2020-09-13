const { OptiBit, OBUtil } = require('../core/OptiBot.js');

const metadata = {
  name: 'Band Emojis',
  description: 'todo',
  usage: 'Just say "band". Not case-sensitive. Does not work if your message contains any more text.',
  priority: 0,
  concurrent: true,
  authlvl: 1,
  flags: ['DM_OPTIONAL'],
  validator: null,
  run: null
};

metadata.validator = m => m.content.toLowerCase() === 'band';

metadata.executable = async m => {
  Promise.all([
    m.react('🎺'),
    m.react('🎸'),
    m.react('🥁'),
    m.react('🎤')
  ]).catch(err => OBUtil.err(err));
};

module.exports = new OptiBit(metadata);
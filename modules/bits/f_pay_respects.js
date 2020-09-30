const { OptiBit, OBUtil } = require('../core/OptiBot.js');

const metadata = {
  name: 'F in the chat',
  description: 'Self-explanatory.',
  priority: 0,
  concurrent: false,
  authlvl: 0,
  flags: ['DM_OPTIONAL', 'HIDDEN'],
  validator: null,
  executable: null
};

metadata.validator = m => m.content.toLowerCase().trim() === 'f';

metadata.executable = m => m.react('🇫').catch(OBUtil.err);

module.exports = new OptiBit(metadata);
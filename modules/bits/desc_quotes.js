const { OptiBit } = require('../core/optibot.js');

/**
 * This file only exists to retain a visible description for the quotes part of url_handler.js
 * 
 * Part of the fix for #216
 */

const metadata = {
  name: 'Message Quotes',
  description: 'Fetches and displays message contents for a given Discord message URL.',
  usage: 'Simply post any Discord message URL. Only works for messages OptiBit has direct access to, such as those in the OptiFine server.',
  priority: 0,
  concurrent: false,
  authlvl: 0,
  flags: ['DM_OPTIONAL'],
  validator: () => { return false; },
  executable: () => {}
};

module.exports = new OptiBit(metadata);
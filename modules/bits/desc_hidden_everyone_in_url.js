const { OptiBit } = require(`../core/modules.js`);

/**
 * This file only exists to retain a visible description for the hidden URL detection part of url_handler.js
 * 
 * Part of the fix for #216
 */

const metadata = {
  name: `Hidden URL Text Detector`,
  description: `Detects "hidden text" in URLs. This is more accurately described as "userinfo", which is typically rendered invisible by most applications such as Discord.`,
  priority: 1000,
  concurrent: true,
  authlvl: 0,
  flags: [`DM_OPTIONAL`, `HIDDEN`],
  validator: () => { return false; },
  executable: () => {}
};

module.exports = new OptiBit(metadata);
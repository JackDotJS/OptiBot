const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const { OptiBit, memory, RecordEntry, LogEntry, Assets } = require(`../core/modules.js`);

const bot = memory.core.client;
const log = bot.log;

const metadata = {
  name: `Mojang JIRA Issue Detector`,
  description: `todo`,
  usage: `Type \` MC- \` immediately followed by the given issue ID, like so: \` MC-123456 \`. Note that IDs are ignored if they are surrounded by ANYTHING EXCEPT empty space, periods, parenthesis \` () \`, and other similar word-ending characters.`,
  priority: 2,
  concurrent: true,
  authlvl: 50,
  flags: [`DM_OPTIONAL`, `HIDDEN`],
  validator: null,
  executable: null
};

metadata.validator = (m, member, authlvl) => {
  //todo
};

metadata.executable = (m, member, authlvl) => {
  //todo
};

module.exports = new OptiBit(metadata);
const djs = require(`discord.js`);
const memory = require(`../core/memory.js`);

module.exports = async (member, gcfg) => {
  const bot = memory.core.client;
  const log = bot.log; 

  const guildPerms = gcfg.perms;

  member = await member.fetch(); // just in case

  const perms = {
    maxlvl: 0,
    nodes: [],
    has: (q) => {
      if (typeof q !== `string`) return null;
      if (perms.nodes.includes(`*`)) return true;
      return perms.nodes.includes(q.toLowerCase());
    }
  };

  guildPerms.sort((a, b) => {
    // sorts by priority, then by type

    const prioritySort = (a.priority || 0) - (b.priority || 0);

    // list of valid types
    // the index of these will define how they're sorted.
    const types = [
      `PERM`,
      `ROLE`,
      `USER`
    ];

    const typeSort = types.indexOf(a.type) - types.indexOf(b.type);

    if (prioritySort !== 0) return prioritySort;
    return typeSort;
  });

  const apply = (group) => {
    // todo: get all parent groups and add them in order of highest parent first

    for (const node of group) {
      if (perms.nodes.includes(node)) continue; // this node has already been added

      if (node === `!*` && group.priority > perms.maxlvl) {
        // remove all nodes
        perms.nodes = [];
        return;
      }

      if (node.startsWith(`!`) && perms.nodes.includes(node.substring(1)) && group.priority >= perms.maxlvl) {
        // remove previously added node
        perms.nodes.splice(perms.nodes.indexOf(node.substring(1)), 1);
        continue;
      }

      perms.nodes.push(node);
    }
  };

  if (member.hasPermission(`ADMINISTRATOR`, { checkAdmin: true, checkOwner: true }) || member.user.id === bot.cfg.env.developer) {
    // member is an server admin, server owner, or bot developer
    // skip calculation of all permissions
    perms.nodes.push(`*`);
    return perms;
  }

  for (const group of guildPerms) {
    switch (group.type) {
      case `USER`:
        if (group.target === member.user.id) apply(group);
        break;
      case `ROLE`:
        if (member.roles.cache.has(group.target)) apply(group);
        break;
      case `PERM`:
        if (member.hasPermission(group.target)) apply(group);
        break;
      default:
        apply(group);
    }
  }

  return perms;
};
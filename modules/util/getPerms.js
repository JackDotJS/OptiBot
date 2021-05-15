const djs = require(`discord.js`);
const memory = require(`../core/memory.js`);

module.exports = async (user, gcfg) => {
  const bot = memory.core.client;
  const log = bot.log; 

  const guildPerms = gcfg.perms;

  let member = null;
  let maxlvl = 0;

  if (user instanceof djs.GuildMember) {
    member = await user.fetch(); // just in case
    user = member.user;
  }

  const perms = {
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

  const apply = (group, rec) => {
    if (group.name != null) rec.push(group.name); // if this group has a name, add it to recursion check

    if (group.priority > maxlvl) maxlvl = group.priority; // set maxlvl to this groups priority level if it's higher

    if (group.parent != null) {
      // go through guild perms to find the given parent.
      // parents will always be applied first.
      for (const pgroup of guildPerms) {
        // apply parent group if it exists, and only if it hasn't already been referenced by another group in this tree
        if (pgroup.name === group.parent && !rec.includes(pgroup.name)) apply(pgroup, rec);
      }
    }

    for (const node of group.nodes) {
      if (perms.nodes.includes(node)) continue; // this node has already been added

      if (node === `!*` && group.priority > maxlvl) {
        // remove all nodes
        perms.nodes = [];
        return;
      }

      if (node.startsWith(`!`) && perms.nodes.includes(node.substring(1)) && group.priority >= maxlvl) {
        // remove previously added node
        perms.nodes.splice(perms.nodes.indexOf(node.substring(1)), 1);
        continue;
      }

      perms.nodes.push(node);
    }
  };

  if (user.id === bot.cfg.env.developer || member != null && member.hasPermission(`ADMINISTRATOR`, { checkAdmin: true, checkOwner: true })) {
    // member is an server admin, server owner, or bot developer
    // skip calculation of all permissions
    perms.nodes.push(`*`);
    return perms;
  }

  for (const group of guildPerms) {
    const recursionCheck = []; // list of named groups in this tree. prevents circular dependencies for permission groups

    if (member == null && group.type === `PERM` && group.target === `SEND_MESSAGES`) {
      // allows DM commands to work
      apply(group, recursionCheck);
      continue;
    }

    switch (group.type) {
      case `USER`:
        if (group.target === user.id) apply(group, recursionCheck);
        break;
      case `ROLE`:
        if (member.roles.cache.has(group.target)) apply(group, recursionCheck);
        break;
      case `PERM`:
        if (member.hasPermission(group.target)) apply(group, recursionCheck);
        break;
      default:
        apply(group, recursionCheck);
    }
  }

  return perms;
};
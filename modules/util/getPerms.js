const djs = require(`discord.js`);
const memory = require(`../core/memory.js`);

// not even god himself knows how this works

module.exports = async (member) => {
  const bot = memory.core.client;
  const log = bot.log; 

  const perms = {
    level: 0,
    nodes: []
  };

  if (member.constructor === djs.User) {
    member = bot.mainGuild.members.cache.get(member.id);
  }

  if (member == null) return null;

  if (member.id === bot.user.id) {
    perms.level = Infinity;
    perms.nodes = [ `*` ];

    return perms;
  }

  const roles = member.roles.cache;
  const assignments = Object.keys(bot.cfg.perms);
  let depth = 0;

  const checkOverride = (nodes, inherits) => {
    depth++;
    if (inherits == null) return nodes;

    const newNodes = [...nodes];

    for (const aname of assignments) {
      if (aname !== inherits) continue;

      const assignment = bot.cfg.perms[aname];

      const getInherits = checkOverride(assignment.nodes, assignment.inherits);

      for (const node of getInherits) {
        if (node.startsWith(`!`) && newNodes.includes(node.substring(1))) continue;

        newNodes.push(node);
      }
    }

    return newNodes;
  };


  for (const aname of assignments) {
    depth = 0;
    const assignment = bot.cfg.perms[aname];

    if (roles.has(assignment.id) || member.id === assignment.id) {
      if (assignment.nodes.includes(`*`) || bot.mainGuild.ownerID === member.id) {
        perms.level = Infinity;
        perms.nodes.push(`*`);
        break;
      }

      if (assignment.nodes.includes(`!*`)) {
        perms.nodes.push(`!*`);
        break;
      }

      perms.nodes.push(...checkOverride(assignment.nodes, assignment.inherits));

      if (depth > perms.level) perms.level = depth;
    }
  }

  // final validation

  perms.nodes = [...new Set(perms.nodes)];

  perms.nodes = perms.nodes.filter((node) => node.includes(`*`) || !node.startsWith(`!`));

  perms.nodes.sort();

  for (const node of perms.nodes) {
    if (node.includes(`.`)) {
      const subnode = node.split(`.`);

      if (!perms.nodes.includes(subnode[0])) {
        log(`User ${member.id} has unusable subnode ${subnode[1]} of ${subnode[0]}`);
      }
    }
  }

  return perms;
};
const ob = require(`../core/OptiBot.js`);
const util = require(`util`);

const bot = ob.memory.core.client;
const log = ob.log;

module.exports = async (m) => {
  if (bot.pause) return;
  if (m.author.bot || m.author.system || m.type !== `DEFAULT` || m.system) return;

  if (ob.memory.users.indexOf(m.author.id) === -1) {
    ob.memory.users.push(m.author.id);

    const profile = await bot.profiles.get(m.author.id);

    profile.edata.lastSeen = new Date().getTime();
    bot.profiles.update(profile);
  }

  const input = bot.util.parseInput(m.content);

  const member = bot.mainGuild.members.cache.get(m.author.id);

  if (member == null) {
    if (input.valid) bot.util.err(`Sorry, you must be a member of the OptiFine Discord server to use this bot.`, { m: m });
    return;
  }

  if (input.valid) {
    /////////////////////////////////////////////////////////////
    // COMMAND HANDLER
    /////////////////////////////////////////////////////////////

    bot.util.handleCommand(m, input);
  } else {

    return; // temporary

    /////////////////////////////////////////////////////////////
    // OPTIBIT HANDLER
    /////////////////////////////////////////////////////////////

    const validbits = [];

    for (const optibit of ob.memory.assets.optibits) {
      if (authlvl < optibit.metadata.authlvl) continue;
      if (optibit.metadata.flags[`NO_DM`] && m.channel.type === `dm`) continue;
      if (optibit.metadata.flags[`DM_ONLY`] && m.channel.type !== `dm`) continue;

      if (optibit.validate(m, member, authlvl)) {
        validbits.push(optibit);
      }
    }

    if (validbits.length > 0) {
      ob.memory.li = new Date().getTime();

      validbits.sort((a, b) => { a.metadata.priority - b.metadata.priority; });
      validbits.reverse();

      log(util.inspect(validbits));

      for (const optibit of validbits) {
        if (validbits[0].metadata.concurrent && !optibit.metadata.concurrent) continue;

        try {
          let loc = `#${m.channel.name}`;

          if (m.channel.type === `dm`) {
            loc = `DM`;
          } else if (m.guild.id === bot.cfg.guilds.optibot) {
            loc = `OB:#${m.channel.name}`;
          } else if (m.guild.id === bot.cfg.guilds.donator) {
            loc = `DR:#${m.channel.name}`;
          }

          log(`[${loc}] [L${authlvl}] ${m.author.tag} (${m.author.id}) OptiBit Executed: "${optibit.metadata.name}"`, `info`);
          optibit.exec(m, member, authlvl);
        }
        catch (err) {
          bot.util.err(err, { m: m });
        }

        if (!validbits[0].metadata.concurrent) break;
      }
    }
  }




};
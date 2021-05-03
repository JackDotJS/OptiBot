const path = require(`path`);
const djs = require(`discord.js`);
const util = require(`util`);
const { Command, memory, Assets } = require(`../core/optibot.js`);

const bot = memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  aliases: [`pingmods`, `moderator`, `moderators`, `mods`],
  description: {
    short: `Ping server moderators.`,
    long: `Pings server moderators. This command should only be used for *legitimate reasons,* such as reporting rule breakers or requesting server roles. Think of it as actually pinging a role. **Continually using this command improperly will not be tolerated.**`
  },
  dm: false,
  flags: [ `LITE` ],
  run: null
};


metadata.run = m => {
  const pinged = [
    `202558206495555585`, // exclude sp614x
    m.author.id // exclude command issuer
  ];

  let pings = null;
  let attempts = 0;
  let prevTier = null;
  let resolved = false;
  let response = null;
  let msgListener = null;
  let rctListener = null;

  const jrmods = bot.mainGuild.roles.cache.get(bot.cfg.roles.jrmod);
  const mods = bot.mainGuild.roles.cache.get(bot.cfg.roles.moderator);
  const admins = bot.mainGuild.roles.cache.get(bot.cfg.roles.admin);
  const staff = mods.members.concat(jrmods.members, admins.members).array();

  function getPings() {
    const pings = {
      recent: [], // recent messages
      online: [], // online status
      all: [], // everyone not pinged
    };

    const data = {
      ids: [],
      selectTier: 0,
      mentions: null,
      debug: {
        tiers: null,
        presence: []
      }
    };

    for (let i = 0; i < staff.length; i++) {
      const mod = staff[i];

      if (!pinged.includes(mod.user.id)) {
        pings.all.push(mod.user.id);

        // simplified presence data just to remove clutter (guild, member, etc)
        const debugPresence = {
          user: {
            username: mod.presence.user.username,
            discriminator: mod.presence.user.discriminator,
            id: mod.presence.user.id,
            lastMessageID: mod.presence.user.lastMessageID,
            lastMessageChannelID: mod.presence.user.lastMessageChannelID
          },
          status: mod.presence.status,
          clientStatus: mod.presence.clientStatus,
          activities: mod.presence.activities
        };

        data.debug.presence.push(debugPresence);

        if (mod.presence.status === `online`) {
          pings.online.push(mod.user.id);

          if (mod.lastMessage != null && (mod.lastMessage.createdTimestamp + 600000) > new Date().getTime()) {
            pings.recent.push(mod.user.id);
          }
        } else if (mod.presence.status === `away`) {
          pings.away.push(mod.user.id);
        }
      }
    }

    log(util.inspect(pings));

    const tiers = Object.keys(pings);

    for(let i = 0; i < tiers.length; i++) {
      const tier = pings[tiers[i]];
      const noAdmins = tier.filter(id => admins.members.get(id) == null);

      log(i);
      log(tier);

      if (tier.length === 0) continue;

      data.selectTier = i;

      if(prevTier === i) {
        log(`same tier`);
        
        if(noAdmins.length === 0) {
          log(`only admins`);
          // only admins left in this tier
          data.ids = tier;
        } else {
          log(`mods`);
          data.ids = noAdmins;
        }
      } else {
        log(`new tier`);

        let selectRandom = noAdmins[Math.floor(Math.random() * noAdmins.length)];

        if(noAdmins.length === 0) {
          log(`only admins`);
          selectRandom = tier[Math.floor(Math.random() * tier.length)];
        }

        data.ids = [selectRandom];
      }

      prevTier = i;
      break;
    }

    pinged.push(...data.ids);
    data.mentions = `<@${data.ids.join(`> <@`)}>`;
    data.debug.tiers = pings;

    log(util.inspect(data));

    return data;
  }

  // debugging for #224
  function getDebugInfo() {
    return [
      `Attempts: ${attempts}`,
      `Select Tier: ${pings.selectTier}`,
      `Previous Tier: ${prevTier}`,
      `Pinged: ${pinged.length}/${staff.length}`,
      `Resolved: ${resolved}`,
      ``,
      `Pinged IDs:`,
      util.inspect(pinged),
      ``,
      `getPings():`,
      util.inspect(pings, true, 5),
      ``,
      `First Bot Response:`,
      util.inspect(response),
      ``,
      `msgListener:`,
      util.inspect(msgListener),
      ``,
      `rctListener:`,
      util.inspect(rctListener),
    ].join(`\n`);
  }

  if (memory.mpc.includes(m.channel.id)) {
    return bot.util.err(`Moderators have already been recently called in this channel. Please wait a few moments before trying again.`, { m });
  } else {
    memory.mpc.push(m.channel.id);

    bot.setTimeout(() => {
      // function to automatically remove in 10 minutes incase something goes wrong
      if (memory.mpc.indexOf(m.channel.id) > -1) {
        memory.mpc.splice(memory.mpc.indexOf(m.channel.id), 1);
      }

      if (msgListener != null && !msgListener.ended) msgListener.stop();
      if (rctListener != null && !rctListener.ended) rctListener.stop();
    }, 600000);
  }

  function resolve(user) {
    if (resolved) return;
    resolved = true;

    if (!rctListener.ended) rctListener.stop(`resolved`);
    if (!msgListener.ended) msgListener.stop(`resolved`);

    const finalEmbed = new djs.MessageEmbed();

    if (user != null) {
      finalEmbed.setColor(bot.cfg.colors.okay)
        .setAuthor(`Issue resolved`, Assets.getEmoji(`ICO_okay`).url)
        .setDescription(`Resolved by ${user}`);
    } else {
      finalEmbed.setColor(bot.cfg.colors.error)
        .setAuthor(`Failed to get a response`, Assets.getEmoji(`ICO_error`).url)
        .setDescription(`This is taking longer than usual. We'll get back to you as soon as possible.`);
    }

    response.edit(response.content, { embed: finalEmbed });

    memory.mpc.splice(memory.mpc.indexOf(m.channel.id), 1);
    
    if (!response.deleted) {
      response.reactions.removeAll();
    }
  }

  (function tryResolution() {
    if (resolved) return;

    pings = getPings();
    attempts++;

    const timeout = ( 1000 * 30 * (attempts + 1) ); // add 30 secs for every attempt, starting with 60 secs

    /* // THIS IS SPAMMY!!! USE FOR DEBUGGING ONLY!!!
    const timeout = ( 1000 * 1.5 * (attempts + 1) ); */

    let content = pings.mentions;

    log(getDebugInfo(), `debug`);

    const embed = new djs.MessageEmbed()
      .setColor(bot.cfg.colors.default)
      .setAuthor(`Moderator Request`, Assets.getEmoji(`ICO_bell`).url)
      .addField(
        `Information for Staff:`,
        `Use the reaction button on ${(attempts === 1) ? `this message` : `[this message](${response.url})`}, **or** send a message in this channel to begin resolving this issue.`
      );

    if (pinged.length < staff.length) {
      embed.setFooter(`Next attempt in ${timeout / 1000} seconds.`);
    }

    if (attempts === 1) {
      content = `[${m.author}]: ${pings.mentions}`;
      embed.setTitle(`A moderator should be with you soon!`);
    } else {
      embed.setTitle(`Looks like they were busy. Let's try some others.`);
    }

    m.channel.send(content, { embed: embed }).then(msg => {
      m.channel.stopTyping(true);

      if (pinged.length < staff.length) {
        log(`modping: waiting for ${timeout / 1000} seconds`);

        bot.setTimeout(() => {
          tryResolution();
        }, timeout);
      } else {
        resolve();
      }

      if(attempts === 1) {
        response = msg;

        response.react(bot.emojis.cache.get(bot.cfg.emoji.resolve))
          .catch(err => {
            bot.util.err(err, { m });
          });

        // === REACTION FILTER ===
        // 1. reaction emoji is resolve emoji
        // 2. reaction was added by staff member (jr mods, mods, admins)
        const filter_r = (r, user) => r.emoji.id === bot.cfg.emoji.resolve && staff.some(sm => user.id === sm.user.id);

        // === MESSAGE FILTER ===
        // 1. message posted by staff member (jr mods, mods, admins)
        // 2. message author IS NOT the issuer of this modping
        const filter_m = (mc) => staff.some(sm => mc.author.id === sm.user.id) && mc.author.id != m.author.id;

        rctListener = response.createReactionCollector(filter_r);
        msgListener = response.channel.createMessageCollector(filter_m);

        rctListener.on(`collect`, (r, user) => {
          resolve(user);
        });

        msgListener.on(`collect`, (mr) => {
          resolve(mr.author);
        });

        rctListener.on(`end`, (c, reason) => {
          log(`modping reaction collector ended`);
          if (reason !== `resolved`) log(reason, `error`);
        });

        msgListener.on(`end`, (c, reason) => {
          log(`modping message collector ended`);
          if (reason !== `resolved`) log(reason, `error`);
        });
      }
    });
  })();
};

module.exports = new Command(metadata);
const path = require('path');
const djs = require('discord.js');
const util = require('util');
const { Command, OBUtil, Memory, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  aliases: ['pingmods', 'moderator', 'moderators', 'mods'],
  short_desc: 'Ping server moderators.',
  long_desc: 'Pings server moderators. This command should only be used for *legitimate reasons,* such as reporting rule breakers or requesting server roles. Think of it as actually pinging a role. **Continually using this command improperly will not be tolerated.** \n\nAdditionally, this command tries to minimize mass pings by only selecting moderators that have sent a message in the past 10 minutes, or those who are simply online. \nThe selection priority works as follows:\n\n**1.** Recent Messages\n**2.** Online status\n**3.** All with the <@&467060304145023006> or <@&644668061818945557> roles.',
  authlvl: 0,
  flags: ['NO_DM', 'NO_TYPER', 'STRICT', 'LITE'],
  run: null
};


metadata.run = m => {
  const pinged = [m.author.id];

  let pings = null;
  let attempts = 0;
  let prevTier = null;

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
      ids: null,
      selectTier: 0,
      mentions: null,
      debug: {
        tiers: null,
        presence: []
      }
    };

    for (let i = 0; i < staff.length; i++) {
      const mod = staff[i];

      if (mod.user.id === '202558206495555585') continue; // exclude sp614x

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

        if (mod.presence.status === 'online') {
          pings.online.push(mod.user.id);

          if (mod.lastMessage != null && (mod.lastMessage.createdTimestamp + 600000) > new Date().getTime()) {
            pings.recent.push(mod.user.id);
          }
        } else if (mod.presence.status === 'away') {
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
        log('same tier');
        
        if(noAdmins.length === 0) {
          log('only admins');
          // only admins left in this tier
          data.ids = tier;
        } else {
          log('mods');
          data.ids = noAdmins;
        }
      } else {
        log('new tier');

        let selectRandom = noAdmins[Math.floor(Math.random() * noAdmins.length)];

        if(noAdmins.length === 0) {
          log('only admins');
          selectRandom = tier[Math.floor(Math.random() * tier.length)];
        }

        data.ids = [selectRandom];
      }

      prevTier = i;
      break;
    }

    pinged.push(...data.ids);
    data.mentions = `<@${data.ids.join('> <@')}>`;
    data.debug.tiers = pings;

    log(util.inspect(data));

    return data;
  }

  // debugging for #224
  function getDebugInfo() {
    const contents = [
      `Attempts: ${attempts}`,
      `Select Tier: ${pings.selectTier}`,
      `Previous Tier: ${prevTier}`,
      `Pinged: ${pinged.length-1}/${staff.length}`,
      ``,
      `Pinged IDs:`,
      util.inspect(pinged),
      ``,
      `getPings():`,
      util.inspect(pings, true, 5),
    ].join('\n');

    return new djs.MessageAttachment(Buffer.from(contents), 'debug.txt');
  }

  if (Memory.mpc.includes(m.channel.id)) {
    return m.channel.send(`Sorry ${m.author}, this command is currently on cooldown in this channel. Please wait a few moments before trying this again.`)
      .then(bm => OBUtil.afterSend(bm, m.author.id));
  } else {
    Memory.mpc.push(m.channel.id);

    bot.setTimeout(() => {
      // function to automatically remove in 10 minutes incase something goes wrong
      if (Memory.mpc.indexOf(m.channel.id) > -1) {
        Memory.mpc.splice(Memory.mpc.indexOf(m.channel.id), 1);
      }
    }, 600000);
  }

  const embed = new djs.MessageEmbed()
    .setColor(bot.cfg.embed.default)
    .setAuthor('A moderator should be with you soon!', Assets.getEmoji('ICO_bell').url);

  m.channel.send(`${m.author}`, { embed: embed }).then(pr => {
    function getModEmbed() {
      return new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .setAuthor('Moderator Presence Request', Assets.getEmoji('ICO_bell').url)
        .setTitle('To begin resolving: Use the reaction button on the following linked message, or send your own message in the given channel.')
        .setDescription(`${pr.channel} | [Direct URL](${pr.url})`)
        .addField('Issuer', `${m.author} | ${m.author.tag} \n\`\`\`yaml\nID: ${m.author.id}\`\`\``)
        .setThumbnail(m.author.displayAvatarURL({ format: 'png' }))
        .setFooter(`Next attempt in ${30 * (attempts+1)} seconds.`);
    }

    function resolve(user) {
      const finalEmbed = new djs.MessageEmbed();

      if (user) {
        finalEmbed.setColor(bot.cfg.embed.okay)
          .setAuthor('Issue resolved', Assets.getEmoji('ICO_okay').url)
          .setDescription(`Resolved by ${user}`);
      } else {
        finalEmbed.setColor(bot.cfg.embed.error)
          .setAuthor('Failed to get a response', Assets.getEmoji('ICO_error').url)
          .setDescription(`This is taking longer than usual. We'll get back to you as soon as possible.`);
      }

      pr.edit(`${m.author}`, { embed: finalEmbed });

      Memory.mpc.splice(Memory.mpc.indexOf(m.channel.id), 1);
      
      if (!pr.deleted) {
        pr.reactions.removeAll();
      }
    }

    function tryResolution(godfuckingdammit) {
      pings = getPings();

      bot.channels.cache.get(bot.cfg.channels.modmail).send(`${pings.mentions} ${pr.channel}`, { embed: getModEmbed(), files: [ getDebugInfo() ] }).then(() => {
        attempts++;

        const timeout = (1000 * 30 * attempts);

        log(`modping: waiting for ${timeout / 1000} seconds`);

        // reaction filter
        const filter_r = (r, user) => r.emoji.id === bot.cfg.emoji.resolve && staff.some(sm => user.id === sm.user.id);
        // message filter
        const filter_m = (mc) => staff.some(sm => mc.author.id === sm.user.id) && mc.author.id != m.author.id;

        const df = pr.createReactionCollector(filter_r, { time: timeout });
        const mc = pr.channel.createMessageCollector(filter_m);

        df.on('collect', (r, user) => {
          df.stop('resolved');

          resolve(user);
        });

        mc.on('collect', (mm) => {
          /**
           * the only reason we need the bot's own reaction
           * is explicitly so this exact function works. the
           * reaction is literally never used for anything
           * except to prevent D.JS from throwing an error
           * here. its fucking stupid i know but it's the
           * only way i can make this work right now and im
           * tired. fuck you
           */
          df.handleCollect(godfuckingdammit, mm.author);
        });

        df.on('end', (c, reason) => {
          mc.stop();
          if (reason === 'time') {
            // post next level of pings
            if (pinged.length !== staff.length) {
              tryResolution(godfuckingdammit);
            } else {
              resolve();
            }
          } else if (reason !== 'resolved') {
            log(reason, 'error');
          }
        });
      });
    }

    pr.react(bot.guilds.cache.get(bot.cfg.guilds.optibot).emojis.cache.get(bot.cfg.emoji.resolve)).then(r => {
      tryResolution(r);
    }).catch(err => {
      OBUtil.err(err, { m });
    });
  });
};

module.exports = new Command(metadata);
const djs = require(`discord.js`);
const memory = require(`../core/memory.js`);
const util = require(`util`);

/**
 * Gets a user, member, or message based on various text-based shortcuts.
 *
 * @param {djs.Message} m Author message.
 * @param {Number} type Target type. 0 = Member. 1 = Message.
 * @param {String} target Input to parse.
 * @param {djs.GuildMember} member Author as an OptiFine guild member.
 * @returns {Promise<Object>}
 */
module.exports = async (m, type, input) => {
  const bot = memory.core.client;
  const log = bot.log;

  if (m == null || type == null || input == null) return null;

  log(`get target from ${input}`);
  log(`selection type ${type}`);

  const uniform = {
    type: null,
    id: null,
    mention: null,
    plaintext: null,
    target: null,
  };

  const matchUserMention = djs.MessageMentions.USERS_PATTERN.exec(input);
  const matchChannelMention = djs.MessageMentions.CHANNELS_PATTERN.exec(input);
  const matchArrowShortcut = (/^\^{1,10}$/).exec(input);
  const matchDiscordURL = (/discordapp\.com|discord.com/i).exec(input);

  // i swear i'd be using switch/cases here if eslint wouldnt yell at me

  if ([`myself`, `me`].includes(input.toLowerCase())) {
    if (type.toLowerCase() === `member`) {
      uniform.type = `member`;
      uniform.id = m.author.id;
      uniform.mention = m.author.toString();
      uniform.plaintext = m.author.tag;
      uniform.target = m.member;
    }

    if (type.toLowerCase() === `message`) {
      uniform.type = `message`;
      uniform.id = m.id;
      uniform.target = m;
    }

    if (type.toLowerCase() === `channel`) {
      const channel = await m.author.createDM();
      uniform.type = `channel`;
      uniform.id = channel.id;
      uniform.mention = channel.toString();
      uniform.target = channel;
    }
  }

  if (input.toLowerCase() === `random`) {
    if (type.toLowerCase() === `member`) {
      const members = bot.mainGuild.members.cache.array();
      const someone = members[~~(Math.random() * members.length)];

      uniform.type = `member`;
      uniform.id = someone.id;
      uniform.mention = someone.toString();
      uniform.plaintext = someone.user.tag;
      uniform.target = someone;

    }

    const channels = bot.mainGuild.channels.cache.array().filter(channel => 
      ![...bot.cfg.channels.staff, ...bot.cfg.channels.blacklist].some(id => 
        [channel.id, channel.parentID].includes(id) || channel.type !== `text`
      )
    );
    
    if (type.toLowerCase() === `message`) {
      let attempts = 0;
      const roll = async () => {
        attempts++;

        if (attempts >= 10) return; // avoid endless loop, just in case

        const channel = channels[~~(Math.random() * channels.length)];
        const messages = channel.messages.cache.array();
        const message = messages[~~(Math.random() * messages.length)];

        if (message.content.length === 0) return await roll();

        uniform.type = `message`;
        uniform.id = message.id;
        uniform.target = message;

        return;
      };

      await roll();
    }
    
    if (type.toLowerCase() === `channel`) {
      const channel = channels[~~(Math.random() * channels.length)];
      
      uniform.type = `channel`;
      uniform.id = channel.id;
      uniform.mention = channel.toString();
      uniform.target = channel;
    }
  }

  if (matchUserMention != null) {
    const member = bot.mainGuild.members.cache.get(matchUserMention[1]);

    if (member != null) {
      if (type.toLowerCase() === `member`) {
        uniform.type = `member`;
        uniform.id = member.id;
        uniform.mention = member.toString();
        uniform.plaintext = member.user.tag;
        uniform.target = member;
      }
  
      if (type.toLowerCase() === `message` && member.lastMessage != null) {
        uniform.type = `message`;
        uniform.id = member.lastMessage.id;
        uniform.target = member.lastMessage;
      }
  
      if (type.toLowerCase() === `channel`) {
        const channel = await member.user.createDM();
        uniform.type = `channel`;
        uniform.id = channel.id;
        uniform.mention = channel.toString();
        uniform.target = channel;
      }
    }
  }

  if (matchChannelMention != null) {
    const channel = bot.channels.cache.get(matchChannelMention[1]);

    if (channel != null) {
      if (type.toLowerCase() === `message` && channel.isText()) {
        const message = channel.messages.cache.first();

        uniform.type = `message`;
        uniform.id = message.id;
        uniform.target = message;
      }
  
      if (type.toLowerCase() === `channel`) {
        uniform.type = `channel`;
        uniform.id = channel.id;
        uniform.mention = channel.toString();
        uniform.target = channel;
      }
    }
  }

  if (matchDiscordURL != null) {
    // todo
  }

  if (matchArrowShortcut != null) {
    // todo
  }

  if (!isNaN(input) && parseInt(input) >= 1420070400000) {
    // todo
  }

  return uniform;
};
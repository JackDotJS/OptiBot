const path = require(`path`);
const cstr = require(`string-similarity`);
const djs = require(`discord.js`);
const { Command, memory, Assets } = require(`../core/optibot.js`);

const bot = memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  aliases: [`commands`, `cmds`, `cmdlist`],
  short_desc: `List all OptiBot commands.`,
  long_desc: [
    `Lists all OptiBot commands. By default, this will show every single command you have access to. Alternatively, you can use the following filters:`,
    ``,
    `**General**`,
    `**\`q:*\`** - Search commands with a given word, or a phrase surrounded by quotes ("). This will search command names, short/long descriptions, and arguments.`,
    `**\`has:*\`** - Same as the above, but 100% more strict.`,
    ``,
    `**Role-Based**`,
    `**\`retired\`** - Lists all <@&757863669055881317> commands.`,
    `**\`jrmod\`** - Lists all <@&644668061818945557> commands.`,
    `**\`srmod\`** - Lists all <@&467060304145023006> commands.`,
    `**\`mod\`** - Lists all <@&644668061818945557> **and** <@&467060304145023006> commands.`,
    `**\`admin\`** - Lists all <@&663122057818537995> commands.`,
    ``,
    `**Developer**`,
    `**\`dev\`** - (DEV) Lists all commands usable by OptiBot Developers.`,
    `**\`flag:*\`** - (DEV) Lists all commands with the given flag name.`,
  ].join(`${Assets.getEmoji(`ICO_space`)}\n`) + Assets.getEmoji(`ICO_space`).toString(),
  args: [
    `[page number] [filter]`,
    `[filter] [page number]`
  ],
  authlvl: 0,
  flags: [`DM_OPTIONAL`, `BOT_CHANNEL_ONLY`],
  run: null
};

metadata.run = (m, args, data) => {
  const list = memory.assets.commands;
  let filtered;
  let selectPage = 1;
  let menu = ``;
  let stext = ``;
  let ftext = ``;

  const isModChannel = (m.channel.type === `dm` || bot.cfg.channels.mod.includes(m.channel.id) || bot.cfg.channels.mod.includes(m.channel.parentID));

  let inputTest = m.content.match(/(?<=\w:["'`]).+(?=["'`])/);
  if (inputTest === null) inputTest = m.content.match(/(?<=\w:)\S+/);
  if (inputTest === null) inputTest = args;

  const inputSpaceCount = (inputTest[0] != null) ? (inputTest[0].split(` `).length - 1) : 0;

  if (args[0] && isNaN(args[0])) {
    menu = args[0].toLowerCase();
  } else if (args[1] && isNaN(args[1])) {
    menu = args[1].toLowerCase();
  }

  if (args[0] && !isNaN(args[0])) {
    selectPage = parseInt(args[0]);
  } else if (args[1 + (inputSpaceCount)] && !isNaN(args[1 + (inputSpaceCount)])) {
    selectPage = parseInt(args[1 + (inputSpaceCount)]);
  }

  log(`target: args[${1 + (inputSpaceCount)}] === ${args[1 + (inputSpaceCount)]}`);
  log(selectPage);
  log(args);

  const defaultFilter = () => {
    if (!isModChannel && data.authlvl > 0) {
      filtered = list.filter((cmd) => (cmd.metadata.authlvl === 0));
      ftext = `Note: Some commands have been hidden because you're in a public channel.`;
    } else {
      filtered = list.filter((cmd) => (cmd.metadata.authlvl <= data.authlvl));
    }
  };

  if ([`dev`, `admin`, `mod`, `srmod`, `jrmod`, `retired`].includes(menu)) {
    const auths = [];

    switch (menu) {
      case `dev`:
        auths.push(5);
        stext = `Search Filter: Developer Commands`;
        break;
      case `admin`:
        auths.push(4);
        stext = `Search Filter: Administrator Commands`;
        break;
      case `mod`:
        auths.push(2, 3);
        stext = `Search Filter: All Moderator Commands`;
        break;
      case `srmod`:
        auths.push(3);
        stext = `Search Filter: Sr. Moderator Commands`;
        break;
      case `jrmod`:
        auths.push(2);
        stext = `Search Filter: Jr. Moderator Commands`;
        break;
      default:
        auths.push(1);
        stext = `Search Filter: Retired Staff Commands`;
    }

    if (data.authlvl < auths[0]) {
      return bot.util.err(`You do not have permission to view these commands.`, { m: m });
    }

    if (!isModChannel && data.authlvl > 0) {
      return bot.util.err(`You cannot view these commands outside of moderator-only channels and DMs.`, { m: m });
    }

    filtered = list.filter((cmd) => auths.includes(cmd.metadata.authlvl));
  } else if (menu.startsWith(`flag:`) && menu !== `flag:` && data.authlvl >= 3) {
    if (!isModChannel && data.authlvl > 0) {
      return bot.util.err(`You cannot view these commands outside of moderator-only channels and DMs.`, { m: m });
    }

    const flag = menu.substring(`flag:`.length).toUpperCase();
    filtered = list.filter((cmd) => (cmd.metadata.flags[`${flag}`]));
    stext = `Search Filter: FLAG \`${flag}\``;
  } else if (menu.startsWith(`q:`) && menu !== `q:`) {
    defaultFilter();

    let query = m.content.match(/(?<=q:["'`]).+(?=["'`])/);

    if (!query) query = m.content.match(/(?<=q:)\S+/);

    stext = `Search Filter: "${query}"`;

    query = query.toString().toLowerCase();

    const copyList = [];

    for (const i in filtered) {
      const cmd = filtered[i];

      // jaro-winkler
      //let compare = wink;

      // dice's coefficient
      const compare = cstr.compareTwoStrings;

      const ratings = [
        compare(cmd.metadata.name.toLowerCase(), query),
        compare(cmd.metadata.short_desc.toLowerCase(), query),
        compare(cmd.metadata.long_desc.toLowerCase(), query),
        compare(cmd.metadata.args.toLowerCase(), query)
      ];

      for (const alias of cmd.metadata.aliases) {
        ratings.push(compare(alias, query));
      }

      ratings.sort((a, b) => b - a);

      copyList.push({
        command: cmd,
        _qr: ratings[0]
      });
    }

    copyList.sort((a, b) => b._qr - a._qr);

    filtered = copyList;
  } else if (menu.startsWith(`has:`) && menu !== `has:`) {
    defaultFilter();

    let query = m.content.match(/(?<=has:["'`]).+(?=["'`])/);

    if (!query) query = m.content.match(/(?<=has:)\S+/);

    stext = `Search Filter: "${query}" (literal)`;

    query = query.toString().toLowerCase();

    // yo dawg so i heard u like filters
    filtered = filtered.filter((cmd) => {
      if (cmd.metadata.name.includes(query)) return true;
      if (cmd.metadata.aliases.includes(query)) return true;
      if (cmd.metadata.short_desc.includes(query)) return true;
      if (cmd.metadata.long_desc.includes(query)) return true;
      if (cmd.metadata.args.includes(query)) return true;
    });
  } else {
    defaultFilter();
  }

  if (filtered.length === 0) {
    if (menu.startsWith(`flag:`) && data.authlvl >= 3) {
      const flag = menu.substring(`flag:`.length).toUpperCase();
      bot.util.err(`Could not find any commands with the "${flag}" flag.`, { m: m });
    } else {
      bot.util.err(`Could not find any commands with the "${menu}" filter.`, { m: m });
    }
    return;
  }

  let pageNum = 1;
  const pageLimit = Math.ceil(filtered.length / 10);
  if (selectPage > 0 && selectPage <= pageLimit) {
    pageNum = selectPage;
  }

  const tooltip = `(i)`;

  const embed = new djs.MessageEmbed()
    .setColor(bot.cfg.embed.default)
    .setAuthor(`OptiBot Command Index | Page ${pageNum}/${pageLimit}`, Assets.getEmoji(`ICO_docs`).url)
    .setDescription(`Hover over the tooltip icons [${tooltip}](${m.url.replace(/\/\d+$/, ``)} "No easter eggs here... 👀") or use \`${bot.prefix}help <command>\` for detailed information.`);

  if (stext.length > 0) embed.setTitle(stext);

  if (ftext.length > 0) embed.setFooter(ftext);

  let i = (pageNum > 1) ? (10 * (pageNum - 1)) : 0;
  let added = 0;
  (function addList() {
    const cmd = (filtered[i]._qr != null) ? filtered[i].command.metadata : filtered[i].metadata;
    const hover_text = [];

    if (cmd.long_desc.length > 325) {
      hover_text.push(`This description is too long to show here. Type "${bot.prefix}help ${cmd.name}" for full details.`);
    } else {
      hover_text.push(cmd.long_desc);
    }

    hover_text.push(
      ``,
      `Usage:`,
      `${cmd.args_pt}`,
      ``
    );

    if (cmd.flags[`NO_DM`]) {
      if (cmd.flags[`BOT_CHANNEL_ONLY`]) {
        hover_text.push(`❌ This command can *only* be used in the #optibot channel.`);
      } else {
        hover_text.push(`⚠ This command can be used in any channel, but *not* in DMs (Direct Messages)`);
      }
    } else if (cmd.flags[`DM_ONLY`]) {
      hover_text.push(`❌ This command can *only* be used in DMs (Direct Messages)`);
    } else if (cmd.flags[`BOT_CHANNEL_ONLY`]) {
      hover_text.push(`⚠ This command can *only* be used in DMs (Direct Messages) or the #optibot channel.`);
    } else if (cmd.flags[`MOD_CHANNEL_ONLY`]) {
      if (cmd.flags[`NO_DM`]) {
        hover_text.push(`❌ This command can *only* be used in moderator-only channels.`);
      } else {
        hover_text.push(`❌ This command can *only* be used in DMs (Direct Messages) or any moderator-only channel.`);
      }
    } else {
      hover_text.push(`☑ This command can be used in any channel, including DMs (Direct Messages)`);
    }

    if (cmd.flags[`STRICT`]) {
      hover_text.push(`🔒 Restrictions apply to ALL members, regardless of roles or permissions.`);
    } else if (cmd.flags[`BOT_CHANNEL_ONLY`]) {
      hover_text.push(`🔓 Moderators exempt from some restrictions.`);
    }

    if (cmd.authlvl === 0) {
      hover_text.push(`🔓 Available to all server members.`);
    } else if (cmd.authlvl === 1) {
      hover_text.push(`🔒 Retired Staff, Jr. Moderators, and higher.`);
    } else if (cmd.authlvl === 2) {
      hover_text.push(`🔒 Jr. Moderators, Moderators, and higher.`);
    } else if (cmd.authlvl === 3) {
      hover_text.push(`🔒 Moderators and Administrators only.`);
    } else if (cmd.authlvl === 4) {
      hover_text.push(`🔒 Administrators only.`);
    } else if (cmd.authlvl === 5) {
      hover_text.push(`🔒 OptiBot developers only.`);
    }

    if (cmd.flags[`HIDDEN`]) {
      hover_text.push(`⚠ This is a hidden command. OptiBot will act as if this command does not exist to any user who does not have permission.`);
    }

    embed.addField(`${bot.prefix + cmd.name}`, `${cmd.short_desc} [${tooltip}](${m.url.replace(/\/\d+$/, ``)} "${hover_text.join(`\n`)}") ${(filtered[i]._qr != null) ? `\` (${(filtered[i]._qr * 100).toFixed(1)}%) \`` : ``}`);
    added++;

    if (added >= 10 || i + 1 >= filtered.length) {
      bot.send(m, { embed });
    } else {
      i++;
      addList();
    }
  })();
};

module.exports = new Command(metadata);
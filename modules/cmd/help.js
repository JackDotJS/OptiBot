const path = require(`path`);
const cstr = require(`string-similarity`);
const wink = require(`jaro-winkler`);
const util = require(`util`);
const djs = require(`discord.js`);
const { Command, memory, Assets } = require(`../core/modules.js`);

const bot = memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  description: {
    short: `Find or view Vector commands.`
  },
  args: [
    `[command]`,
    `[query]`
  ],
  dm: true,
  flags: [ `LITE` ],
  dperm: `SEND_MESSAGES`,
  run: null
};

metadata.run = async (m, args, data) => {
  const list = [];
  let query;
  let strict = false;

  const parseQuery = (/((?<=").+?(?="))|([^"]+)/i).exec(m.cleanContent.substring(`${bot.prefix}${data.input.cmd} `.length));

  if (parseQuery != null) {
    if (parseQuery[1] != null) {
      strict = true;
      query = parseQuery[1];
    } else if (parseQuery[2] != null) {
      query = parseQuery[2];
    }
  }

  log(strict);
  log(query);

  const showPages = async () => {
    const hasScore = list.some((item) => item.score != null);

    const perPage = (hasScore) ? 24 : 10;
    const pageLimit = Math.ceil((list.length * ((hasScore) ? 3 : 1)) / perPage);
    const pages = [];

    const title = (query != null) ? `Searching for: "${(query.length > 64) ? query.substring(0, 64) + `...` : query }" ${(strict) ? `(strict)` : ``}` : null;

    let embed;

    if (list.length === 0) {
      embed = new djs.MessageEmbed()
        .setColor(bot.cfg.colors.default)
        .setAuthor(`OptiBot Index`, await Assets.getIcon(`ICO_docs`, bot.cfg.colors.default))
        .setDescription(`Could not find any commands.`);

      if (title) embed.setTitle(title);

      return bot.send(m, { embed });
    }

    for (const result of list) {
      const cmd = result.cmd;
      const score = (hasScore) ? (result.score * 100).toFixed(1) : null;

      if (embed != null && embed.fields.length >= perPage) {
        pages.push(embed);
        embed = null;
      }

      if (embed == null) {
        embed = new djs.MessageEmbed()
          .setColor(bot.cfg.colors.default)
          .setAuthor(`OptiBot Index | ${pages.length+1}/${pageLimit}`, await Assets.getIcon(`ICO_docs`, bot.cfg.colors.default))
          .setDescription(`Use \`${bot.prefix}help <command>\` for details about a specific command.`);
        
        if (title) embed.setTitle(title);
      }

      embed.addField(
        `${bot.prefix}${cmd.metadata.name}`,
        `${cmd.metadata.description.short}`,
        hasScore
      );

      if (hasScore) {
        embed.addField(
          `_ _`,
          `_ _`,
          true
        ).addField(
          `_ _`,
          `**${score}% match**`,
          true
        );
      }
    }

    pages.push(embed);

    bot.send(m, { embeds: pages });
  };

  const showCommand = async (cmd) => {
    const md = cmd.metadata;

    const embed = new djs.MessageEmbed()
      .setColor(bot.cfg.colors.default)
      .setAuthor(`OptiBot Index`, await Assets.getIcon(`ICO_docs`, bot.cfg.colors.default))
      .setTitle(bot.prefix + md.name)
      .setDescription(md.description.long)
      .addField(`Usage Example(s)`, `\`\`\`\n${md.args.join(`\`\`\` \`\`\`\n`)}\`\`\``);

    if (md.aliases.length > 0) {
      embed.addField(`Aliases`, `\`\`\`${bot.prefix}${md.aliases.join(`, ${bot.prefix}`)}\`\`\``);
    }

    if (md.image) {
      embed.attachFiles([ new djs.MessageAttachment(Assets.getImage(md.image), `image.png`) ])
        .setThumbnail(`attachment://image.png`);
    }

    bot.send(m, { embed });
  };

  // todo: filter commands
  for (const cmd of memory.assets.commands) {
    if (cmd.metadata.flags[`PERMS_REQUIRED`] && !data.perms.has(`*`)) continue;
    if (cmd.metadata.flags[`HIDDEN`] && !data.perms.has(`bypassHidden`)) continue;

    if (query == null) {
      list.push({ cmd });
      continue;
    }

    const toCheck = [
      cmd.metadata.name,
      ...cmd.metadata.args,
      ...cmd.metadata.aliases,
      cmd.metadata.description.short,
      cmd.metadata.description.long,
      ...Object.keys(cmd.metadata.flags).filter((flag) => cmd.metadata.flags[flag]),
    ];

    const checkFullMatch = [
      cmd.metadata.name,
      ...cmd.metadata.aliases
    ];

    if (strict) {
      if (toCheck.join().toLowerCase().includes(query.toLowerCase())) list.push({ cmd });
    } else 
    if (checkFullMatch.some(item => item.toLowerCase() === query.toLowerCase())) {
      return showCommand(cmd);
    } else {
      let score = 0;

      log(toCheck);

      // jaro-winkler
      //const compare = wink;

      // dice's coefficient
      const compare = cstr.compareTwoStrings;

      for (const property of toCheck) {
        const newScore = compare(property, query);

        if (newScore > score) score = newScore;
      }

      list.push({ cmd, score });
    }
  }

  if (!list.some(item => item.score == null)) list.sort((a, b) => b.score - a.score);

  log(list.length);

  showPages();
};

module.exports = new Command(metadata);
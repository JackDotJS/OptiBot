const path = require(`path`);
const cstr = require(`string-similarity`);
const wink = require(`jaro-winkler`);
const util = require(`util`);
const djs = require(`discord.js`);
const { Command, memory, Assets } = require(`../core/optibot.js`);

const bot = memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  short_desc: `Find or view OptiBot commands.`,
  long_desc: `Gives detailed information about a given command.`,
  args: `[command name|command alias|query]`,
  authlvl: 0,
  flags: [`DM_OPTIONAL`, `NO_TYPER`, `BOT_CHANNEL_ONLY`],
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
    const perPage = 10;
    const pageLimit = Math.ceil(list.length / perPage);
    const pages = [];

    const title = (query != null) ? `Search Query: "${(query.length > 64) ? query.substring(0, 64) + `...` : query }" ${(strict) ? `(strict)` : ``}` : null;

    let embed;

    if (list.length === 0) {
      embed = new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .setAuthor(`OptiBot Index`, await Assets.getIcon(`ICO_docs`, bot.cfg.embed.default))
        .setDescription(`Could not find any commands.`);

      if (title) embed.setTitle(title);

      return bot.send(m, { embed });
    }

    for (const result of list) {
      const cmd = result.cmd;
      const score = result.score;

      if (embed != null && embed.fields.length >= perPage) {
        pages.push(embed);
        embed = null;
      }

      if (embed == null) {
        embed = new djs.MessageEmbed()
          .setColor(bot.cfg.embed.default)
          .setAuthor(`OptiBot Index | ${pages.length+1}/${pageLimit}`, await Assets.getIcon(`ICO_docs`, bot.cfg.embed.default))
          .setDescription(`Use \`${bot.prefix}help <command>\` for details about a specific command.`);
        
        if (title) embed.setTitle(title);
      }

      embed.addField(
        bot.prefix + cmd.metadata.name + ` ` + ((score != null) ? `(${(score * 100).toFixed(1)}%)` : ``),
        cmd.metadata.short_desc
      );
    }

    pages.push(embed);

    bot.send(m, { embeds: pages });
  };

  const showCommand = async (cmd) => {
    bot.send(m, `${cmd.metadata.name} (massive todo)`);
  };

  // todo: filter commands
  for (const cmd of memory.assets.commands) {
    if (query == null) {
      list.push({ cmd });
      continue;
    }

    const toCheck = [
      cmd.metadata.name,
      cmd.metadata.args,
      ...cmd.metadata.aliases,
      cmd.metadata.short_desc,
      cmd.metadata.long_desc,
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
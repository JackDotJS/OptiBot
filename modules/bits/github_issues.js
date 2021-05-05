const request = require(`request`);
const djs = require(`discord.js`);
const { OptiBit, memory, Assets } = require(`../core/modules.js`);

const bot = memory.core.client;
const log = bot.log;

const metadata = {
  name: `GitHub Issue Detector`,
  description: `Links OptiFine GitHub issues and pull requests when mentioned by their numerical ID.`,
  usage: [
    `Type a hash \` # \` immediately followed by the given issue ID, like so: \` #1234 \`.`,
    ``,
    `Note that IDs are ignored if they are:`,
    `1. Surrounded by ANYTHING EXCEPT empty space, periods, parenthesis \` () \`, and other similar word-ending characters.`,
    `2. Issues #100 and older.`
  ].join(`\n`),
  priority: 2,
  concurrent: true,
  authlvl: 0,
  flags: [`DM_OPTIONAL`],
  validator: null,
  executable: null
};

metadata.validator = m => m.content.includes(`#`);

metadata.executable = (m, member, authlvl) => {
  // remove everything in quotes ("), single-line codeblocks, multi-line codeblocks, and strikethroughs.
  const filtered = m.content.replace(/"[^"]+"|`{3}[^```]+`{3}|~{2}[^~~]+~{2}|`{1}[^`]+`{1}|<[^<>]+>/gi, ``);

  // get issues from filtered message using regex, remove duplicates by using a set, and finally convert back to an array.
  // ignores issues prefixed with a backwards slash (\) or just any word character
  let issues = [...new Set(filtered.match(/(?<![^.(<[{\s]#|\\#)(?<=#)(\d+)\b/gi))];

  issues = issues.filter((issue) => { if (parseInt(issue) > 100) return true; });

  if (issues === null || issues.length === 0) return;

  const issueLinks = [];
  const limit = (authlvl > 0) ? 8 : 4;
  const requestLimit = 12;
  let i = 0;

  (function searchGH() {
    log(`looking for #` + issues[i], `debug`);

    function final() {
      if (issueLinks.length === 0) return;

      log(`finalizing GH refs`, `trace`);
      const embed = new djs.MessageEmbed()
        .setColor(bot.cfg.colors.default)
        .setAuthor(`OptiFine Issue Tracker`, Assets.getEmoji(`ICO_git`).url)
        .setDescription(`In response to [this](${m.url}) message...\n\n${issueLinks.join(`\n\n`)}`);

      if (issueLinks.length === limit && issues.length > limit) {
        embed.setFooter(`Other issues were omitted to prevent spam.`);
      } else if (i + 1 === requestLimit) {
        embed.setFooter(`Other issues were omitted to prevent ratelimiting.`);
      }

      bot.send(m, { embed });
    }

    function next(forward, err) {
      if (err) bot.util.err(err);

      if (forward) {
        if (issueLinks.length === limit || i + 1 === issues.length || i + 1 === requestLimit) {
          final();
        } else {
          bot.setTimeout(() => {
            i++;
            searchGH();
          }, 500);
        }
      }
    }

    request(`https://github.com/sp614x/optifine/issues/${issues[i]}.json`, (err, res, data) => {
      log(`response`, `trace`);
      if (err || !res || !data) {
        return next(true, err || new Error(`Failed to get a response from the GitHub API.`));
      }
      if (res.statusCode === 403) {
        return next(false, new Error(`403 Forbidden (OptiBot may be ratelimited)`));
      }

      const title = JSON.parse(data).title;

      if (title) {
        issueLinks.push(`**#${issues[i]}** - [${title}](https://github.com/sp614x/optifine/issues/${issues[i]})`);
      }

      next(true);
    });
  })();
};

module.exports = new OptiBit(metadata);

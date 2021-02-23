const path = require(`path`);
const djs = require(`discord.js`);
const sim = require(`string-similarity`);
const { Command, memory, LogEntry, Assets } = require(`../core/optibot.js`);

const bot = memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  aliases: [`rank`],
  short_desc: `Add or remove member roles.`,
  long_desc: [
    `Adds or removes roles for the specified member. Note that roles are not retained if the given member leaves and rejoins the server.`,
    ``,
    `The following roles can be granted/removed:`,
    (() => {
      const desc_grantable = [];

      for (let i = 0; i < bot.cfg.roles.grantable.length; i++) {
        desc_grantable.push(`<@&${bot.cfg.roles.grantable[i]}>`);
      }

      return desc_grantable.join(` `);
    })()
  ].join(`\n`),
  args: `<discord member> <role>`,
  authlvl: 2,
  flags: [`NO_DM`, `LITE`],
  run: null
};

metadata.run = (m, args, data) => {
  if (!args[1]) return bot.util.missingArgs(m, metadata);

  bot.util.parseTarget(m, 0, args[0], data.member).then((result) => {
    if (!result) {
      bot.util.err(`You must specify a valid user.`, { m });
    } else if (result.type === `notfound` || result.type === `id` || result.type === `user`) {
      bot.util.err(`Unable to find a user.`, { m });
    } else if (result.target.user.id === m.author.id || result.target.user.id === bot.user.id) {
      bot.util.err(`Nice try.`, { m });
    } else if (bot.util.getAuthlvl(result.target) > data.authlvl) {
      bot.util.err(`You aren't powerful enough to update this user's roles.`, { m });
    } else {
      const roles = bot.guilds.cache.get(bot.cfg.guilds.optifine).roles.cache.array();
      const match = {
        role: null,
        rating: 0,
      };
      const reqrole = m.content.substring((`${bot.prefix}${data.input.cmd} ${args[0]} `).length);
      for (const role of roles) {
        const newrating = sim.compareTwoStrings(reqrole, role.name);
        if (newrating > match.rating) {
          match.role = role;
          match.rating = newrating;
        }
      }

      log(match);

      if (match.rating < 0.05) return bot.util.err(`What kind of role is that?`, { m });

      if (!bot.cfg.roles.grantable.includes(match.role.id)) return bot.util.err(`The "${match.role.name}" role cannot be granted or removed.`, { m });
      
      if (!result.target.roles.cache.has(match.role.id)) {
        result.target.roles.add(match.role.id, `Role granted by ${m.author.tag}`).then(() => {
          new LogEntry({ channel: `moderation` })
            .setColor(bot.cfg.embed.okay)
            .setIcon(Assets.getEmoji(`ICO_join`).url)
            .setTitle(`Member Role Granted`, `Member Role Grant Report`)
            .setThumbnail(result.target.user.displayAvatarURL({ format: `png` }))
            .addSection(`Member`, result.target)
            .addSection(`Moderator Responsible`, m.author)
            .addSection(`Command Location`, m)
            .addSection(`Role`, `${match.role}`)
            .submit().then(() => {
              const embed = new djs.MessageEmbed()
                .setColor(bot.cfg.embed.okay)
                .setAuthor(`Role added`, Assets.getEmoji(`ICO_okay`).url)
                .setDescription(`${result.target} has been given the ${match.role} role.`);

              bot.send(m, { embed });
            });
        }).catch(err => bot.util.err(err, { m }));
      } else {
        result.target.roles.remove(match.role.id, `Role removed by ${m.author.tag}`).then(() => {
          new LogEntry({ channel: `moderation` })
            .setColor(bot.cfg.embed.error)
            .setIcon(Assets.getEmoji(`ICO_leave`).url)
            .setTitle(`Member Role Removed`, `Member Role Removal Report`)
            .setThumbnail(result.target.user.displayAvatarURL({ format: `png` }))
            .addSection(`Member`, result.target)
            .addSection(`Moderator Responsible`, m.author)
            .addSection(`Command Location`, m)
            .addSection(`Role`, `${match.role}`)
            .submit().then(() => {
              const embed = new djs.MessageEmbed()
                .setColor(bot.cfg.embed.okay)
                .setAuthor(`Role removed`, Assets.getEmoji(`ICO_okay`).url)
                .setDescription(`${result.target} no longer has the ${match.role} role.`);

              bot.send(m, { embed });
            });

        }).catch(err => bot.util.err(err, { m }));
      }
    }
  }).catch(err => bot.util.err(err, { m }));

};

module.exports = new Command(metadata);
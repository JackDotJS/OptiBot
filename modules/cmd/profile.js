const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const timeago = require(`timeago.js`);
const { Command, memory, Assets } = require(`../core/modules.js`);

const bot = memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  aliases: [`whois`],
  description: {
    short: `Show a user's OptiBot profile.`,
    long: `Displays detailed information about a given user. Almost all information provided by Discord's API.`
  },
  args: `[discord member]`,
  dm: true,
  dperm: `SEND_MESSAGES`,
  run: null
};

metadata.run = (m, args, data) => {
  bot.util.parseTarget(m, 0, args[0], data.member).then((result) => {
    log(util.inspect(result));
    if (!result) {
      bot.util.err(`You must specify a valid user @mention, ID, or target shortcut (^)`, { m });
    } else if (result.type === `notfound`) {
      const embed = bot.util.err(`Unable to find a user.`)
        .setDescription(`If this user ever existed, it seems any information about them has been lost to time.`);

      bot.send(m, { embed });
    } else if (result.type === `id`) {
      bot.util.getProfile(result.target, false).then(profile => {
        if (!profile) {
          const embed = bot.util.err(`Unable to find a user.`)
            .setDescription(`If this user ever existed, it seems any information about them has been lost to time.`);

          bot.send(m, { embed });
        } else {
          bot.send(m, `\`\`\`javascript\n${util.inspect(profile)}\`\`\``);
        }
      }).catch(err => bot.util.err(err, { m }));
    } else {
      bot.util.getProfile(result.id, false).then(profile => {
        if (args[1] && args[1].toLowerCase() === `raw` && data.authlvl > 0) {
          bot.send(m, `\`\`\`javascript\n${util.inspect(profile)}\`\`\``);
        } else {
          let mem = null;
          let user = null;

          if (result.type === `member`) {
            mem = result.target;
            user = result.target.user;
          } else if (result.type === `user`) {
            user = result.target;
          }

          const embed = new djs.MessageEmbed()
            .setAuthor((user.id === m.author.id) ? `You are...` : `That is...`, Assets.getEmoji(`ICO_user`).url)
            .setColor(bot.cfg.colors.default)
            .setTitle(`${user.tag} ${(profile && profile.ndata.emoji) ? profile.ndata.emoji : ``}`) // todo: add profile emoji command. (#166)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 64, format: `png` }));

          const presence = [];

          if (user.presence.status === `online`) {
            presence.push(`**Status:** \\🟢 Online`);
          } else if (user.presence.status === `idle`) {
            presence.push(`**Status:** \\🟡 Away`);
          } else if (user.presence.status === `dnd`) {
            presence.push(`**Status:** \\🔴 Do Not Disturb`);
          } else {
            presence.push(`**Status:** \\⚫ Offline/Invisible`);
          }

          if (user.presence.clientStatus !== null) {
            const msg = [];
            const client = user.presence.clientStatus;

            if (client.desktop) {
              msg.push(`desktop`);
            }

            if (client.mobile) {
              msg.push(`mobile`);
            }

            if (client.web) {
              msg.push(`a web browser`);
            }

            if (msg.length === 1) {
              presence.push(`**Device(s):** Discord on ${msg[0]}`);
            } else if (msg.length === 2) {
              presence.push(`**Device(s):** Discord on ${msg[0]} and ${msg[1]}`);
            } else if (msg.length === 3) {
              presence.push(`**Device(s):** Discord on ${msg[0]}, ${msg[1]}, and ${msg[2]}.`);
            }
          }

          if (user.presence.activities.length > 0 && user.presence.activities[0].type !== null) {
            const status = user.presence.activities[0];

            if (status.type === `CUSTOM_STATUS`) {
              let emoji = ``;
              let text = ``;

              if (status.emoji) {
                if (!status.emoji.id) {
                  emoji = `\\${status.emoji.name} `;
                } else {
                  emoji = `:${status.emoji.name}: `;
                }
              }

              if (status.state) {
                text = status.state;
              }

              if (emoji.length > 0 || text.length > 0) {
                presence.push(`**Custom Status:** ${emoji}${text}`);
              }
            } else {
              let doing = `**Activity:** Playing`;

              if (status.type === `STREAMING`) {
                doing = `**Activity:** Streaming`;
              } else if (status.type === `LISTENING`) {
                doing = `**Activity:** Listening to`;
              } else if (status.type === `WATCHING`) {
                doing = `**Activity:** Watching`;
              }

              if (status.url) {
                presence.push(`[${doing} ${status.name}](${status.url})`);
              } else {
                presence.push(`${doing} ${status.name}`);
              }
            }
          }

          embed.setDescription(`${(profile && profile.ndata.quote) ? `> ${profile.ndata.quote}\n\n` : ``}${presence.join(`\n`)}`);

          const identity = [
            `Mention: ${user.toString()}`,
            `User ID: \`\`\`yaml\n${user.id}\`\`\``
          ].join(`\n`);

          embed.addField(`Identification`, identity);

          if (mem != null) {
            const roles = [];
            const rolec = [...mem.roles.cache.values()];
            rolec.sort((a, b) => a.rawPosition - b.rawPosition);
            rolec.reverse().forEach((role) => {
              log(role.rawPosition);
              if (role.id !== mem.guild.id) {
                if (m.channel.type === `dm` || m.guild.id !== bot.cfg.guilds.optifine) {
                  roles.push(`\`@${role.name}\``);
                } else {
                  roles.push(role.toString());
                }
              }
            });

            if (roles.length > 0) {
              embed.addField(`Server Roles`, roles.join(` `));
            }

            if (mem.joinedAt !== null) {
              embed.addField(`Server Join Date`, `${mem.joinedAt.toUTCString()}\n(${timeago.format(mem.joinedAt)})`, true);
            }
          }

          embed.addField(`Account Creation Date`, `${user.createdAt.toUTCString()}\n(${timeago.format(user.createdAt)})`, true);

          if (profile) {
            if (profile.edata.mute) {
              if (profile.edata.mute.end === null) {
                embed.addField(`Mute Expiration`, `Never. (Permanent Mute)`, true);
              } else {
                embed.addField(`Mute Expiration`, `${new Date(profile.edata.mute.end).toUTCString()}\n(${timeago.format(profile.edata.mute.end)})`, true);
              }
            }
          }

          if (result.type === `user`) {
            embed.setFooter(`This user may not be a member of this server.`);
          }

          bot.send(m, { embed });
        }
      }).catch(err => bot.util.err(err, { m }));
    }
  }).catch(err => bot.util.err(err, { m }));
};

module.exports = new Command(metadata);
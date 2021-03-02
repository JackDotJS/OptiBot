const util = require(`util`);
const path = require(`path`);
const djs = require(`discord.js`);
const request = require(`request`);
const { Command, memory, Assets } = require(`../core/optibot.js`);

const bot = memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  aliases: [`verify`, `donator`],
  description: {
    short: `Verify donator status.`,
    long: [
      `Verifies your donator status. If successful, this will grant you the donator role, and reset your donator token in the process.`,
      ``,
      `You can find your donator token by logging in through the website, at https://optifine.net/login. Look at the bottom of the page for a string of random characters (see picture for example).`,
      ``,
      `__**!!! Your account password is NOT your token !!!**__`,
      `__**!!! Your donation ID is NOT your token !!!**__`,
    ].join(`\n`)
  },
  args: `<e-mail> <token>`,
  dm: true,
  image: `IMG_token`,
  flags: [ `DM_ONLY`, `STRICT`, `DELETE_ON_MISUSE`, `NO_LOGGING_ARGS`, `LITE` ],
  run: null
};

metadata.run = (m, args, data) => {
  const donator = {
    guild: bot.guilds.cache.get(bot.cfg.guilds.donator),
    member: null,
    ban: null,
  };
  const inviteSettings = {
    temporary: true,
    maxUses: 1,
    unique: true,
    reason: `Created for ${m.author.tag} (${m.author.id})`
  };

  donator.guild.members.fetch(m.author.id).then(dmem => {
    donator.member = dmem;
    checkBan();
  }).catch(err => {
    if (err.message.match(/invalid or uncached|unknown member|unknown user/i)) {
      checkBan();
    } else {
      bot.util.err(err, { m: m });
    }
  });

  function checkBan() {
    donator.guild.fetchBan(m.author.id).then(ban => {
      donator.ban = ban;
      final();
    }).catch(err => {
      if (err.message.match(/unknown ban/i)) {
        final();
      } else {
        bot.util.err(err, { m: m });
      }
    });
  }

  const getDonatorInvite = () => {
    return new Promise((resolve, reject) => {
      const cached = memory.donatorInvites[m.author.id];

      if (cached) {
        donator.guild.fetchInvites().then(invites => {
          const invite = invites.get(cached.code);

          log(util.inspect(invite));

          if (!invite || invite.uses === invite.maxUses) {
            resolve(null);
          } else {
            resolve(invite);
          }
        });
      } else {
        donator.guild.channels.cache.get(`686207354315735071`).createInvite(inviteSettings).then(invite => {
          memory.donatorInvites[m.author.id] = invite;

          resolve(invite);
        }).catch(err => {
          reject(err);
        });
      }
    });
  };

  function final() {
    if (data.member.roles.cache.has(bot.cfg.roles.donator)) {
      if (donator.member) {
        const embed = bot.util.err(`You already have the Donator role!`)
          .setDescription(`Additionally, you cannot get an invite to the Donator Discord server because you're already a member.`);

        m.channel.send({ embed: embed });
      } else if (donator.ban) {
        const embed = bot.util.err(`You already have the Donator role!`)
          .setDescription(`Additionally, you cannot get an invite to the Donator Discord server because you've been banned.`);

        m.channel.send({ embed: embed });
      } else {
        getDonatorInvite().then(invite => {
          const embed = new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setAuthor(`You already have the Donator role!`, Assets.getEmoji(`ICO_info`).url);

          if (invite) {
            embed.setDescription(`However, it seems you're not yet a member of the Donator Discord server. Here's an invite!\n${invite.url}`);

            if (donator.guild.icon) {
              embed.setThumbnail(donator.guild.iconURL({ format: `png` }));
            }
          } else {
            embed.setDescription(`However, it seems you're not yet a member of the Donator Discord server. Unfortunately, it seems you've already used your invite link for the day. If you believe this is a mistake, please contact an administrator. Thank you!`);
          }

          m.channel.send({ embed: embed });
        });
      }
    } else if (!args[0]) {
      bot.util.missingArgs(m, metadata);
    } else if (args[0].indexOf(`@`) < 0 && args[0].indexOf(`.`) < 0) {
      bot.util.err(`You must specify a valid e-mail address.`, { m: m });
    } else if (!args[1]) {
      bot.util.err(`You must specify your donator token.`, { m: m });
    } else {
      request({ url: `https://optifine.net/validateToken?e=` + encodeURIComponent(args[0]) + `&t=` + encodeURIComponent(args[1]), headers: { 'User-Agent': `optibot` } }, (err, res, body) => {
        if (err || !res || !body || res.statusCode !== 200) {
          bot.util.err(err || new Error(`Failed to get a response from the OptiFine API`), { m: m });
        } else if (body === `true`) {
          data.member.roles.add([bot.cfg.roles.donator, bot.cfg.roles.donatorColor], `Donator status verified.`).then(() => {
            if (donator.member) {
              const embed = new djs.MessageEmbed()
                .setColor(bot.cfg.embed.okay)
                .setAuthor(`Thank you for your contribution! Your donator role has been granted.`, Assets.getEmoji(`ICO_okay`).url)
                .setDescription(`Please note, your token has been reset. Additionally, you cannot get an invite to the Donator Discord server because you're already a member.`);

              m.channel.send({ embed: embed });
            } else if (donator.ban) {
              const embed = new djs.MessageEmbed()
                .setColor(bot.cfg.embed.okay)
                .setAuthor(`Thank you for your contribution! Your donator role has been granted.`, Assets.getEmoji(`ICO_okay`).url)
                .setDescription(`Please note, your token has been reset. Additionally, you cannot get an invite to the Donator Discord server because you've been banned.`);

              m.channel.send({ embed: embed });
            } else {
              getDonatorInvite().then(invite => {
                const embed = new djs.MessageEmbed()
                  .setColor(bot.cfg.embed.okay)
                  .setAuthor(`Thank you for your contribution! Your donator role has been granted.`, Assets.getEmoji(`ICO_okay`).url);

                if (invite) {
                  embed.setDescription(`You're now qualified to join the Donator Discord server. If you're interested, here's an invite!\n${invite.url}`);

                  if (donator.guild.icon) {
                    embed.setThumbnail(donator.guild.iconURL({ format: `png` }));
                  }

                } else {
                  embed.setDescription(`You're now qualified to join the Donator Discord server. Unfortunately, it seems you've already used your invite link for the day. If you believe this is a mistake, please contact an administrator. Thank you!`);
                }

                m.channel.send({ embed: embed });
              });
            }

          });
        } else {
          const embed = bot.util.err(`Invalid credentials.`)
            .setDescription(`Make sure that your token and e-mail are the same as what you see on https://optifine.net/login.`);

          m.channel.send({ embed: embed });
        }
      });
    }
  }
};

module.exports = new Command(metadata);
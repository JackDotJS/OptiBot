const fs = require(`fs`);
const util = require(`util`);

const djs = require(`discord.js`);

const Assets = require(`./asset_manager.js`);
const memory = require(`./memory.js`);

module.exports = class Vector extends djs.Client {
  constructor(djs_options, options) {
    super(djs_options);

    const cfg = require(`../../cfg/config.json`);

    if (options.mode === 0) {
      // Load the real config first, but if the debug config has properties that differ from the real config, overwrite them to use the debug properties
      const cfg_d = require(`../../cfg/config_debug.json`);

      Object.assign(cfg, cfg_d);
    }

    const exit = new Date();
    exit.setUTCHours(8, 0, 0, 0); // 8 AM = 1 AM US Pacific, 4 AM US Eastern

    if (exit.getTime() - new Date().getTime() < 0) {
      exit.setUTCDate(exit.getUTCDate() + 1);
    }

    this.keys = require(`../../cfg/keys.json`);
    this.log = options.log;
    this.cfg = cfg;
    this.gcfg = require(`../../cfg/guild_config.json`);
    this.mode = options.mode;
    this.available = false;
    this.firstBoot = true; // true until the bot finishes initial boot. used to prevent ready event from running more than once
    this.exitTime = exit;
    this.version = require(`../../package.json`).version;
    this.util = require(`./util.js`);

    this.profiles = require(`./profile_manager.js`);
    this.records = require(`./record_manager.js`);

    memory.core.client = this;

    Object.defineProperty(this, `mainGuild`, {
      get: () => {
        return this.guilds.cache.get(cfg._env.guild);
      }
    });

    this.log(`client instance constructed`);
  }

  exit(code = 0) {

    /**
     * 0 = standard shutdown
     * 1 = error/crash
     * 16 = requested restart
     * 17 = requested update
     * 18 = scheduled restart
     */

    this.destroy();
    this.util.setWindowTitle(`Shutting down...`);

    setTimeout(() => {
      process.exit(code);
    }, 500);
  }

  setStatus(type) {
    const bot = this;

    const pr = {
      status: `online`,
      activity: {
        name: null,
        type: null
      }
    };

    switch(type.toUpperCase()) {
      case `OFFLINE`:
        // shutting down
        pr.status = `invisible`;
        break;
      case `LOADING`:
        // loading assets
        pr.status = `idle`;
        pr.activity.type = `WATCHING`;
        pr.activity.name = `assets load 🔄`;
        break;
      case `ONLINE`:
        // default state
        pr.activity.type = `PLAYING`;

        bot.log(bot.mode);

        switch(bot.mode) {
          case 0:
            // code mode
            pr.status = `dnd`;
            pr.activity.name = `Code Mode 💻`;
            break;
          case 1: 
            // lite mode
            pr.status = `idle`;
            pr.activity.name = `Lite Mode ⚠️`;
            break;
          default:
            pr.status = `online`;
            pr.activity.name = `Ping me for information!`;
        }
        
        break;
      default:
        // unavailable
        pr.status = `idle`;
        pr.activity.type = `PLAYING`;
        pr.activity.name = `Please stand by!`;
    }

    if (pr.activity.name == null || pr.activity.type == null) {
      delete pr.activity;
    }

    memory.presence = pr;
    bot.user.setPresence(pr);
  }

  send(dest, content, options) {
    return new Promise((resolve, reject) => {
      const bot = this;
      const log = this.log;

      const buttons = [];
      let user = null;
      let channel = null;

      // get user and channel

      if (dest instanceof djs.User) {
        user = dest;
        channel = dest;
      } else if (dest instanceof djs.GuildMember) {
        user = dest.user;
        channel = dest.user;
      } else if (dest instanceof djs.Message) {
        user = dest.author;
        channel = dest.channel;
      } else if (dest instanceof djs.TextChannel) {
        channel = dest;
      } else reject(new Error(`Invalid destination type.`));

      if (options == null) {
        options = {};

        if (typeof content === `object` && !Array.isArray(content)) {
          options = content;
          content = `_ _`;
        }
      } 

      log(options);
      log(content);

      // text pre-processing

      const owomode = (options.owo != null && typeof options.owo === `boolean` && options.owo);
      const autotrunc = (options.autotrunc != null && typeof options.autotrunc === `boolean` && options.autotrunc);

      const getLimit = (type) => {
        const limits = {
          content: 2048,
          author: 256,
          title: 256,
          desc: 2048,
          fieldname: 256,
          fieldvalue: 1024,
          footer: 2048
        };

        return (limits[type] || 0);
      };

      const processEmbed = (orgEmbed) => {
        if (orgEmbed.type !== `rich`) return orgEmbed;

        const embed = orgEmbed.toJSON();

        if (embed.author != null && embed.author.name != null && typeof embed.author.name === `string`) {
          if (owomode) embed.author.name = bot.util.owo(embed.author.name);
          if (autotrunc) embed.author.name = embed.author.name.substring(0, getLimit(`author`));
        }

        if (embed.title != null && typeof embed.title === `string`) {
          if (owomode) embed.title = bot.util.owo(embed.title);
          if (autotrunc) embed.title = embed.title.substring(0, getLimit(`title`));
        }

        if (embed.description != null && typeof embed.description === `string`) {
          if (owomode) embed.description = bot.util.owo(embed.description);
          if (autotrunc) embed.description = embed.description.substring(0, getLimit(`desc`));
        }

        for (const field of embed.fields) {
          if (owomode) field.name = bot.util.owo(field.name);
          if (owomode) field.value = bot.util.owo(field.value);

          if (autotrunc) field.name = field.name.substring(0, getLimit(`fieldname`));
          if (autotrunc) field.value = field.value.substring(0, getLimit(`fieldvalue`));
        }

        if (embed.footer != null && embed.footer.text != null && typeof embed.footer.text === `string`) {
          if (owomode) embed.footer.text = bot.util.owo(embed.footer.text);
          if (autotrunc) embed.footer.text = embed.footer.text.substring(0, getLimit(`footer`));
        }

        const processed = new djs.MessageEmbed(embed);

        if (orgEmbed.files.length > 0) processed.attachFiles(orgEmbed.files);

        return processed;
      };

      if (typeof content === `string` && content.length > 0 && content != `_ _`) {
        if (owomode) content = bot.util.owo(content);
        if (autotrunc) content = content.substring(0, getLimit(`content`));
      }

      if (options.embeds != null && Array.isArray(options.embeds)) {
        if (options.embeds.length > 1) {
          // array has more than 1
          for (const i in options.embeds) {
            options.embeds[i] = processEmbed(options.embeds[i]);
          }
  
          options.embed = options.embeds[0];
  
          buttons.push(
            bot.cfg.emoji.back,
            bot.cfg.emoji.forward
          );
        } else {
          // array only has 1
          options.embed = processEmbed(options.embeds[0]);
        }
      } else
      if (options.embed != null && options.embed instanceof djs.MessageEmbed) {
        options.embed = processEmbed(options.embed);
      }

      // add deletion button in between page buttons.
      // if the page buttons havent been added, this will simply add the deletion button like normal
      // splice() is pretty neat
      if (channel.type !== `dm` && (typeof options.userDelete !== `boolean` || options.userDelete)) buttons.splice(1, 0, bot.cfg.emoji.deleter);

      log(buttons);

      channel.send(content, options).then(bm => {
        channel.stopTyping(true);

        const addControl = () => {
          if (buttons.length === 0) return;

          const filter = (r, r_user) => buttons.includes(r.emoji.id) && !r_user.bot && !r_user.system;
          const rc = bm.createReactionCollector(filter, { time: (1000 * 60 * 60), dispose: true });

          let currentPage = 0;

          const processReaction = (r, r_user) => {
          
            log(`processReaction`);

            if ([bot.cfg.emoji.forward, bot.cfg.emoji.back].includes(r.emoji.id)) {
              if (options.embeds == null || !Array.isArray(options.embeds) || options.embeds.length <= 1) return;

              log(`change page`);
              if (r.emoji.id === bot.cfg.emoji.forward) {
                // next page
                if(currentPage === (options.embeds.length - 1)) {
                  currentPage = 0;
                } else {
                  currentPage++;
                }
              } else 
              // previous page
              if(currentPage === 0) {
                currentPage = options.embeds.length - 1;
              } else {
                currentPage--;
              }
    
              bm.edit(bm.content, { embed: options.embeds[currentPage] }).catch(reject);
            }

            if (r.emoji.id === bot.cfg.emoji.deleter) {
              if ((typeof options.userDelete === `boolean` && !options.userDelete) || channel.type === `dm`) return;

              log(`user delete`);
              const member = bot.mainGuild.members.cache.get(r_user.id);

              // stop if member cannot be found
              // stop if reaction user DOES NOT match original user AND they do not have manage messages perm OR guild ownership
              if (member == null || (member.id !== user.id && !(member.permissionsIn(r.message.channel).has(`MANAGE_MESSAGES`, true) || member.guild.ownerID !== member.id))) return; 

              if (r.message.content.includes(bot.cfg.messages.confirmDelete)) {
                r.message.delete();
              } else {
                const om = r.message.content;
                let nm = `${r.message.content}\n\n${r_user}\n${bot.cfg.messages.confirmDelete}`;
                if (nm.length > 2000 /* incredibly unlikely, but better safe than sorry */ || r.message.content.length === 0 || r.message.content === `_ _`) {
                  nm = `${r_user}\n${bot.cfg.messages.confirmDelete}`;
                }
        
                r.message.edit(nm).then(() => {
                  bot.setTimeout(() => {
                    // reset deletion confirmation if the user does not respond within 10 seconds
                    if (!r.message.deleted) {
                      r.message.edit(om).catch(reject);
                    }
                  }, 10000);
                }).catch(reject);
              }
            }
          };

          rc.on(`collect`, processReaction);

          rc.on(`remove`, processReaction);

          rc.on(`end`, () => {
            if (!bm.deleted) {
              /* bm.reactions.cache
                .filter(r => buttons.includes(r.emoji.id))
                .each(r => r.remove()); */
            }
          });

          // add all reaction buttons
          (function nextButton(i) {
            bm.react(Assets.getEmoji(buttons[i])).then(() => {
              i++;
              if (buttons[i] != null) nextButton(i);
            }).catch(reject);
          })(0);
        };

        if (!options.delayControl && user != null) addControl();

        resolve({
          msg: bm,
          addControl
        });
      }).catch(reject);
    });
  }
};

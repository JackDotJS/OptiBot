const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const memory = require(`./memory.js`);

/**
 * OptiBot Core: Command Class
 */
module.exports = class Command {

  /**
     * @param {Object} data Command Data
     * @param {String} data.name Name of this command.
     * @param {Array[String]} data.aliases Command aliases.
     * @param {String} [data.short_desc] Short description.
     * @param {String} [data.long_desc] Full, long description.
     * @param {(String|Array[String])} [data.args] Arguments/usage example(s).
     * @param {String} [data.image] Thumbnail image filename.
     * @param {Number} [data.authlvl] Minimum authlvl.
     * @param {Array[String]} [data.flags] Restriction and modifier flags.
     * @param {Function} data.run The actual command function.
     */
  constructor(meta, exec) {
    const bot = memory.core.client;
    const log = bot.log;

    this.metadata = Command.parseMetadata(meta);
    this.exec = (exec != null) ? exec : meta.run;

    if (typeof this.exec !== `function`) {
      throw new Error(`Invalid or unspecified Command property: run`);
    }
  }

  static parseMetadata({
    name = null,
    aliases = [],
    description = {},
    args = [],
    guilds = [],
    image = null,
    dm = true,
    flags = []
  }) {
    const bot = memory.core.client;
    const log = bot.log;

    if (typeof name !== `string` || name.match(/[^a-zA-Z0-9]/) !== null) {
      throw new TypeError(`Invalid or unspecified Command property: name`);
    }
    if (!Array.isArray(aliases)) {
      throw new TypeError(`Invalid Command property: aliases`);
    }
    if (description.constructor !== Object) {
      throw new TypeError(`Invalid Command property: description`);
    }
    if (typeof args !== `string` && !Array.isArray(args)) {
      throw new TypeError(`Invalid Command property: args`);
    }
    if (!Array.isArray(guilds)) {
      throw new TypeError(`Invalid Command property: guilds`);
    }
    if (typeof image !== `string` && image != null) {
      throw new TypeError(`Invalid Command property: image`);
    }
    if (typeof dm !== `boolean`) {
      throw new TypeError(`Invalid Command property: dm`);
    }
    if (!Array.isArray(flags)) {
      throw new TypeError(`Invalid Command property: flags`);
    }

    const metadata = {
      name: name,
      aliases: [...new Set(aliases)],
      description: {
        short: (typeof description.short === `string`) ? description.short : `This command has no set description.`,
        long: (typeof description.long === `string`) ? description.long : (typeof description.short === `string`) ? description.short : `This command has no set description.`
      },
      args: [],
      guilds: [...new Set(guilds)],

      // Image to be shown as a thumbnail when this command is viewed through !help.
      // Must be a plain string specifying a complete filename from the ../assets/img directory.
      // i.e. "IMG_token.png"
      image: image,

      // Allow usage of command in DMs.
      dm: dm,

      flags: {
        // Command can ONLY be used in Direct Messages
        DM_ONLY: false,

        // Command can only be used in the designated bot channels/categories, if not in a DM. (see: config.channels.bot)
        // Mutually exclusive with DM_ONLY and NO_DM
        BOT_CHANNEL_ONLY: false,

        // Command can only be used staff-only channels/categories. (see: config.channels.staff)
        STAFF_CHANNEL_ONLY: false,

        // Normally, users with the bypassChannels permission node are exempt from the BOT_CHANNEL_ONLY flag.
        // Additionally, users with the wildcard (*) permission node are exempt from the STAFF_CHANNEL_ONLY flag.
        // This flag makes it so all restrictions are applied, regardless of permissions.
        STRICT: false, 

        // Deletes the users message if any restriction results in the command not firing.
        // Useful for reducing spam, or for commands that require particularly sensitive information as arguments.
        DELETE_ON_MISUSE: false,

        // Prevents command from showing in !help command list. (does not apply for users with bypassHidden permission node)
        // When combined with the PERMS_REQUIRED flag, the bot will also
        // treat this command as non-existent when any user attempts to use
        // it without the required permissions.
        HIDDEN: false,

        // Usage of this command will not be logged at all.
        NO_LOGGING: false,

        // Arguments for this command will not be logged.
        NO_LOGGING_ARGS: false,

        // Allows command to be loaded during Modes 1 and 2.
        LITE: false,
        
        // Requires the user to have a permission group, inherited or otherwise, that allows usage of this command.
        PERMS_REQUIRED: false,
      }
    };

    if (flags.length > 0) {
      flags = [...new Set(flags)];
      let found = 0;

      flags.forEach(t => {
        if (typeof t !== `string`) {
          throw new TypeError(`Flags must be specified as strings.`);
        } else
        if (typeof metadata.flags[t.toUpperCase()] === `boolean`) {
          metadata.flags[t.toUpperCase()] = true;
          found++;
        }
      });

      if (found === 0) {
        throw new Error(`All given flags are invalid.`);
      }

      if (!metadata.dm && metadata.flags[`DM_ONLY`]) {
        throw new Error(`Command "${name}": Cannot use flag DM_ONLY while this command does not allow DMs.`);
      }

      if (metadata.flags[`BOT_CHANNEL_ONLY`] && metadata.flags[`DM_ONLY`]) {
        throw new Error(`Command "${name}": Flags BOT_CHANNEL_ONLY and DM_ONLY are mutually exclusive.`);
      }
    }

    if (Array.isArray(args) && args.length > 0) {
      for (const arg of args) {
        metadata.args.push(`${bot.prefix}${name} ${arg}`);
      }
    } else
    if (typeof args === `string`) {
      metadata.args.push(`${bot.prefix}${name} ${args}`);
    } else {
      metadata.args.push(`${bot.prefix}${name}`);
    }

    return metadata;
  }
};
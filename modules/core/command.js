const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const memory = require(`./memory.js`);

module.exports = class Command {
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
    if (!dm && flags.includes(`DM_ONLY`)) {
      throw new Error(`Command "${name}": Cannot use flag DM_ONLY while this command does not allow DMs.`);
    }
    if (flags.includes(`BOT_CHANNEL_ONLY`) && flags.includes(`DM_ONLY`)) {
      throw new Error(`Command "${name}": Flags BOT_CHANNEL_ONLY and DM_ONLY are mutually exclusive.`);
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
      image: image,
      dm: dm,
      flags: [...new Set(flags)]
    };

    if (Array.isArray(args) && args.length > 0) {
      for (const arg of args) metadata.args.push(`${bot.prefix}${name} ${arg}`);
    } else
    if (typeof args === `string`) {
      metadata.args.push(`${bot.prefix}${name} ${args}`);
    } else {
      metadata.args.push(`${bot.prefix}${name}`);
    }

    return metadata;
  }
};
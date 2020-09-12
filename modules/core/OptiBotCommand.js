const path = require('path');
const util = require('util');
const djs = require('discord.js');
const Memory = require('./OptiBotMemory.js');

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
    constructor(meta) {
        const bot = Memory.core.client;
        const log = bot.log;

        this.metadata = Command.parseMetadata(meta);
        this.exec = meta.run;
        this.rawArgs = meta.args;
    }

    static parseMetadata({
        name = null,
        aliases = [],
        short_desc = 'This command has no set description.',
        long_desc = null,
        args = '',
        image = null,
        authlvl = null,
        flags = null,
        run = null
    }) {
        const bot = Memory.core.client;
        const log = bot.log;

        if (typeof name !== 'string' || name.match(/[^a-zA-Z0-9]/) !== null) {
            throw new TypeError('Invalid or unspecified Command property: name');
        }
        if (typeof aliases !== 'string' && !Array.isArray(aliases)) {
            throw new TypeError('Invalid Command property: aliases');
        }
        if (typeof short_desc !== 'string') {
            throw new TypeError('Invalid Command property: short_desc');
        }
        if (typeof long_desc !== 'string' && typeof long_desc !== 'undefined' && long_desc !== null) {
            throw new TypeError('Invalid Command property: long_desc');
        }
        if (typeof args !== 'string' && !Array.isArray(args)) {
            throw new TypeError('Invalid Command property: args');
        }
        if (typeof image !== 'string' && typeof image !== 'undefined' && image !== null) {
            throw new TypeError('Invalid Command property: image');
        }
        if (typeof authlvl !== 'number') {
            throw new TypeError('Invalid or unspecified Command property: authlvl');
        }
        if (!Array.isArray(aliases) && typeof flags !== 'undefined' && flags !== null) {
            throw new TypeError('Invalid Command property: flags');
        }
        if (typeof run !== 'function') {
            throw new Error('Invalid or unspecified Command property: run');
        }

        const metadata = {
            name: name,
            aliases: (Array.isArray(aliases)) ? [...new Set(aliases)] : [],
            short_desc: short_desc,
            long_desc: (long_desc) ? long_desc : short_desc,
            args: null,
            args_pt: null,

            // Image to be shown as a thumbnail when this command is viewed through !help.
            // Must be a plain string specifying a complete filename from the ../assets/img directory.
            // i.e. "IMG_token.png"
            image: image,

            /**
             * Authorization Level
             * 
             * -1 = Muted Member
             * 0 = Normal Member
             * 1 = Advisor
             * 2 = Jr. Moderator
             * 3 = Moderator
             * 4 = Administrator
             * 5 = Bot Developer
             * 6+ = God himself
             */
            authlvl: authlvl,

            flags: {
                // Command cannot be used in Direct Messages.
                // Mutually exclusive with authlvl -1.
                NO_DM: false,

                // Command can be used in server chat OR Direct Messages
                DM_OPTIONAL: false,

                // Command can ONLY be used in Direct Messages
                DM_ONLY: false,

                // Command can only be used in the designated bot channels/categories, if not in a DM. (see: config.channels.bot)
                // Mutually exclusive with DM_ONLY and NO_DM
                BOT_CHANNEL_ONLY: false,

                // Command can only be used in moderator-only channels/categories. (see: config.channels.mod)
                MOD_CHANNEL_ONLY: false,

                // Normally, users with authlvl 2 and higher are exempt from the BOT_CHANNEL_ONLY flag.
                // Users with authlvl 5 are also exempt from the flags MOD_CHANNEL_ONLY, NO_DM, and DM_ONLY.
                // This flag makes it so all restrictions are applied, regardless of authlvl.
                // This is generally applied when using a command in an unexpected channel would somehow
                // result in errors/crashes.
                STRICT: false,

                // Normally, authlvls between the member and the command are compared as "greater than or equal to".
                // This flag ensures the member's authlvl must always equal the command's required authlvl.
                STRICT_AUTH: false,

                // Ignores elevated "Bot Developer" permissions and compares next available authlvl.
                IGNORE_ELEVATED: false,

                // Deletes the users message if any restriction results in the command not firing.
                // Useful for reducing spam, or for commands that require particularly sensitive information as arguments.
                DELETE_ON_MISUSE: false,

                // Command is treated as non-existent to any user without the required authlvl.
                HIDDEN: false,

                // Prevents typing indicators from being sent in the given channel.
                // Commands without this flag MUST use the channel.stopTyping() method after sending a response message.
                NO_TYPER: false,

                // Details of this command will not be logged.
                CONFIDENTIAL: false,

                // Preserve command during Modes 1 and 2.
                LITE: false
            }
        };

        if (Array.isArray(flags) && flags.length > 0) {
            flags = [...new Set(flags)];
            let found = 0;

            flags.forEach(t => {
                if (typeof t !== 'string') {
                    throw new TypeError('Flags must be specified as strings.');
                } else
                if (typeof metadata.flags[t.toUpperCase()] === 'boolean') {
                    metadata.flags[t.toUpperCase()] = true;
                    found++;
                }
            });

            if (found === 0) {
                throw new Error('All given flags are invalid.');
            }

            if (metadata.flags['NO_DM'] && metadata.authlvl === -1) {
                throw new Error(`Command "${name}": Flag NO_DM and authlvl -1 are mutually exclusive.`);
            }

            if (metadata.flags['NO_DM'] && metadata.flags['DM_OPTIONAL']) {
                throw new Error(`Command "${name}": Flags NO_DM and DM_OPTIONAL are mutually exclusive.`);
            }

            if (metadata.flags['DM_OPTIONAL'] && metadata.flags['DM_ONLY']) {
                throw new Error(`Command "${name}": Flags DM_OPTIONAL and DM_ONLY are mutually exclusive.`);
            }

            if (metadata.flags['NO_DM'] && metadata.flags['DM_ONLY']) {
                throw new Error(`Command "${name}": Flags NO_DM and DM_ONLY are mutually exclusive.`);
            }

            if (metadata.flags['BOT_CHANNEL_ONLY'] && metadata.flags['DM_ONLY']) {
                throw new Error(`Command "${name}": Flags BOT_CHANNEL_ONLY and DM_ONLY are mutually exclusive.`);
            }

            if (metadata.flags['BOT_CHANNEL_ONLY'] && metadata.flags['NO_DM']) {
                throw new Error(`Command "${name}": Flags BOT_CHANNEL_ONLY and NO_DM are mutually exclusive.`);
            }
        } else {
            if (authlvl !== 5) metadata.authlvl = 5;
        }

        if (Array.isArray(args) && args.length > 0) {
            const examples = [];
            const examplesRaw = [];
            for (let i = 0; i < args.length; i++) {
                examples.push(`\`\`\`ini\n${bot.prefix}${name} ${args[i]}\`\`\``);
                examplesRaw.push(`${bot.prefix}${name} ${args[i]}`);

                if (i + 1 === args.length) {
                    metadata.args = examples.join('');
                    metadata.args_pt = examplesRaw.join('\n');
                }
            }
        } else
        if (typeof args === 'string') {
            metadata.args = `\`\`\`ini\n${bot.prefix}${name} ${args}\`\`\``;
            metadata.args_pt = `${bot.prefix}${name} ${args}`;
        } else {
            metadata.args = `\`\`\`ini\n${bot.prefix}${name}\`\`\``;
            metadata.args_pt = `${bot.prefix}${name}`;
        }

        return metadata;
    }
};
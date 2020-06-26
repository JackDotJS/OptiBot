const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);


/**
 * OptiBot Core: Command Class
 */
module.exports = class Command {

    /**
     * @param bot OptiBot
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
    constructor (bot, {
        name = null,
        aliases = [],
        short_desc = `This command has no set description.`,
        long_desc = null,
        args = '',
        image = null,
        authlvl = null,
        flags = null,
        run = null
    }) {
        if(typeof name !== 'string') {
            throw new TypeError(`Command name not specified or invalid.`)
        } else 
        if(name.match(/[^a-zA-Z0-9]/) !== null) {
            throw new Error(`Command name cannot have special characters.`)
        } else 
        if(typeof run !== 'function') {
            throw new Error(`Command function not specified or invalid.`)
        } else 
        if(typeof authlvl !== 'number') {
            throw new Error(`Authorization level not specified or invalid.`)
        } else {
            const metadata = {
                name: name,
                aliases: (Array.isArray(aliases)) ? [...new Set(aliases)] : [],
                short_desc: short_desc,
                long_desc: (long_desc) ? long_desc : short_desc,
                args: ``, //${bot.prefix}${name} ${args || ''}

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
            }


            if(Array.isArray(flags) && flags.length > 0) {
                flags = [...new Set(flags)];
                let found = 0;

                flags.forEach(t => {
                    if(typeof t !== 'string') {
                        throw new TypeError(`Flags must be specified as strings.`);
                    } else
                    if(typeof metadata.flags[t.toUpperCase()] === 'boolean') {
                        metadata.flags[t.toUpperCase()] = true;
                        found++;
                    }
                });

                if(found === 0) {
                    throw new Error(`All given flags are invalid.`);
                }

                if(metadata.flags[`NO_DM`] && metadata.authlvl === -1) {
                    throw new Error(`Command "${name}": Flag NO_DM and authlvl -1 are mutually exclusive.`);
                }
    
                if(metadata.flags[`NO_DM`] && metadata.flags[`DM_OPTIONAL`]) {
                    throw new Error(`Command "${name}": Flags NO_DM and DM_OPTIONAL are mutually exclusive.`);
                }
    
                if(metadata.flags[`DM_OPTIONAL`] && metadata.flags[`DM_ONLY`]) {
                    throw new Error(`Command "${name}": Flags DM_OPTIONAL and DM_ONLY are mutually exclusive.`);
                }
    
                if(metadata.flags[`NO_DM`] && metadata.flags[`DM_ONLY`]) {
                    throw new Error(`Command "${name}": Flags NO_DM and DM_ONLY are mutually exclusive.`);
                }
    
                if(metadata.flags[`BOT_CHANNEL_ONLY`] && metadata.flags[`DM_ONLY`]) {
                    throw new Error(`Command "${name}": Flags BOT_CHANNEL_ONLY and DM_ONLY are mutually exclusive.`);
                }
    
                if(metadata.flags[`BOT_CHANNEL_ONLY`] && metadata.flags[`NO_DM`]) {
                    throw new Error(`Command "${name}": Flags BOT_CHANNEL_ONLY and NO_DM are mutually exclusive.`);
                }
            } else {
                if(authlvl !== 5) metadata.authlvl = 5;
            }

            if(Array.isArray(args) && args.length > 0) {
                let examples = [];
                for(let i = 0; i < args.length; i++) {
                    examples.push(`\`\`\`ini\n${bot.prefix}${name} ${args[i]}\`\`\``)

                    if(i+1 === args.length) {
                        metadata.args = examples.join('');
                    }
                }
            } else
            if(typeof args === 'string') {
                metadata.args = `\`\`\`ini\n${bot.prefix}${name} ${args}\`\`\``
            } else {
                metadata.args = `\`\`\`ini\n${bot.prefix}${name}\`\`\``
            }

            Object.defineProperty(this, 'metadata', {
                get: function() {
                    return metadata;
                }
            });

            Object.defineProperty(this, 'exec', {
                get: function() {
                    return run;
                }
            });

            Object.defineProperty(this, 'bot', {
                get: function() {
                    return bot;
                }
            });

            Object.defineProperty(this, 'rawArgs', {
                get: function() {
                    return args;
                }
            });
        }
    }

    getArgs(m) {
        const bot = this.bot;
        const log = this.bot.log;

        let url = m.url.replace(/(\/\d+){3}$/, '').replace('discordapp', 'discord')+'/';
        let prefixes = bot.prefix;

        if(bot.mode === 0) {
            if(bot.cfg.prefixes.debug.length > 1) {
                prefixes = bot.cfg.prefixes.debug.join(', ');
            }
        } else {
            if(bot.cfg.prefixes.default.length > 1) {
                prefixes = bot.cfg.prefixes.default.join(', ');
            }
        }

        let str = [
            `[${bot.prefix}${this.metadata.name}](${url} "You can use any of the following prefixes:\n${prefixes}")`
        ];

        let allArgs = [this.rawArgs.match(/(?<=<)[^<>]+(?=>|\|)/gi), this.rawArgs.match(/(?<=\[)[^\[\]]+(?=]|\|)/gi)];

        for(let i = 0; i < allArgs.length; i++) {
            if(allArgs[i] === null) {
                continue
            } else {
                for(let match of allArgs[i]) {
                    function describe(arg, alt, last) {
                        let desc = [];
                        let prefix = (i === 0) ? `<` : `(`;
                        let suffix = (i === 0) ? `>` : `)`;
                        let extra = '';

                        if(alt !== undefined) {
                            desc.push(`Alternative #${alt+1}: "${arg.replace(/[*~]/gi, '')}"`);

                            if(alt !== 0) {
                                prefix = '';
                            }

                            if(!last) {
                                suffix = '';
                                extra = ' | ';
                            }
                        } else {
                            desc.push(`"${arg.replace(/[*~]/gi, '')}"`)
                        }

                        desc.push('');

                        if(arg.startsWith('*')) {
                            desc.push(`This argument allows shortcuts. This may include user @mentions, user IDs, message URLs, and the classic "arrow" shortcut (^).`)
                        } else
                        if(arg.startsWith('~')) {
                            desc.push(`This argument uses string similarity matching.`)
                        }

                        log(`${prefix}${arg}${suffix}${extra}`);
                        str.push(`[${prefix}${arg}${suffix}](${url} "${(i === 0) ? `Required` : `Optional`} argument.\n${desc.join('\n')}")${extra}`);
                    }

                    if(match.indexOf('|') > -1) {
                        let args = match.split('|');
                        log(args);
                        for(let ia = 0; ia < args.length; ia++) {
                            describe(args[ia].trim(), ia, (ia+1 === args.length));
                        }
                    } else {
                        describe(match.trim());
                    }
                }
            }
        }

        str = str.join(' ');
        bot.log(str);
        bot.log(str.length);
        return str;
    }

    noArgs(m) {
        let embed = new djs.MessageEmbed()
        .setAuthor(`Missing Arguments`, this.bot.icons.find('ICO_warn'))
        .setColor(this.bot.cfg.embed.default)
        .addField('Usage', this.metadata.args)

        m.channel.send({embed: embed}).then(bm => this.bot.util.responder(m.author.id, bm, this.bot))
    }
}
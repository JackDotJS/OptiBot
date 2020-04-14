const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);

module.exports = class Command {
    constructor (bot, {
        name = null,
        aliases = [],
        short_desc = `This command has no set description.`,
        long_desc = null,
        usage = null,
        image = null,
        authlvl = null,
        tags = null,
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
                usage: `${bot.prefix}${name} ${(usage) ? usage : ''}`,

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

                tags: {
                    // Cannot be used in Direct Messages.
                    // Mutually exclusive with authlvl -1.
                    NO_DM: false, 
        
                    // Can be used in server chat OR Direct Messages
                    DM_OPTIONAL: false, 
        
                    // Can ONLY be used in Direct Messages
                    DM_ONLY: false, 
        
                    // If in server chat, can only be used in the designated bot channels.
                    // Mutually exclusive with DM_ONLY and NO_DM
                    BOT_CHANNEL_ONLY: false, 
        
                    // Can only be used in moderator-only channels. 
                    MOD_CHANNEL_ONLY: false, 
        
                    // Normally, users with authlvl 2 and higher are exempt from the BOT_CHANNEL_ONLY tag.
                    // Users with authlvl 5 are also exempt from the tags MOD_CHANNEL_ONLY, NO_DM, and DM_ONLY.
                    // This tag makes it so all restrictions are applied, regardless of authlvl.
                    STRICT: false,

                    // Deletes the users message if any restriction results in the command not firing.
                    // Useful for reducing spam, or for commands that require particularly sensitive information as arguments.
                    DELETE_ON_MISUSE: false, 
        
                    // Command is treated as non-existent to any user without the required authlvl.
                    // Mutually exclusive with STRICT
                    HIDDEN: false,

                    // Command will execute almost immediately. If omitted, the bot will start typing in the channel and wait until the command has finished.
                    // Commands with this tag MUST use the channel.stopTyping() method after sending a response message.
                    INSTANT: false,

                    // Details of this command will not be logged.
                    CONFIDENTIAL: false,

                    // (UNUSED) Command will be preserved during Lite mode.
                    LITE: false
                }
            }

            if(Array.isArray(tags) && tags.length > 0) {
                tags = [...new Set(tags)];
                let found = 0;

                tags.forEach(t => {
                    if(typeof t !== 'string') {
                        throw new TypeError(`Tags must be specified as strings.`);
                    } else
                    if(typeof metadata.tags[t.toUpperCase()] === 'boolean') {
                        metadata.tags[t.toUpperCase()] = true;
                        found++;
                    }
                });

                if(found === 0) {
                    throw new Error(`All given tags are invalid.`);
                }

                if(metadata.tags[`NO_DM`] && metadata.authlvl === -1) {
                    throw new Error(`Command "${name}": Tag NO_DM and authlvl -1 are mutually exclusive.`);
                }
    
                if(metadata.tags[`NO_DM`] && metadata.tags[`DM_OPTIONAL`]) {
                    throw new Error(`Command "${name}": Tags NO_DM and DM_OPTIONAL are mutually exclusive.`);
                }
    
                if(metadata.tags[`DM_OPTIONAL`] && metadata.tags[`DM_ONLY`]) {
                    throw new Error(`Command "${name}": Tags DM_OPTIONAL and DM_ONLY are mutually exclusive.`);
                }
    
                if(metadata.tags[`NO_DM`] && metadata.tags[`DM_ONLY`]) {
                    throw new Error(`Command "${name}": Tags NO_DM and DM_ONLY are mutually exclusive.`);
                }
    
                if(metadata.tags[`BOT_CHANNEL_ONLY`] && metadata.tags[`DM_ONLY`]) {
                    throw new Error(`Command "${name}": Tags BOT_CHANNEL_ONLY and DM_ONLY are mutually exclusive.`);
                }
    
                if(metadata.tags[`BOT_CHANNEL_ONLY`] && metadata.tags[`NO_DM`]) {
                    throw new Error(`Command "${name}": Tags BOT_CHANNEL_ONLY and NO_DM are mutually exclusive.`);
                }
            } else {
                if(authlvl !== 5) metadata.authlvl = 5;
            }

            Object.defineProperty(this, 'metadata', {
                get: function() {
                    return metadata;
                }
            });

            Object.defineProperty(this, 'raw', {
                get: function() {
                    return run;
                }
            });

            Object.defineProperty(this, 'bot', {
                get: function() {
                    return bot;
                }
            });
        }
    }

    noArgs(m) {
        let embed = new djs.MessageEmbed()
        .setAuthor(`Missing Arguments`, this.bot.icons.find('ICO_warn'))
        .setColor(this.bot.cfg.embed.default)
        .addField('Usage', `\`\`\`${this.metadata.usage}\`\`\``)

        m.channel.send({embed: embed}).then(bm => this.bot.util.responder(m.author.id, bm, this.bot))
    }

    exec(m, args, log, data) {
        this.raw(m, args, log, data);
    }
}
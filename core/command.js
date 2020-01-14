const djs = require(`discord.js`);

module.exports = class Command {
    constructor (optibot, {
        name = null,
        short_desc = `This command has no set description.`,
        long_desc = null,
        usage = null,
        image = null,
        authlevel = null,
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
        if(typeof authlevel !== 'number') {
            throw new Error(`Authorization level not specified or invalid.`)
        } else {
            const metadata = {
                name: name,
                aliases: [],
                short_desc: short_desc,
                long_desc: (long_desc) ? long_desc : short_desc,
                usage: `${optibot.trigger}${name} ${(usage) ? usage : ''}`,

                // Image to be shown as a thumbnail when this command is viewed through !help.
                // Must be a plain string specifying a complete filename from the ../assets/img directory.
                // i.e. "IMG_token.png"
                image: image,

                /**
                 * Authorization Level
                 * 
                 * 0 = Normal Member
                 * 1 = Junior Moderator
                 * 2 = Senior Moderator
                 * 3 = Administrator
                 * 4 = Developer
                 * 5+ = God himself
                 */
                authlevel: authlevel,

                tags: {
                    // Cannot be used in Direct Messages
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
        
                    // Normally, users with authlevel 1 and higher are exempt from the BOT_CHANNEL_ONLY tag.
                    // Users with authlevel 4 are also exempt from the tags MOD_CHANNEL_ONLY, NO_DM, and DM_ONLY.
                    // This tag makes it so all restrictions are applied, regardless of authlevel.
                    STRICT: false,

                    // Deletes the users message if any restriction results in the command not firing.
                    // Useful for reducing spam, or for commands that require particularly sensitive information as arguments.
                    DELETE_ON_MISUSE: false, 
        
                    // Command is treated as non-existent to any user without the required authlevel.
                    // Mutually exclusive with STRICT
                    HIDDEN: false,

                    // Command will execute almost immediately. If omitted, the bot will start typing in the channel and wait until the command has finished.
                    // Commands with this tag MUST use the channel.stopTyping() method after sending a response message.
                    INSTANT: false,

                    // (UNUSED) Command will be preserved during Lite mode.
                    LITE: false
                }
            }

            if(Array.isArray(tags)) {
                tags.forEach(t => {
                    if(typeof t !== 'string') {
                        throw new TypeError(`Tags must be specified as strings.`);
                    } else
                    if(typeof metadata.tags[t.toUpperCase()] === 'boolean') {
                        metadata.tags[t.toUpperCase()] = true;
                    }
                });
    
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
                if(authlevel !== 4) metadata.authlevel = 4;
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
                    return optibot;
                }
            });
        }
    }

    exec(m, args, log, data) {
        this.raw(m, args, log, data);
    }
}
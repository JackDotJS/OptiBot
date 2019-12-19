const path = require(`path`);

module.exports = class Command {
    constructor (optibot, {
        name = null,
        short_desc = `This command has no set description.`,
        long_desc = `This command has no set description.`,
        usage = null,
        image = null,
        tags = null
    }) {
        if(name === null) {
            throw new TypeError(`Command name not specified.`)
        } else {
            const metadata = {
                name: name,
                short_desc: short_desc,
                long_desc: long_desc,
                usage: `${optibot.trigger}${name} ${(usage) ? usage : ''}`,
                image: image,
                tags: {
                    // Only moderators and admins can use this command
                    MODERATOR_ONLY: false,
        
                    // Junior Moderators not allowed to use this command. 
                    // Must be paired with MODERATOR_ONLY
                    NO_JR_MOD: false,
        
                    // Only developers can use this command
                    DEVELOPER_ONLY: false, 
        
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
        
                    // Deletes the users message if any restriction results in the command not firing.
                    DELETE_ON_MISUSE: false, 
        
                    // Moderators, administrators, and developers are not exempt from restrictions.
                    STRICT: false,
        
                    // Command is treated as non-existent to any user apart from developers.
                    // Mutually exclusive with STRICT
                    HIDDEN: false,

                    // Command will execute almost immediately. If omitted, the bot will start typing in the channel and wait until the command has finished.
                    INSTANT: false 
                }
            }

            if(Array.isArray(tags)) {
                tags.forEach(t => {
                    if(typeof metadata.tags[t] === 'boolean') {
                        metadata.tags[t] = true;
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
    
                if(metadata.tags[`MODERATOR_ONLY`] && metadata.tags[`DEVELOPER_ONLY`]) {
                    throw new Error(`Command "${name}": Tags MODERATOR_ONLY and DEVELOPER_ONLY are mutually exclusive.`);
                }
    
                if(metadata.tags[`NO_JR_MOD`] && !metadata.tags[`MODERATOR_ONLY`]) {
                    throw new Error(`Command "${name}": Tag NO_JR_MOD must be paired with MODERATOR_ONLY`);
                }
            } else {
                metadata.tags['DEVELOPER_ONLY'] = true;
            }

            Object.defineProperty(this, 'metadata', {
                get: function() {
                    return metadata;
                }
            });
        }
    }
}
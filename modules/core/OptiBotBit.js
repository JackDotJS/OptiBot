const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const Memory = require(`./OptiBotMemory.js`);

/**
 * OptiBot Core: OptiBit Class
 */
module.exports = class OptiBit {

    /**
     */
    constructor (meta) {
        const bot = Memory.core.client;
        const log = bot.log;

        this.metadata = OptiBit.parseMetadata(meta);
        this.validate = meta.validator;
        this.exec = meta.executable;
        this.rawUsage = meta.usage;
    }

    static parseMetadata({
        name =  null,
        description = `This OptiBit has no set description.`,
        usage = null,
        image = null,
        priority = 0,
        concurrent = false,
        authlvl = null,
        flags = null,
        validator = null,
        executable = null
    }) {
        const bot = Memory.core.client;
        const log = bot.log;

        if(typeof name !== 'string') {
            throw new TypeError(`Invalid or unspecified OptiBit property: name`)
        }
        if(typeof description !== 'string') {
            throw new TypeError(`Invalid OptiBit property: description`)
        }
        if(typeof usage !== 'string') {
            throw new TypeError(`Invalid OptiBit property: usage`)
        }
        if(typeof image !== 'string' && typeof image !== 'undefined' && image !== null) {
            throw new TypeError(`Invalid OptiBit property: description`)
        }
        if(typeof priority !== 'number') {
            throw new TypeError(`Invalid OptiBit property: priority`)
        }
        if(typeof concurrent !== 'boolean') {
            throw new TypeError(`Invalid OptiBit property: concurrent`)
        }
        if(typeof authlvl !== 'number') {
            throw new TypeError(`Invalid or unspecified OptiBit property: authlvl`)
        }
        if(!Array.isArray(flags) && typeof flags !== 'undefined' && flags !== null) {
            throw new TypeError(`Invalid OptiBit property: flags`)
        }
        if(typeof validator !== 'function') {
            throw new TypeError(`Invalid or unspecified OptiBit property: validator`)
        }
        if(typeof executable !== 'function') {
            throw new TypeError(`Invalid or unspecified OptiBit property: executable`)
        }

        const metadata = {
            name: name,
            description: description,
            usage: usage,

            // Image to be shown as a thumbnail when this OptiBit is viewed through !bits.
            // Must be a plain string specifying a complete filename from the ../assets/img directory.
            // i.e. "IMG_token"
            image: image,

            priority: priority,
            concurrent: concurrent,

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
                // OptiBit cannot be used in Direct Messages.
                // Mutually exclusive with authlvl -1.
                NO_DM: false, 
    
                // OptiBit can be used in server chat OR Direct Messages
                DM_OPTIONAL: false, 
    
                // OptiBit can ONLY be used in Direct Messages
                DM_ONLY: false, 
    
                // Do not list this OptiBit in !optibits
                HIDDEN: false,

                // Preserve OptiBit during Modes 1 and 2.
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
                throw new Error(`OptiBit "${name}": Flag NO_DM and authlvl -1 are mutually exclusive.`);
            }

            if(metadata.flags[`NO_DM`] && metadata.flags[`DM_OPTIONAL`]) {
                throw new Error(`OptiBit "${name}": Flags NO_DM and DM_OPTIONAL are mutually exclusive.`);
            }

            if(metadata.flags[`DM_OPTIONAL`] && metadata.flags[`DM_ONLY`]) {
                throw new Error(`OptiBit "${name}": Flags DM_OPTIONAL and DM_ONLY are mutually exclusive.`);
            }

            if(metadata.flags[`NO_DM`] && metadata.flags[`DM_ONLY`]) {
                throw new Error(`OptiBit "${name}": Flags NO_DM and DM_ONLY are mutually exclusive.`);
            }
        } else {
            if(authlvl !== 5) metadata.authlvl = 5;
        }

        return metadata;
    }
}
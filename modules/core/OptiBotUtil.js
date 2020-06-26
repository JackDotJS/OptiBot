const Profile = require(`./OptiBotProfile.js`);

module.exports = class OptiBotUtilities {
    constructor() {
        throw new Error('Cannot instantiate this class.')
    }

    setWindowTitle(bot, text) {
        if(text !== undefined) bot.memory.wintitle = text;

        function statusName(code) {
            if(code === 0) return 'READY';
            if(code === 1) return 'CONNECTING';
            if(code === 2) return 'RECONNECTING';
            if(code === 3) return 'IDLE';
            if(code === 4) return 'NEARLY';
            if(code === 5) return 'DISCONNECTED';
        }

        let wintitle = [
            `OptiBot ${bot.version}`,
            `OP Mode ${bot.mode}`,
            `${Math.round(bot.ws.ping)}ms`,
            `WS Code ${bot.ws.status} (${statusName(bot.ws.status)})`
        ]

        if(typeof bot.memory.wintitle === 'string') wintitle.push(bot.memory.wintitle);

        process.title = wintitle.join(' | ');
    }

    parseInput(bot, text) {
        if(typeof text !== 'string') text = new String(text);
        let input = text.trim().split("\n", 1)[0]; // first line of the message
        let data = {
            valid: input.match(new RegExp(`^(\\${bot.prefixes.join('|\\')})(?![^a-zA-Z0-9])[a-zA-Z0-9]+(?=\\s|$)`)), // checks if the input starts with the command prefix, immediately followed by valid characters.
            cmd: input.toLowerCase().split(" ")[0].substr(1),
            args: input.split(" ").slice(1).filter(function (e) { return e.length != 0 })
        }

        if(input.match(/^(\$)(?![^0-9])[0-9]+(?=\s|$)/)) {
            // fixes "$[numbers]" resulting in false command inputs
            data.valid = null;
        }

        return data;
    }

    getAuthlvl(member) {
        /**
         * Authorization Level
         * 
         * -1 = Muted Member (DM ONLY)
         * 0 = Normal Member
         * 1 = Advisor
         * 2 = Jr. Moderator
         * 3 = Moderator
         * 4 = Administrator
         * 5 = Bot Developer
         * 6+ = God himself
         */

        const bot = this;
        const log = bot.log;

        let processMember = (mem) => {
            if(this.cfg.superusers.indexOf(mem.user.id) > -1) {
                return 5;
            } else if(mem.permissions.has('ADMINISTRATOR')) {
                return 4;
            } else if(mem.roles.cache.has(this.cfg.roles.moderator)) {
                return 3;
            } else if(mem.roles.cache.has(this.cfg.roles.jrmod)) {
                return 2;
            } else if(mem.roles.cache.has(this.cfg.roles.advisor)) {
                return 1;
            } else if(mem.roles.cache.has(this.cfg.roles.muted)) {
                return -1;
            } else {
                return 0;
            }
        }

        if(!member || member === null || typeof member !== 'object') {
            return 0;
        } else
        if(member.constructor === djs.User) {
            log('expected object type member, got user instead', 'warn');
            return 0;
        } else {
            return processMember(member);
        }
        
    }

    /**
     * @param {String} id Profile ID to search for.
     * @param {Boolean} [create] If true, and a profile with the given id does not exist, create a new profile. Otherwise, return null.
     * @returns {Promise<Profile>|Promise<null>}
     */
    getProfile(id, create) {
        return new Promise((resolve, reject) => {
            this.log('get profile: '+id);
            this.db.profiles.find({ id: id, format: 3 }, (err, docs) => {
                if(err) {
                    reject(err);
                } else
                if(docs[0]) {
                    delete docs[0]._id;
                    resolve(docs[0]);
                } else
                if(create) {
                    resolve(new Profile());
                } else {
                    resolve();
                }
            });
        });
    }
}
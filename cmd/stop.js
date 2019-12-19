const path = require(`path`);
const Command = require(`../core/command.js`)


module.exports = class Stop extends Command {
    constructor (optibot) {
        super(optibot, {
            name: path.parse(__filename).name,
            short_desc: `Shut down OptiBot.`,
            tags: ['MODERATOR_ONLY', 'NO_JR_MOD', 'NO_DM', 'INSTANT']
        });

        this.optibot = optibot;
    }

    async exec (m, args, data) {
        m.channel.send('Goodbye').then(() => {
            this.optibot.exit();
        });
    }
}
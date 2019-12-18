const Command = require(`../core/command.js`)
const path = require(`path`);

module.exports = class Ping extends Command {
    constructor (optibot) {
        super(optibot, {
            name: path.parse(__filename).name,
            short_desc: `Ping!`
        });

        this.optibot = optibot;
    }

    async exec (m, args, data) {
        m.channel.send(this.optibot.ping)
    }
}
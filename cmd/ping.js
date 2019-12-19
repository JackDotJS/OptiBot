const path = require(`path`);
const Command = require(`../core/command.js`)


module.exports = class Ping extends Command {
    constructor (optibot) {
        super(optibot, {
            name: path.parse(__filename).name,
            short_desc: `Ping!`
        });

        this.optibot = optibot;
    }

    async exec (m, args, data) {
        m.channel.send(Math.round(this.optibot.ping))
    }
}
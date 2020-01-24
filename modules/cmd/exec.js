const path = require(`path`);
const timeago = require("timeago.js");
const util = require(`util`);
const fileType = require('file-type');
const djs = require(`discord.js`);
const Command = require(path.resolve(`./core/command.js`))

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    short_desc: `Evaluate JavaScript code.`,
    usage: '<js>',
    authlevel: 4,
    tags: ['DM_OPTIONAL', 'MOD_CHANNEL_ONLY', 'STRICT', 'HIDDEN', 'DELETE_ON_MISUSE'],
    
    run: (m, args, data) => {
        bot.setTimeout(() => {
            try {
                let code = m.content.substring( `${bot.trigger}${path.parse(__filename).name} `.length );
                let execStart = new Date().getTime();
                let output = eval(code);
                let execEnd = new Date().getTime();

                let raw = `${output}`;
                let inspect = `${util.inspect(output)}`
                let time = `${execEnd - execStart}ms (${(execEnd - execStart) / 1000} seconds)`;
                let contents = [
                    `REAL EXECUTION TIME:`,
                    `\`\`\`${time}\`\`\``,
                    `RAW OUTPUT:`,
                    `\`\`\`${raw}\`\`\``,
                    `INSPECTION UTILITY:`,
                    `\`\`\`javascript\n${inspect}\`\`\``
                ].join('\n');
    
                if(Buffer.isBuffer(output)) {
                    let ft = fileType(output);
                    if(ft !== null) {
                        contents = [
                            `REAL EXECUTION TIME:`,
                            `\`\`\`${time}\`\`\``,
                            `IMAGE OUTPUT:`
                        ].join('\n');

                        m.channel.stopTyping(true);
                        m.channel.send(contents, {files: [new djs.Attachment(output, 'output.'+ft.ext)]})
                    } else {
                        defaultRes()
                    }
                } else {
                    defaultRes()
                }
    
                function defaultRes() {
                    if(contents.length > 2000) {
                        let oldlength = contents.length;
                        contents = [
                            '////////////////////////////////////////////////////////////////',
                            '// INPUT',
                            '////////////////////////////////////////////////////////////////',
                            '',
                            code,
                            '',
                            '',
                            '////////////////////////////////////////////////////////////////',
                            '// EXECUTION TIME',
                            '////////////////////////////////////////////////////////////////',
                            '',
                            time,
                            '',
                            '',
                            '////////////////////////////////////////////////////////////////',
                            '// RAW OUTPUT',
                            '////////////////////////////////////////////////////////////////',
                            '',
                            raw,
                            '',
                            '',
                            '////////////////////////////////////////////////////////////////',
                            '// INSPECTION UTILITY',
                            '////////////////////////////////////////////////////////////////',
                            '',
                            inspect
                        ].join('\n');

                        m.channel.stopTyping(true);
                        m.channel.send(`Output too long! (${contents.length.toLocaleString()})`, { files: [new djs.Attachment(Buffer.from(contents), 'output.txt')] })
                    } else {
                        m.channel.stopTyping(true);
                        m.channel.send(contents)
                    }
                }
            }
            catch (err) {    
                m.channel.stopTyping(true);
                m.channel.send(`\`\`\`diff\n-${err.stack || err}\`\`\``)
            }
        }, 250);
    }
})}
const path = require(`path`);
const timeago = require("timeago.js");
const util = require(`util`);
const fileType = require('file-type');
const request = require('request');
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    aliases: ['eval'],
    short_desc: `Evaluate JavaScript code.`,
    usage: '<js>',
    authlevel: 4,
    tags: ['DM_OPTIONAL', 'MOD_CHANNEL_ONLY', 'STRICT', 'HIDDEN', 'DELETE_ON_MISUSE'],
    
    run: (m, args, data) => {
        bot.setTimeout(() => {
            try {
                let code = m.content.substring( `${bot.prefix}${path.parse(__filename).name} `.length );
                let execStart = new Date().getTime();
                let output = eval(code);
                let execEnd = new Date().getTime();

                let raw = `${output}`;
                let inspect = `${util.inspect(output)}`
                let time = `${(execEnd - execStart).toLocaleString()}ms (${(execEnd - execStart) / 1000} seconds)`;
                let contents = [
                    `REAL EXECUTION TIME:`,
                    `\`\`\`${time} \`\`\``
                ]

                if(raw === inspect) {
                    contents = contents.concat([
                        `OUTPUT (COMBINED):`,
                        `\`\`\`javascript\n${inspect} \`\`\``
                    ]).join('\n');
                } else {
                    contents = contents.concat([
                        `RAW OUTPUT:`,
                        `\`\`\`${raw} \`\`\``,
                        `INSPECTION UTILITY:`,
                        `\`\`\`javascript\n${inspect} \`\`\``
                    ]).join('\n');
                }
    
                if(Buffer.isBuffer(output)) {
                    let ft = fileType(output);
                    if(ft !== null && ft !== undefined) {
                        contents = [
                            `REAL EXECUTION TIME:`,
                            `\`\`\`${time} \`\`\``,
                            `IMAGE OUTPUT:`
                        ].join('\n');

                        m.channel.stopTyping(true);
                        m.channel.send(contents, {files: [new djs.MessageAttachment(output, 'output.'+ft.ext)]})
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
                        ]

                        if(raw === inspect) {
                            contents = contents.concat([
                                '////////////////////////////////////////////////////////////////',
                                '// OUTPUT (COMBINED)',
                                '////////////////////////////////////////////////////////////////',
                                '',
                                raw
                            ]).join('\n')
                        } else {
                            contents = contents.concat([
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
                            ]).join('\n')
                        }

                        m.channel.stopTyping(true);
                        m.channel.send(`Output too long! (${(oldlength - 2000).toLocaleString()} characters over message limit)`, { files: [new djs.MessageAttachment(Buffer.from(contents), 'output.txt')] })
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
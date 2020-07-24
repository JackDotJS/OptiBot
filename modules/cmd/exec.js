const path = require(`path`);
const timeago = require("timeago.js");
const util = require(`util`);
const fileType = require('file-type');
const request = require('request');
const djs = require(`discord.js`);
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    aliases: ['eval'],
    short_desc: `Evaluate JavaScript code.`,
    args: '<code>',
    authlvl: 5,
    flags: ['DM_OPTIONAL', 'MOD_CHANNEL_ONLY', 'STRICT', 'HIDDEN', 'DELETE_ON_MISUSE'],
    run: null
}

metadata.run = (m, args, data) => {
    bot.setTimeout(() => {
        try {
            let code = m.content.substring( `${bot.prefix}${path.parse(__filename).name} `.length );
            let execStart = new Date().getTime();
            let output = eval(code);
            let execEnd = new Date().getTime();

            let raw = `${output}`;
            let inspect = `${util.inspect(output)}`
            let info = [
                `Execution Time: ${(execEnd - execStart).toLocaleString()}ms (${(execEnd - execStart) / 1000} seconds)`,
                `Typeof: ${typeof output}`,
                `Constructor: ${output.constructor.name}`
            ];
            let result = []
            let contents = []

            function compileContents() {
                contents.push(
                    `Result Information:`,
                    `\`\`\`yaml\n${info.join('\n')} \`\`\``, 
                    ...result
                );
                contents = contents.join('\n');
            }

            if(Buffer.isBuffer(output)) {
                let ft = fileType(output);
                if(ft !== null && ft !== undefined) {
                    result = [
                        `File Output:`
                    ];
                    info.push(
                        `File Size: ${output.length.toLocaleString()} bytes`,
                        `File Extension: ${ft.ext}`,
                        `File MIME Type: ${ft.mime}`
                    )

                    compileContents()
                    m.channel.stopTyping(true);
                    m.channel.send(contents, {files: [new djs.MessageAttachment(output, 'output.'+ft.ext)]})
                } else {
                    defaultRes()
                }
            } else {
                defaultRes()
            }
            

            function defaultRes() {
                if(raw === inspect) {
                    result.push(
                        `Output:`,
                        `\`\`\`javascript\n${inspect} \`\`\``
                    );
                    info.push(
                        `Output Length: ${raw.length.toLocaleString()} characters`
                    )
                } else {
                    result.push(
                        `Raw Output:`,
                        `\`\`\`${raw} \`\`\``,
                        `Inspected Output:`,
                        `\`\`\`javascript\n${inspect} \`\`\``
                    );
                    info.push(
                        `Raw Output Length: ${raw.length.toLocaleString()} characters`,
                        `Inspected Output Length: ${inspect.length.toLocaleString()} characters`
                    )
                }

                compileContents()

                if(contents.length > 2000) {
                    let oldlength = contents.length;
                    contents = [
                        '////////////////////////////////////////////////////////////////',
                        '// Input',
                        '////////////////////////////////////////////////////////////////',
                        '',
                        code,
                        '',
                        '',
                        '////////////////////////////////////////////////////////////////',
                        '// Result Information',
                        '////////////////////////////////////////////////////////////////',
                        '',
                        info.join('\n'),
                        '',
                        '',
                    ]

                    if(raw === inspect) {
                        contents = contents.concat([
                            '////////////////////////////////////////////////////////////////',
                            '// Output',
                            '////////////////////////////////////////////////////////////////',
                            '',
                            raw
                        ]).join('\n')
                    } else {
                        contents = contents.concat([
                            '////////////////////////////////////////////////////////////////',
                            '// Raw Output',
                            '////////////////////////////////////////////////////////////////',
                            '',
                            raw,
                            '',
                            '',
                            '////////////////////////////////////////////////////////////////',
                            '// Inspected Output',
                            '////////////////////////////////////////////////////////////////',
                            '',
                            inspect
                        ]).join('\n')
                    }

                    m.channel.stopTyping(true);
                    m.channel.send([
                        `Result Information:`,
                        `\`\`\`yaml\n${info.join('\n')}\`\`\``,
                        `Output too long! (${(oldlength - 2000).toLocaleString()} characters over message limit)`,
                        `See attached file for output:`
                    ].join('\n'), { files: [new djs.MessageAttachment(Buffer.from(contents), 'output.txt')] })
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

module.exports = new Command(metadata);
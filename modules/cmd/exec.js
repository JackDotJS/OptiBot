const path = require(`path`);
const util = require(`util`);
const fileType = require('file-type');
const Discord = require(`discord.js`);
const Command = require(path.resolve(`./core/command.js`))
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    short_desc: `Evaluate JavaScript code.`,
    usage: '<js>',
    authlevel: 4,
    tags: ['DM_OPTIONAL', 'INSTANT', 'HIDDEN'],
    
    run: (m, args, data) => {
        try {
            let output = eval(m.content.substring( (bot.trigger+'exec ').length ));
            
            let response = `RAW OUTPUT: \`\`\`${output}\`\`\` \nINSPECTION UTILITY: \`\`\`${util.inspect(output)}\`\`\``;


            if(Buffer.isBuffer(output)) {
                let ft = fileType(output);
                if(ft !== null) {
                    m.channel.send({ files: [new Discord.Attachment(output, 'output.'+ft.ext)] }).then(bm => msgFinalizer(m.author.id, bm, bot, log));
                } else {
                    defaultRes()
                }
            } else {
                defaultRes()
            }

            

            function defaultRes() {
                if(response.length > 1900) {
                    response = [
                        '////////////////////////////////////////////////////////////////',
                        '// RAW OUTPUT',
                        '////////////////////////////////////////////////////////////////',
                        '',
                        output,
                        '',
                        '',
                        '////////////////////////////////////////////////////////////////',
                        '// INSPECTION UTILITY',
                        '////////////////////////////////////////////////////////////////',
                        '',
                        util.inspect(output)
                    ];
    
                    m.channel.send({ files: [new Discord.Attachment(Buffer.from(response.join('\n')), 'output.txt')] }).then(bm => msgFinalizer(m.author.id, bm, bot, log));
                } else{
                    m.channel.send(response).then(bm => msgFinalizer(m.author.id, bm, bot, log));
                }
            }
        }
        catch (err) {
            m.channel.send(`\`\`\`diff\n-${err.stack || err}\`\`\``).then(bm => msgFinalizer(m.author.id, bm, bot, log));
        }
    }
})}
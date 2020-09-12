const path = require('path');
const util = require('util');
const djs = require('discord.js');
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    short_desc: `Short description. Shows in \`${bot.prefix}list\``,
    long_desc: `Long description. Shows in \`${bot.prefix}help\` and tooltips in \`${bot.prefix}list\``,
    args: '<discord message>',
    authlvl: 2,
    flags: ['DM_OPTIONAL'],
    run: null
};

metadata.run = (m, args, data) => {
    if(!args[0]) {
        OBUtil.missingArgs(m, metadata);
    } else {
        OBUtil.parseTarget(m, 1, args[0], data.member).then(result => {
            if(result && result.type === 'message') {
                if(!result.target.pinned) {
                    OBUtil.err('That message is not pinned.', {m:m});
                } else {
                    result.target.unpin().then(() => {
                        result.target.pin().then(() => {
                            const embed = new djs.MessageEmbed()
                                .setAuthor('Pinned message successfully moved.', Assets.getEmoji('ICO_okay').url)
                                .setColor(bot.cfg.embed.okay);
    
                            m.channel.send({embed: embed}).then(msg => { OBUtil.afterSend(msg, m.author.id); });
                        }).catch(err => {
                            OBUtil.err(err, {m:m});
                        });
                    }).catch(err => {
                        OBUtil.err(err, {m:m});
                    });
                }
            } else {
                OBUtil.err('You must specify a valid message.', {m:m});
            }
        }).catch(err => {
            OBUtil.err(err, {m:m});
        });
    }
};

module.exports = new Command(metadata);
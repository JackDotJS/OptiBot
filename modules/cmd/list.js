const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const Command = require(path.resolve(`./modules/core/command.js`));
const errMsg = require(path.resolve(`./modules/util/simpleError.js`));
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    aliases: ['commands'],
    short_desc: `List all OptiBot commands.`,
    long_desc: `Lists all OptiBot commands. By default, this will show every single command you have access to.`,
    usage: `[page # [filter] | filter [page #]]`,
    authlevel: 0,
    tags: ['DM_OPTIONAL'],

    run: (m, args, data) => {
        let list = bot.commands.index
        let filtered;
        let selectPage = 1;
        let menu;
        let stext = '';

        if (args[0] && isNaN(args[0])) {
            menu = args[0].toLowerCase();
        } else 
        if (args[1] && isNaN(args[1])) {
            menu = args[1].toLowerCase();
        }

        if(args[0] && !isNaN(args[0])) {
            selectPage = parseInt(args[0]);
        } else
        if(args[1] && !isNaN(args[1])) {
            selectPage = parseInt(args[1]);
        }

        if (menu === 'dev') {
            if(data.authlvl < 4) {
                let embed = errMsg(`You do not have permission to view these commands.`, bot, log)
                m.channel.send({embed: embed}).then(msg => msgFinalizer(m.author.id, msg, bot, log))
                return;
            } else 
            if(m.channel.type !== 'dm' && bot.cfg.channels.mod.indexOf(m.channel.id) === -1 && bot.cfg.channels.mod.indexOf(m.channel.parentID) === -1 && data.authlvl > 0) {
                let embed = errMsg(`You cannot view these commands outside of moderator-only channels and DMs.`, bot, log)
                m.channel.send({embed: embed}).then(msg => msgFinalizer(m.author.id, msg, bot, log))
                return;
            } else {
                filtered = list.filter((cmd) => (cmd.metadata.authlevel >= 4));
                stext = `Search Filter: Only Developer Commands`;
            }
        } else
        if (menu === 'admin') {
            if(data.authlvl < 3) {
                let embed = errMsg(`You do not have permission to view these commands.`, bot, log)
                m.channel.send({embed: embed}).then(msg => msgFinalizer(m.author.id, msg, bot, log))
                return;
            } else 
            if(m.channel.type !== 'dm' && bot.cfg.channels.mod.indexOf(m.channel.id) === -1 && bot.cfg.channels.mod.indexOf(m.channel.parentID) === -1 && data.authlvl > 0) {
                let embed = errMsg(`You cannot view these commands outside of moderator-only channels and DMs.`, bot, log)
                m.channel.send({embed: embed}).then(msg => msgFinalizer(m.author.id, msg, bot, log))
                return;
            } else {
                filtered = list.filter((cmd) => (cmd.metadata.authlevel === 3));
                stext = `Search Filter: Only Administrator Commands`;
            }
            
        } else
        if (menu === 'mod') {
            if(data.authlvl < 1) {
                let embed = errMsg(`You do not have permission to view these commands.`, bot, log)
                m.channel.send({embed: embed}).then(msg => msgFinalizer(m.author.id, msg, bot, log))
                return;
            } else 
            if(m.channel.type !== 'dm' && bot.cfg.channels.mod.indexOf(m.channel.id) === -1 && bot.cfg.channels.mod.indexOf(m.channel.parentID) === -1 && data.authlvl > 0) {
                let embed = errMsg(`You cannot view these commands outside of moderator-only channels and DMs.`, bot, log)
                m.channel.send({embed: embed}).then(msg => msgFinalizer(m.author.id, msg, bot, log))
                return;
            } else {
                filtered = list.filter((cmd) => (cmd.metadata.authlevel === 1 || cmd.metadata.authlevel === 2));
                stext = `Search Filter: All Moderator Commands`;
            }
        } else
        if (menu === 'srmod') {
            if(data.authlvl < 1) {
                let embed = errMsg(`You do not have permission to view these commands.`, bot, log)
                m.channel.send({embed: embed}).then(msg => msgFinalizer(m.author.id, msg, bot, log))
                return;
            } else 
            if(m.channel.type !== 'dm' && bot.cfg.channels.mod.indexOf(m.channel.id) === -1 && bot.cfg.channels.mod.indexOf(m.channel.parentID) === -1 && data.authlvl > 0) {
                let embed = errMsg(`You cannot view these commands outside of moderator-only channels and DMs.`, bot, log)
                m.channel.send({embed: embed}).then(msg => msgFinalizer(m.author.id, msg, bot, log))
                return;
            } else {
                filtered = list.filter((cmd) => (cmd.metadata.authlevel === 2));
                stext = `Search Filter: Only Sr. Moderator Commands`;
            }
        } else
        if (menu === 'jrmod') {
            if(data.authlvl < 1) {
                let embed = errMsg(`You do not have permission to view these commands.`, bot, log)
                m.channel.send({embed: embed}).then(msg => msgFinalizer(m.author.id, msg, bot, log))
                return;
            } else 
            if(m.channel.type !== 'dm' && bot.cfg.channels.mod.indexOf(m.channel.id) === -1 && bot.cfg.channels.mod.indexOf(m.channel.parentID) === -1 && data.authlvl > 0) {
                let embed = errMsg(`You cannot view these commands outside of moderator-only channels and DMs.`, bot, log)
                m.channel.send({embed: embed}).then(msg => msgFinalizer(m.author.id, msg, bot, log))
                return;
            } else {
                filtered = list.filter((cmd) => (cmd.metadata.authlevel === 1));
                stext = `Search Filter: Only Jr. Moderator Commands`;
            }
        } else {
            if(m.channel.type !== 'dm' && bot.cfg.channels.mod.indexOf(m.channel.id) === -1 && bot.cfg.channels.mod.indexOf(m.channel.parentID) === -1 && data.authlvl > 0) {
                filtered = list.filter((cmd) => (cmd.metadata.authlevel === 0));
                stext = `Note: Some commands have been hidden because you're in a public channel.`;
            } else {
                filtered = list.filter((cmd) => (cmd.metadata.authlevel <= data.authlvl));
            }
        }

        if(filtered.length === 0) {
            let embed = errMsg(`Could not find any commands with the "${menu}" filter.`, bot, log)

            m.channel.send({embed: embed}).then(msg => msgFinalizer(m.author.id, msg, bot, log))
            return;
        }

        let pageNum = 1
        let pageLimit = Math.ceil(filtered.length / 10);
        if (selectPage > 0 && selectPage <= pageLimit) {
            pageNum = selectPage;
        }

        let embed = new djs.RichEmbed()
        .setColor(bot.cfg.embed.default)
        .setAuthor(`OptiBot Command Index | Page ${pageNum}/${pageLimit}`, bot.icons.find('ICO_docs'))
        .setDescription(`Hover over the tooltip icons [ℹ️](${m.url.replace(/\/\d+$/, '')} "No easter eggs here... 👀") or use \`${bot.prefix}help <command>\` for detailed information.`)

        if(stext.length > 0) {
            embed.setTitle(stext);
        }

        let i = (pageNum > 1) ? (10 * (pageNum - 1)) : 0;
        let added = 0;
        (function addList() {
            let cmd = filtered[i].metadata;
            let hover_text = [];

            if(cmd.long_desc.length > 325) {
                hover_text.push(`This description is too long to show here. Type "${bot.prefix}help ${cmd.name}" for full details.`);
            } else {
                hover_text.push(cmd.long_desc);
            }

            hover_text.push(`\nUsage: ${cmd.usage}`);

            if (cmd.tags['NO_DM']) {
                if(cmd.tags['BOT_CHANNEL_ONLY']) {
                    hover_text.push(`❌ This command can *only* be used in the #optibot channel.`);
                } else {
                    hover_text.push(`⚠ This command can be used in any channel, but *not* in DMs (Direct Messages)`);
                }
            } else
            if (cmd.tags['DM_ONLY']) {
                hover_text.push(`❌ This command can *only* be used in DMs (Direct Messages)`);
            } else
            if (cmd.tags['BOT_CHANNEL_ONLY']) {
                hover_text.push(`⚠ This command can *only* be used in DMs (Direct Messages) or the #optibot channel.`);
            } else
            if (cmd.tags['MOD_CHANNEL_ONLY']) {
                if(cmd.tags['NO_DM']) {
                    hover_text.push(`❌ This command can *only* be used in moderator-only channels.`);
                } else {
                    hover_text.push(`❌ This command can *only* be used in DMs (Direct Messages) or any moderator-only channel.`);
                }
            } else {
                hover_text.push(`☑ This command can be used in any channel, including DMs (Direct Messages)`);
            }

            if(cmd.tags['STRICT']) {
                hover_text.push('🔒 Restrictions apply to ALL members, regardless of roles or permissions.');
            } else
            if(cmd.tags['BOT_CHANNEL_ONLY']) {
                hover_text.push(`🔓 Moderators exempt from some of these restrictions.`);
            }

            if (cmd.authlevel === 0) {
                hover_text.push(`🔓 This command can be used by all members.`);
            }
            if (cmd.authlevel === 1) {
                hover_text.push('🔒 Jr. Moderators, Sr. Moderators, and Administrators only.');
            } else
            if (cmd.authlevel === 2) {
                hover_text.push('🔒 Sr. Moderators and Administrators only.');
            } else
            if (cmd.authlevel === 3) {
                hover_text.push('🔒 Administrators only.');
            } else
            if (cmd.authlevel === 4) {
                hover_text.push('🔒 OptiBot developers only.');
            }

            if(cmd.tags['HIDDEN']) {
                hover_text.push(`⚠ This is a hidden command. OptiBot will act as if this command does not exist to any user who does not have permission.`);
            }

            embed.addField(bot.prefix+cmd.name, `${cmd.short_desc} [ℹ️](${m.url.replace(/\/\d+$/, '')} "${hover_text.join('\n')}")`);
            added++;
            
            if (added >= 10 || i+1 >= filtered.length) {
                m.channel.send({embed: embed}).then(msg => msgFinalizer(m.author.id, msg, bot, log))
            } else {
                i++;
                addList();
            }
        })();
    }
})}
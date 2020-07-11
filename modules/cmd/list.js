const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const { Command, OBUtil, Memory } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    aliases: ['commands', 'cmds', 'cmdlist'],
    short_desc: `List all OptiBot commands.`,
    long_desc: [
        `Lists all OptiBot commands. By default, this will show every single command you have access to. Alternatively, if you have the roles/permissions, you can use the following filters:`,
        ``,
        `**\`advisor\`** - Lists all <@&695553561064505345> commands.`,
        `**\`jrmod\`** - Lists all <@&644668061818945557> commands.`,
        `**\`srmod\`** - Lists all <@&467060304145023006> commands.`,
        `**\`mod\`** - Lists all <@&644668061818945557> **and** <@&467060304145023006> commands.`,
        `**\`admin\`** - Lists all <@&663122057818537995> commands.`,
        `**\`dev\`** - (DEV) Lists all commands usable by OptiBot Developers.`,
        `**\`flag:*\`** - (DEV) Lists all commands with the given flag name.`,
    ].join('\n'),
    args: [
        `[page number] [filter]`,
        `[filter] [page number]`
    ],
    authlvl: 0,
    flags: ['DM_OPTIONAL'],
    run: null
}

metadata.run = (m, args, data) => {
    let list = bot.commands.index
    let filtered;
    let selectPage = 1;
    let menu = '';
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

    let defaultFilter = () => {
        if(m.channel.type !== 'dm' && bot.cfg.channels.mod.indexOf(m.channel.id) === -1 && bot.cfg.channels.mod.indexOf(m.channel.parentID) === -1 && data.authlvl > 0) {
            filtered = list.filter((cmd) => (cmd.metadata.authlvl === 0));
            stext = `Note: Some commands have been hidden because you're in a public channel.`;
        } else {
            filtered = list.filter((cmd) => (cmd.metadata.authlvl <= data.authlvl));
        }
    }

    if (menu === 'dev') {
        if(data.authlvl < 5) {
            OBUtil.err(`You do not have permission to view these commands.`, {m:m})
            return;
        } else 
        if(m.channel.type !== 'dm' && bot.cfg.channels.mod.indexOf(m.channel.id) === -1 && bot.cfg.channels.mod.indexOf(m.channel.parentID) === -1 && data.authlvl > 0) {
            OBUtil.err(`You cannot view these commands outside of moderator-only channels and DMs.`, {m:m})
            return;
        } else {
            filtered = list.filter((cmd) => (cmd.metadata.authlvl >= 5));
            stext = `Search Filter: Developer Commands`;
        }
    } else
    if (menu === 'admin') {
        if(data.authlvl < 4) {
            OBUtil.err(`You do not have permission to view these commands.`, {m:m})
            return;
        } else 
        if(m.channel.type !== 'dm' && bot.cfg.channels.mod.indexOf(m.channel.id) === -1 && bot.cfg.channels.mod.indexOf(m.channel.parentID) === -1 && data.authlvl > 0) {
            OBUtil.err(`You cannot view these commands outside of moderator-only channels and DMs.`, {m:m})
            return;
        } else {
            filtered = list.filter((cmd) => (cmd.metadata.authlvl === 4));
            stext = `Search Filter: Administrator Commands`;
        }
    } else
    if (menu === 'mod') {
        if(data.authlvl < 2) {
            OBUtil.err(`You do not have permission to view these commands.`, {m:m})
            return;
        } else 
        if(m.channel.type !== 'dm' && bot.cfg.channels.mod.indexOf(m.channel.id) === -1 && bot.cfg.channels.mod.indexOf(m.channel.parentID) === -1 && data.authlvl > 0) {
            OBUtil.err(`You cannot view these commands outside of moderator-only channels and DMs.`, {m:m})
            return;
        } else {
            filtered = list.filter((cmd) => (cmd.metadata.authlvl === 2 || cmd.metadata.authlvl === 3));
            stext = `Search Filter: All Moderator Commands`;
        }
    } else
    if (menu === 'srmod') {
        if(data.authlvl < 3) {
            OBUtil.err(`You do not have permission to view these commands.`, {m:m})
            return;
        } else 
        if(m.channel.type !== 'dm' && bot.cfg.channels.mod.indexOf(m.channel.id) === -1 && bot.cfg.channels.mod.indexOf(m.channel.parentID) === -1 && data.authlvl > 0) {
            OBUtil.err(`You cannot view these commands outside of moderator-only channels and DMs.`, {m:m})
            return;
        } else {
            filtered = list.filter((cmd) => (cmd.metadata.authlvl === 3));
            stext = `Search Filter: Sr. Moderator Commands`;
        }
    } else
    if (menu === 'jrmod') {
        if(data.authlvl < 2) {
            OBUtil.err(`You do not have permission to view these commands.`, {m:m})
            return;
        } else 
        if(m.channel.type !== 'dm' && bot.cfg.channels.mod.indexOf(m.channel.id) === -1 && bot.cfg.channels.mod.indexOf(m.channel.parentID) === -1 && data.authlvl > 0) {
            OBUtil.err(`You cannot view these commands outside of moderator-only channels and DMs.`, {m:m})
            return;
        } else {
            filtered = list.filter((cmd) => (cmd.metadata.authlvl === 2));
            stext = `Search Filter: Jr. Moderator Commands`;
        }
    } else
    if (menu === 'advisor') {
        if(data.authlvl < 1) {
            OBUtil.err(`You do not have permission to view these commands.`, {m:m})
            return;
        } else 
        if(m.channel.type !== 'dm' && bot.cfg.channels.mod.indexOf(m.channel.id) === -1 && bot.cfg.channels.mod.indexOf(m.channel.parentID) === -1 && data.authlvl > 0) {
            OBUtil.err(`You cannot view these commands outside of moderator-only channels and DMs.`, {m:m})
            return;
        } else {
            filtered = list.filter((cmd) => (cmd.metadata.authlvl === 1));
            stext = `Search Filter: Advisor Commands`;
        }
    } else
    if(menu.startsWith('flag:')) {
        if(data.authlvl < 3) {
            defaultFilter();
        } else {
            if(m.channel.type !== 'dm' && bot.cfg.channels.mod.indexOf(m.channel.id) === -1 && bot.cfg.channels.mod.indexOf(m.channel.parentID) === -1 && data.authlvl > 0) {
                OBUtil.err(`You cannot view these commands outside of moderator-only channels and DMs.`, {m:m})
                return;
            } else {
                let flag = menu.substring( `flag:`.length ).toUpperCase();
                filtered = list.filter((cmd) => (cmd.metadata.flags[`${flag}`] ));
                stext = `Search Filter: FLAG \`${flag}\``;
            }
        }
    } else {
        defaultFilter();
    }

    if(filtered.length === 0) {
        if(menu.startsWith('flag:') && data.authlvl >= 3) {
            let flag = menu.substring( `flag:`.length ).toUpperCase();
            OBUtil.err(`Could not find any commands with the "${flag}" flag.`, {m:m})
        } else {
            OBUtil.err(`Could not find any commands with the "${menu}" filter.`, {m:m})
        }
        return;
    }

    let pageNum = 1
    let pageLimit = Math.ceil(filtered.length / 10);
    if (selectPage > 0 && selectPage <= pageLimit) {
        pageNum = selectPage;
    }

    let tooltip = `[?]`;

    let embed = new djs.MessageEmbed()
    .setColor(bot.cfg.embed.default)
    .setAuthor(`OptiBot Command Index | Page ${pageNum}/${pageLimit}`, OBUtil.getEmoji('ICO_docs').url)
    .setDescription(`Hover over the tooltip icons [${tooltip}](${m.url.replace(/\/\d+$/, '')} "No easter eggs here... 👀") or use \`${bot.prefix}help <command>\` for detailed information.`)

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

        hover_text.push(`\nUsage: ${cmd.args}`);

        if (cmd.flags['NO_DM']) {
            if(cmd.flags['BOT_CHANNEL_ONLY']) {
                hover_text.push(`❌ This command can *only* be used in the #optibot channel.`);
            } else {
                hover_text.push(`⚠ This command can be used in any channel, but *not* in DMs (Direct Messages)`);
            }
        } else
        if (cmd.flags['DM_ONLY']) {
            hover_text.push(`❌ This command can *only* be used in DMs (Direct Messages)`);
        } else
        if (cmd.flags['BOT_CHANNEL_ONLY']) {
            hover_text.push(`⚠ This command can *only* be used in DMs (Direct Messages) or the #optibot channel.`);
        } else
        if (cmd.flags['MOD_CHANNEL_ONLY']) {
            if(cmd.flags['NO_DM']) {
                hover_text.push(`❌ This command can *only* be used in moderator-only channels.`);
            } else {
                hover_text.push(`❌ This command can *only* be used in DMs (Direct Messages) or any moderator-only channel.`);
            }
        } else {
            hover_text.push(`☑ This command can be used in any channel, including DMs (Direct Messages)`);
        }

        if(cmd.flags['STRICT']) {
            hover_text.push('🔒 Restrictions apply to ALL members, regardless of roles or permissions.');
        } else
        if(cmd.flags['BOT_CHANNEL_ONLY']) {
            hover_text.push(`🔓 Moderators exempt from some restrictions.`);
        }

        if (cmd.authlvl === 0) {
            hover_text.push(`🔓 Available to all server members.`);
        } else
        if (cmd.authlvl === 1) {
            hover_text.push(`🔒 Advisors, Jr. Moderators, and higher.`);
        } else
        if (cmd.authlvl === 2) {
            hover_text.push('🔒 Jr. Moderators, Moderators, and higher.');
        } else
        if (cmd.authlvl === 3) {
            hover_text.push('🔒 Moderators and Administrators only.');
        } else
        if (cmd.authlvl === 4) {
            hover_text.push('🔒 Administrators only.');
        } else
        if (cmd.authlvl === 5) {
            hover_text.push('🔒 OptiBot developers only.');
        }

        if(cmd.flags['HIDDEN']) {
            hover_text.push(`⚠ This is a hidden command. OptiBot will act as if this command does not exist to any user who does not have permission.`);
        }

        embed.addField(bot.prefix+cmd.name, `${cmd.short_desc} [${tooltip}](${m.url.replace(/\/\d+$/, '')} "${hover_text.join('\n')}")`);
        added++;
        
        if (added >= 10 || i+1 >= filtered.length) {
            m.channel.send({embed: embed}).then(msg => OBUtil.afterSend(msg, m.author.id))
        } else {
            i++;
            addList();
        }
    })();
}

module.exports = new Command(metadata);
const path = require(`path`);
const util = require(`util`);
const wink = require('jaro-winkler');
const cstr = require('string-similarity');
const djs = require(`discord.js`);
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    aliases: ['commands', 'cmds', 'cmdlist'],
    short_desc: `List all OptiBot commands.`,
    long_desc: [
        `Lists all OptiBot commands. By default, this will show every single command you have access to. Alternatively, you can use the following filters:`,
        ``,
        `**General**`,
        `**\`q:*\`** - Search commands with a given word, or a phrase surrounded by quotes (").`,
        `**\`has:*\`** - Same as the above, but 100% more strict.`,
        ``,
        `**Role-Based**`,
        `**\`advisor\`** - Lists all <@&695553561064505345> commands.`,
        `**\`jrmod\`** - Lists all <@&644668061818945557> commands.`,
        `**\`srmod\`** - Lists all <@&467060304145023006> commands.`,
        `**\`mod\`** - Lists all <@&644668061818945557> **and** <@&467060304145023006> commands.`,
        `**\`admin\`** - Lists all <@&663122057818537995> commands.`,
        ``,
        `**Developer**`,
        `**\`dev\`** - (DEV) Lists all commands usable by OptiBot Developers.`,
        `**\`flag:*\`** - (DEV) Lists all commands with the given flag name.`,
    ].join(`${Assets.getEmoji('ICO_space')}\n`)+Assets.getEmoji('ICO_space').toString(),
    args: [
        `[page number] [filter]`,
        `[filter] [page number]`
    ],
    authlvl: 0,
    flags: ['DM_OPTIONAL'],
    run: null
}

metadata.run = (m, args, data) => {
    let list = Memory.assets.commands
    let filtered;
    let selectPage = 1;
    let menu = '';
    let stext = '';
    let ftext = '';

    let isModChannel = (m.channel.type === 'dm' || bot.cfg.channels.mod.includes(m.channel.id) || bot.cfg.channels.mod.includes(m.channel.parentID));

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
        if(!isModChannel && data.authlvl > 0) {
            filtered = list.filter((cmd) => (cmd.metadata.authlvl === 0));
            ftext = `Note: Some commands have been hidden because you're in a public channel.`;
        } else {
            filtered = list.filter((cmd) => (cmd.metadata.authlvl <= data.authlvl));
        }
    }

    if (['dev', 'admin', 'mod', 'srmod', 'jrmod', 'advisor'].includes(menu)) {
        let auths = [];

        switch (menu) {
            case 'dev': 
                auths.push(5);
                stext = `Search Filter: Developer Commands`;
                break;
            case 'admin': 
                auths.push(4);
                stext = `Search Filter: Administrator Commands`;
                break;
            case 'mod': 
                auths.push(2, 3);
                stext = `Search Filter: All Moderator Commands`;
                break;
            case 'srmod': 
                auths.push(3);
                stext = `Search Filter: Sr. Moderator Commands`;
                break;
            case 'jrmod': 
                auths.push(2);
                stext = `Search Filter: Jr. Moderator Commands`;
                break;
            default:
                auths.push(1);
                stext = `Search Filter: Advisor Commands`;
        }

        if(data.authlvl < auths[0]) {
            return OBUtil.err(`You do not have permission to view these commands.`, {m:m});
        }

        if(!isModChannel && data.authlvl > 0) {
            return OBUtil.err(`You cannot view these commands outside of moderator-only channels and DMs.`, {m:m})
        }

        filtered = list.filter((cmd) => auths.includes(cmd.metadata.authlvl));
    } else
    if(menu.startsWith('flag:') && menu !== 'flag:' && data.authlvl >= 3) {
        if(!isModChannel && data.authlvl > 0) {
            return OBUtil.err(`You cannot view these commands outside of moderator-only channels and DMs.`, {m:m});
        }

        let flag = menu.substring( `flag:`.length ).toUpperCase();
        filtered = list.filter((cmd) => (cmd.metadata.flags[`${flag}`] ));
        stext = `Search Filter: FLAG \`${flag}\``;
    } else 
    if(menu.startsWith('q:') && menu !== 'q:') {
        defaultFilter();

        let query = m.content.match(/(?<=q:["'`]).+(?=["'`])/);

        if(!query) query = m.content.match(/(?<=q:)\S+/);

        stext = `Search Filter: "${query}"`;

        query = query.toString().toLowerCase();

        let copyList = [];

        for(let i in filtered) {
            let cmd = filtered[i];

            // jaro-winkler
            //let compare = wink;

            // dice's coefficient
            let compare = cstr.compareTwoStrings;

            let ratings = [
                compare(cmd.metadata.name.toLowerCase(), query),
                compare(cmd.metadata.short_desc.toLowerCase(), query),
                compare(cmd.metadata.long_desc.toLowerCase(), query)
            ];

            for(let alias of cmd.metadata.aliases) {
                ratings.push(compare(alias, query));
            }

            ratings.sort((a,b) => b - a);

            copyList.push({
                command: cmd,
                _qr: ratings[0]
            });
        }

        copyList.sort((a,b) => b._qr - a._qr);

        filtered = copyList;
    } else 
    if(menu.startsWith('has:') && menu !== 'has:') {
        defaultFilter();

        let query = m.content.match(/(?<=has:["'`]).+(?=["'`])/);

        if(!query) query = m.content.match(/(?<=has:)\S+/);

        stext = `Search Filter: "${query}" (literal)`;

        query = query.toString().toLowerCase();

        // yo dawg so i heard u like filters
        filtered = filtered.filter((cmd) => {
            if(cmd.metadata.name.includes(query)) return true;
            if(cmd.metadata.aliases.includes(query)) return true;
            if(cmd.metadata.short_desc.includes(query)) return true;
            if(cmd.metadata.long_desc.includes(query)) return true;
        });
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
    .setAuthor(`OptiBot Command Index | Page ${pageNum}/${pageLimit}`, Assets.getEmoji('ICO_docs').url)
    .setDescription(`Hover over the tooltip icons [${tooltip}](${m.url.replace(/\/\d+$/, '')} "No easter eggs here... 👀") or use \`${bot.prefix}help <command>\` for detailed information.`)

    if(stext.length > 0) embed.setTitle(stext);

    if(ftext.length > 0) embed.setFooter(ftext);

    let i = (pageNum > 1) ? (10 * (pageNum - 1)) : 0;
    let added = 0;
    (function addList() {
        let cmd = (filtered[i]._qr != null) ? filtered[i].command.metadata : filtered[i].metadata;
        let hover_text = [];

        if(cmd.long_desc.length > 325) {
            hover_text.push(`This description is too long to show here. Type "${bot.prefix}help ${cmd.name}" for full details.`);
        } else {
            hover_text.push(cmd.long_desc);
        }

        hover_text.push(
            ``,
            `Usage:`,
            `${cmd.args_pt}`,
            ``
        );

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

        embed.addField(`${bot.prefix+cmd.name}`, `${cmd.short_desc} [${tooltip}](${m.url.replace(/\/\d+$/, '')} "${hover_text.join('\n')}") ${(filtered[i]._qr != null) ? `\`(${(filtered[i]._qr * 100).toFixed(1)}%)\`` : ''}`);
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
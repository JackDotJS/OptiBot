const path = require(`path`);
const djs = require(`discord.js`);
const timeago = require("timeago.js");
const Command = require(path.resolve(`./core/command.js`))
const targetUser = require(path.resolve(`./modules/util/targetUser.js`))
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    short_desc: `Displays detailed information about a specified user.`,
    usage: `<discord user>`,
    authlevel: 0,
    tags: ['DM_OPTIONAL', 'BOT_CHANNEL_ONLY', 'INSTANT'],

    run: (m, args, data) => {
        if(!args[0]) {
            let embed = new djs.RichEmbed()
            .setAuthor(`Usage:`, bot.icons.find('ICO_info'))
            .setDescription(`\`\`\`${data.cmd.metadata.usage}\`\`\``)
            .setColor(bot.cfg.embed.default);

            m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot, log));
        } else {
            targetUser(m, args[0], bot, log).then((result) => {
                if(!result) {
                    let embed = new djs.RichEmbed()
                    .setAuthor('You must specify a valid user @mention, ID, or target shortcut (^)', bot.icons.find('ICO_error'))
                    .setColor(bot.cfg.embed.error)
        
                    m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot, log));
                } else 
                if(result.type === 'unknown' || result.type === 'id') {
                    let embed = new djs.RichEmbed()
                    .setAuthor('Unable to find a user.', bot.icons.find('ICO_error'))
                    .setDescription(`If that person is no longer in the server, I can't get information about them. Sorry!`)
                    .setColor(bot.cfg.embed.error)
        
                    m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot, log));
                } else {
                    let mem = result.target;
                    let embed = new djs.RichEmbed()
                    .setAuthor(`That is...`, bot.icons.find('ICO_docs'))
                    .setColor(bot.cfg.embed.default)
                    .setTitle(`${mem.user.tag} ${(mem.user.bot) ? "🤖" : ""}`)
                    .setThumbnail(mem.user.displayAvatarURL)

                    if(mem.nickname !== null) embed.setDescription(`AKA "${mem.nickname}"`);

                    let roles = [];
                    mem.roles.tap((role) => {
                        if(role.id !== mem.guild.id) {
                            roles.push(role.toString());
                        }
                    });

                    let presence = []

                    if(mem.user.presence.status === 'dnd') {
                        presence.push(`${(mem.user.bot) ? "This bot is" : "They are"} currently set as ${mem.user.presence.status.toUpperCase()}. (Do Not Disturb)`)
                    } else {
                        presence.push(`${(mem.user.bot) ? "This bot is" : "They are"} currently set as ${mem.user.presence.status.toUpperCase()}.`)
                    }

                    if(mem.user.presence.clientStatus !== null) {
                        let msg = [];
                        let client = mem.user.presence.clientStatus;

                        if(client.desktop) {
                            msg.push('desktop');
                        }

                        if(client.mobile) {
                            msg.push('mobile');
                        }

                        if(client.web) {
                            msg.push('a web browser');
                        }

                        if(msg.length === 1) {
                            presence.push(`They are using Discord on ${msg[0]}.`)
                        } else
                        if(msg.length === 2) {
                            presence.push(`They are using Discord on ${msg[0]} and ${msg[1]}.`)
                        } else
                        if(msg.length === 3) {
                            presence.push(`They are using Discord on ${msg[0]}, ${msg[1]}, and ${msg[2]}.`)
                        }
                    }

                    if(mem.user.presence.game !== null) {
                        let game = mem.user.presence.game;
                        let doing = 'playing';

                        if(game.type === 1) {
                            doing = 'streaming'
                        } else
                        if(game.type === 1) {
                            doing = 'listening to'
                        } else
                        if(game.type === 1) {
                            doing = 'watching'
                        } else

                        presence.push(`${(mem.user.bot) ? "This bot is" : "They are"} ${doing} "${game.name}" ${(game.url) ? "at "+game.url : ""}`)
                    }

                    let identity = [
                        `Mention: ${mem.toString()}`,
                        `Discord ID: \`\`\`yaml\n${mem.user.id}\`\`\``
                    ].join('\n');

                    embed.addField('Identification', identity, true)
                    .addField('Account Creation Date', `${mem.user.createdAt.toUTCString()}\n(${timeago.format(mem.user.createdAt)})`, true)
                    .addField('Server Join Date', `${mem.joinedAt.toUTCString()}\n(${timeago.format(mem.joinedAt)})`)
                    .addField('Server Roles', `${(m.channel.type === 'dm') ? "These probably won't show correctly in DMs. Sorry! Blame Discord.\n\n" : ""}${roles.reverse().join(' ')}`)
                    .addField('Status & Activity', presence.join('\n'))
                    

                    m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot, log));
                }
            });
        }
        /*  */
    }
})}
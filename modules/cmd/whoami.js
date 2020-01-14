const path = require(`path`);
const djs = require(`discord.js`);
const timeago = require("timeago.js");
const Command = require(path.resolve(`./core/command.js`))
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    short_desc: `Displays detailed information about yourself.`,
    authlevel: 0,
    tags: ['DM_OPTIONAL', 'BOT_CHANNEL_ONLY', 'INSTANT'],

    run: (m, args, data) => {
        let embed = new djs.RichEmbed()
        .setAuthor(`You are...`, bot.icons.find('ICO_docs'))
        .setColor(bot.cfg.embed.default)
        .setTitle(m.author.tag)
        .setThumbnail(m.author.displayAvatarURL)
        .setFooter(`Your Discord user ID is ${m.author.id}`)

        if(data.member.nickname !== null) {
            embed.setDescription(`AKA "${data.member.nickname}"\nUser Mention: ${data.member.toString()}`)
        } else {
            embed.setDescription(`User Mention: ${data.member.toString()}`)
        }

        let roles = [];
        data.member.roles.tap((role) => {
            if(role.id !== data.member.guild.id) {
                roles.push(role.toString());
            }
        });

        let presence = []

        if(m.author.presence.status === 'offline') {
            presence.push(`You are currently set as ${m.author.presence.status.toUpperCase()}. (Invisible?)`)
        } else
        if(m.author.presence.status === 'dnd') {
            presence.push(`You are currently set as ${m.author.presence.status.toUpperCase()}. (Do Not Disturb)`)
        } else {
            presence.push(`You are currently set as ${m.author.presence.status.toUpperCase()}.`)
        }

        if(m.author.presence.clientStatus !== null) {
            let msg = [];
            let client = m.author.presence.clientStatus;

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
                presence.push(`You are using Discord on ${msg[0]}.`)
            } else
            if(msg.length === 2) {
                presence.push(`You are using Discord on ${msg[0]} and ${msg[1]}.`)
            } else
            if(msg.length === 3) {
                presence.push(`You are using Discord on ${msg[0]}, ${msg[1]}, and ${msg[2]}.`)
            }
        }

        if(m.author.presence.game !== null) {
            let game = m.author.presence.game;
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

            presence.push(`You are ${doing} "${game.name}" ${(game.url) ? 'at '+game.url : ""}`)
        }

        embed.addField('Server Join Date', `${data.member.joinedAt.toUTCString()}\n(${timeago.format(data.member.joinedAt)})`)
        .addField('Account Creation Date', `${m.author.createdAt.toUTCString()}\n(${timeago.format(m.author.createdAt)})`)
        .addField('Server Roles', `${(m.channel.type === 'dm') ? "These probably won't show correctly in DMs. Sorry! Blame Discord.\n\n" : ""}${roles.reverse().join(' ')}`)
        .addField('Status & Activity', presence.join('\n'))

        m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot, log));
    }
})}
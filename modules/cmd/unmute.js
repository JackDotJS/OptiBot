const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const timeago = require("timeago.js");
const Command = require(path.resolve(`./modules/core/command.js`));

const setup = (bot) => { 
    return new Command(bot, {
        name: path.parse(__filename).name,
        aliases: ['ungag', 'unsilence'],
        short_desc: `Unmute a user.`,
        long_desc: `Allows a user to speak once again, if they've already been muted.`,
        args: `<discord member> [reason]`,
        authlvl: 2,
        flags: ['NO_DM', 'LITE'],
        run: func
    });
}

const func = (m, args, data) => {
    const bot = data.bot;
    const log = data.log;

    if(!args[0]) {
        data.cmd.noArgs(m);
    } else {
        bot.util.target(m, args[0], bot, {type: 0, member:data.member}).then((result) => {
            if (!result) {
                bot.util.err('You must specify a valid user to unmute.', bot, {m:m})
            } else
            if (result.type === 'notfound' || result.type === 'id') {
                bot.util.err('Unable to find a user.', bot, {m:m})
            } else
            if (result.id === m.author.id) {
                bot.util.err(`If you're muted, how are you even using this command?`, bot, {m:m})
            } else
            if (result.id === bot.user.id) {
                bot.util.err(`I'm a bot. Why would I even be muted?`, bot, {m:m})
            } else 
            if (bot.getAuthlvl(result.target) > 0) {
                bot.util.err(`That user is too powerful to be muted in the first place.`, bot, {m:m})
            } else 
            if (result.type === 'member' && !result.target.roles.cache.has(bot.cfg.roles.muted)) {
                bot.util.err(`That user has not been muted.`, bot, {m:m})
            } else {
                s2(result);
            }
        });

        function s2(result) {
            let now = new Date().getTime();
            bot.getProfile(result.id, true).then(profile => {

                if(!profile.data.essential.mute) {
                    bot.util.err(`That user has not been muted.`, bot, {m:m});
                    return;
                }

                let reason = m.content.substring( `${bot.prefix}${path.parse(__filename).name} ${args[0]} `.length )

                let remaining = profile.data.essential.mute.end - now;
                let minutes = Math.round(remaining/1000/60)
                let hours = Math.round(remaining/(1000*60*60))
                let days = Math.round(remaining/(1000*60*60*24))
                let time_remaining = null;

                if (minutes < 60) {
                    time_remaining = `${minutes} minute${(minutes !== 1) ? "s" : ""}`;
                } else
                if (hours < 24) {
                    time_remaining = `${hours} hour${(hours !== 1) ? "s" : ""}`;
                } else {
                    time_remaining = `${days} day${(days !== 1) ? "s" : ""}`;
                }

                if(!profile.data.essential.record) profile.data.essential.record = [];

                let entry = new bot.util.RecordEntry()
                .setMod(m.author.id)
                .setURL(m.url)
                .setAction('mute')
                .setActionType('remove')
                .setReason((reason.length > 0) ? reason : `No reason provided.`)
                .setParent(profile.data.essential.mute.caseID)

                if(profile.data.essential.mute.end !== null) {
                    entry.setDetails(`Leftover mute time remaining: ${time_remaining}.`)
                }

                profile.data.essential.record.push(entry.data);

                delete profile.data.essential.mute;

                for(let i in bot.memory.mutes) {
                    if(bot.memory.mutes[i].id === profile.id) {
                        bot.clearTimeout(bot.memory.mutes[i].time);
                        bot.memory.mutes.splice(i, 1);
                        break;
                    }
                }

                bot.updateProfile(result.id, profile).then(() => {
                    let logInfo = () => {
                        let embed = new djs.MessageEmbed()
                        .setColor(bot.cfg.embed.okay)
                        .setAuthor(`User unmuted.`, bot.icons.find('ICO_okay'))
                        .setDescription(`${result.tag} has been unmuted.`)

                        if(reason.length > 0) {
                            embed.addField(`Reason`, reason)
                        } else {
                            embed.addField(`Reason`, `No reason provided. \n(Please use the \`${bot.prefix}addnote\` command.)`)
                        }

                        m.channel.send({embed: embed}).then(bm => bot.util.responder(m.author.id, bm, bot));

                        let logEntry = new bot.util.LogEntry(bot, {channel: "moderation"})
                        .setColor(bot.cfg.embed.default)
                        .setIcon(bot.icons.find('ICO_unmute'))
                        .setTitle(`Member Unmuted`, `Member Mute Removal Report`)
                        .setHeader((reason.length > 0) ? "Reason: "+reason : "No reason provided.")
                        .addSection(`Member Unmuted`, result.target)
                        .addSection(`Moderator Responsible`, m.author)
                        .addSection(`Command Location`, m)

                        if(result.type === 'user') {
                            logEntry.setThumbnail(result.target.displayAvatarURL({format:'png'}))
                        } else
                        if(result.type === 'member') {
                            logEntry.setThumbnail(result.target.user.displayAvatarURL({format:'png'}))
                        }

                        logEntry.submit();
                    }

                    if(result.type === 'member') {
                        result.target.roles.remove(bot.cfg.roles.muted, `Member unmuted by ${m.author.tag}`).then(() => {
                            logInfo();
                        }).catch(err => bot.util.err(err, bot, {m:m}));
                    } else {
                        logInfo();
                    }
                }).catch(err => bot.util.err(err, bot, {m:m}))
            });
        }
    }
}

module.exports = setup;
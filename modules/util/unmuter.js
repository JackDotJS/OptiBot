const djs = require(`discord.js`);

module.exports = (bot, id) => {
    const errHandler = (err, user) => {
        bot.util.err(err, bot);

        let type = null;
        if(user) type = (user.constructor === djs.User) ? 'user' : 'member';

        let logEntry = new bot.util.LogEntry(bot)
        .setColor(bot.cfg.embed.error)
        .setIcon(bot.icons.find('ICO_error'))
        .setTitle(`Member Unmute Failure`, `Member Mute Removal Failure Report`)
        .setHeader(`An error occurred while trying to unmute a user.`)
        .setDescription(`\`\`\`diff\n-${err}\`\`\``)

        if(user) {
            logEntry.addSection(`Member`, (type === "user") ? user : user.user)
            .setThumbnail(((type === "user") ? user : user.user).displayAvatarURL({format:'png'}))
        } else {
            logEntry.addSection(`Member`, `Unknown. (Error occurred before or during fetch operation)`)
        }

        logEntry.submit("moderation");
    }

    bot.guilds.cache.get(bot.cfg.guilds.optifine).members.fetch(id).then(mem => {
        removeRole(mem);
    }).catch(err => {
        if (err.stack.match(/invalid or uncached|unknown member|unknown user/i)) {
            bot.users.fetch(id).then(user => {
                removeRole(user);
            }).catch(err => {
                errHandler(err);
            });
        } else {
            errHandler(err);
        }
    });

    function removeRole(user) {
        if(user.constructor === djs.User) {
            removeProfileData(user, 'user');
        } else {
            user.roles.remove(bot.cfg.roles.muted, `Mute period expired.`).then(() => {
                removeProfileData(user, 'member');
            }).catch(err => {
                errHandler(err, user);
            });
        }
    }

    function removeProfileData(user, type) {
        bot.getProfile(id, false).then(profile => {
            if(profile) {
                let entry = new bot.util.RecordEntry()
                .setMod(bot.user.id)
                .setAction('mute')
                .setActionType('remove')
                .setReason(`Mute period expired.`)
                .setParent(profile.data.essential.mute.caseID)

                if(!profile.data.essential.record) profile.data.essential.record = [];
                profile.data.essential.record.push(entry.data);

                delete profile.data.essential.mute

                bot.updateProfile(id, profile).then(() => {
                    finish(user, type);
                }).catch(err => {
                    errHandler(err, user);
                });
            } else {
                finish(user, type);
            }
        }).catch(err => {
            errHandler(err, user);
        });
    }

    function finish(user, type) {
        for(let i = 0; i < bot.memory.mutes.length; i++) {
            let mute = bot.memory.mutes[i];
            if(mute.id === id) {
                bot.memory.mutes.splice(i, 1);
            }
        }

        let logEntry = new bot.util.LogEntry(bot)
            .setColor(bot.cfg.embed.default)
            .setIcon(bot.icons.find('ICO_unmute'))
            .setTitle(`Member Unmuted`, `Member Mute Removal Report`)
            .setHeader(`Reason: Mute period expired.`)
            .addSection(`Member Unmuted`, (type === "user") ? user : user.user)
            .setThumbnail(((type === "user") ? user : user.user).displayAvatarURL({format:'png'}))
            .submit("moderation");
    }
}
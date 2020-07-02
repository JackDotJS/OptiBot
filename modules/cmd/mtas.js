const path = require(`path`);
const djs = require(`discord.js`);
const timeago = require("timeago.js");
const { Command, OBUtil, Memory } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    aliases: ['risklvl'],
    short_desc: `Member Threat Advisory System`,
    long_desc: `Measures or sets the risk level of a given member.`,
    args: `<discord member> [opt:calc | opt:set <number:level>]`,
    authlvl: 5,
    flags: ['NO_DM', 'MOD_CHANNEL_ONLY'],
    run: null
}


metadata.run = (m, args, data) => {
    if(!args[0]) {
        OBUtil.missingArgs(m, metadata);
    } else {
        OBUtil.parseTarget(m, 0, args[0], data.member).then((result) => {
            if(!result) {
                OBUtil.err('You must specify a valid user.', {m:m});
            } else
            if(result.type === 'notfound') {
                OBUtil.err('Unable to find a valid user.', {m:m});
            } else {
                let id = (result.type === 'id') ? result.target : result.target.id;
                let name = (result.type === 'id') ? id : result.target.user.tag;
                let create = ((args[1] && args[1].toLowerCase() === 'set') || (args[1] && args[1].toLowerCase() === 'calc'));

                OBUtil.getProfile(id, create).then(profile => {
                    if(args[1] && args[1].toLowerCase() === 'set') {
                        let num = parseFloat(args[2]);
                        
                        if(data.authlvl < 2) {
                            OBUtil.err(`You're not strong enough to access this part of the command.`, {m:m})
                        } else
                        if(result.type !== 'id' && OBUtil.getAuthlvl(result.target.id) > data.authlvl) {
                            OBUtil.err(`You're not strong enough to modify this user.`, {m:m})
                        } else
                        if(isNaN(num)) {
                            OBUtil.err(`You must specify a valid number.`, {m:m})
                        } else 
                        if(num > 10) {
                            OBUtil.err('Risk level cannot be greater than 10.', {m:m});
                        } else
                        if(num < 0) {
                            OBUtil.err('Risk level cannot be less than 0.', {m:m});
                        } else {
                            profile.edata.risk = {
                                level: num.toFixed(2),
                                date: new Date().getTime(),
                                accurate: null,
                                manual: true,
                                author: m.author.id
                            };

                            OBUtil.updateProfile(profile).then(() => {
                                let embed = new djs.MessageEmbed()
                                .setAuthor(`Profile updated.`, bot.icons.find('ICO_okay'))
                                .setColor(bot.cfg.embed.okay)
                                .setDescription(`The risk factor of ${name} is now ${num.toFixed(2)}.`);

                                m.channel.send({embed: embed}).then(bm => OBUtil.afterSend(bm, m.author.id))
                            }).catch(err => {
                                OBUtil.err(err, {m:m});
                            });
                        }
                    } else 
                    if (args[1] && args[1].toLowerCase() === 'calc') {
                        if(!profile) {
                            if(result.type === 'id') {
                                let embed = OBUtil.err('This user does not exist, or is no longer in the server.')
                                .setDescription('There is not enough data to calculate a risk level for this user. To manually set a risk level for this user, please specify.')

                                m.channel.send({embed: embed}).then(bm => OBUtil.afterSend(bm, m.author.id));
                            } else {
                                calculate();
                            }
                        } else {
                            calculate(profile);
                        }
                    } else
                    if (profile && profile.edata.risk) {
                        let risk = profile.edata.risk;

                        let msg = [
                            `The risk factor of <@${id}> is **${risk.level}** as of ${new Date(risk.date).toUTCString()} (${timeago.format(risk.date)}).`
                        ]

                        if(risk.manual) msg.push(`This number was set manually by <@${risk.author}>.`)

                        if(typeof risk.accurate === 'boolean') {
                            if(!risk.accurate) msg.push(`This number may be inaccurate due to missing information.`)
                        }

                        let embed = new djs.MessageEmbed()
                        .setAuthor(`Member Threat Advisory System`, bot.icons.find('ICO_warn'))
                        .setColor(bot.cfg.embed.default)
                        .setDescription(msg.join('\n'));

                        m.channel.send({embed: embed}).then(bm => OBUtil.afterSend(bm, m.author.id))
                    } else {
                        let embed = OBUtil.err(`${name} has not yet been evaluated.`)
                        .setDescription(`See \`${bot.prefix}help ${metadata.name}\` for more information.`)

                        m.channel.send({embed: embed}).then(bm => OBUtil.afterSend(bm, m.author.id));
                    }
                }).catch(err => {
                    OBUtil.err(err, {m:m});
                });

                function calculate(profile) {
                    let reducedAccuracy = (result.type === 'id');
                    let score = 0;
                    let factors = [];

                    function addScore(num) {
                        log(`old score: ${score}`);
                        score += (Math.max(1, Math.min(num, 10)) / 10) * (10-score);
                        log(`new score: ${score}`);
                    }

                    if(profile) {
                        if(profile.edata.record) {
                            for(let i = 0; i<profile.edata.record.length; i++) {
                                let entry = profile.edata.record[i];
                                let thisScore = 0;

                                if(entry.actionType !== -1) {
                                    switch(entry.action) {
                                        case 0:
                                            thisScore = 0.1 // notes
                                            break;
                                        case 1:
                                            thisScore = 0.5 // warnings
                                            break;
                                        case 2:
                                            thisScore = 1 // mutes
                                            break;
                                        case 3:
                                            thisScore = 3.3 // kicks
                                            break;
                                        case 4:
                                            thisScore = 5 // bans
                                            break;
                                    }

                                    let daysSince = (new Date().getTime() - entry.date) / (1000 * 60 * 60 * 24);

                                    addScore(Math.max((thisScore * 0.25), Math.min((thisScore / daysSince), thisScore)))
                                }

                                if(i+1 >= profile.edata.record.length) {
                                    calc2();
                                }
                            }
                        } else {
                            calc2();
                        }
                    } else {
                        calc2();
                    }

                    function calc2() {
                        if(result.type === 'id') {
                            final();
                        } else {
                            let mem = result.target;
                            let daysSinceJoin = null;
                            let daysSinceCreation = (new Date().getTime() - mem.user.createdTimestamp) / (1000 * 60 * 60 * 24);
                            log(`days since creation: ${daysSinceCreation}`);
                            log(new Date().getTime() - mem.user.createdTimestamp);

                            if(mem.joinedTimestamp !== null) {
                                // add score depending on time since joined server
                                daysSinceJoin = (new Date().getTime() - mem.joinedTimestamp) / (1000 * 60 * 60 * 24);
                                log(`days since join: ${daysSinceJoin}`);

                                factors.push('serverJoinDate');
                                addScore(Math.min((5 / (daysSinceJoin * 7)), 5));
                            }

                            if(mem.user.avatarURL() === null) {
                                // default avatar
                                factors.push('defaultAvatar');
                                addScore(5);
                            }
                            
                            // add score depending on account age
                            factors.push('accountAge');
                            addScore(Math.min((5 / (daysSinceCreation * 7)), 5));

                            if(daysSinceJoin !== null) {
                                if((daysSinceCreation - daysSinceJoin) <= 1) {
                                    // account created on or near same day of joining server
                                    factors.push('differenceAccountAgeAndServerJoin');
                                    addScore(5)
                                }
                            }
                            
                            if(mem.roles.cache.size > 0) {
                                // divide score by number of roles
                                factors.push('roles');
                                score = score / mem.roles.cache.size;
                            }
                            

                            // todo: username/nickname stuff
                            final();
                        }
                    }

                    function final() {
                        profile.edata.risk = {
                            level: score.toFixed(2),
                            date: new Date().getTime(),
                            accurate: !reducedAccuracy,
                            manual: false,
                            author: null
                        }

                        OBUtil.updateProfile(profile).then(() => {
                            let embed = new djs.MessageEmbed()
                            .setAuthor(`Member Threat Advisory System`, bot.icons.find('ICO_warn'))
                            .setTitle(`The risk factor of ${name} is ${score.toFixed(2)}.`)
                            .setColor(bot.cfg.embed.default)

                            if(reducedAccuracy) {
                                embed.setDescription(`**Warning:** This number may NOT be accurate due to missing significant information.`)
                            }

                            m.channel.send({embed: embed}).then(bm => OBUtil.afterSend(bm, m.author.id))
                        }).catch(err => {
                            OBUtil.err(err, {m:m});
                        });

                        

                        //m.channel.send(`Risk Level: ${score.toFixed(2)}\nReduced Accuracy: ${reducedAccuracy}\nFactors: ${factors.join(', ')}`).then(bm => OBUtil.afterSend(bm, m.author.id))
                    }
                }
            }
        }).catch(err => {
            OBUtil.err(err, {m:m});
        });
    }
}

module.exports = new Command(metadata);
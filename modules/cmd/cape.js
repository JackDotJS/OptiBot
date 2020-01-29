const path = require(`path`);
const util = require('util');
const djs = require(`discord.js`);
const jimp = require('jimp');
const request = require('request');
const Command = require(path.resolve(`./modules/core/command.js`));
const errMsg = require(path.resolve(`./modules/util/simpleError.js`));
const msgFinalizer = require(path.resolve(`./modules/util/msgFinalizer.js`));
const targetUser = require(path.resolve(`./modules/util/targetUser.js`));

module.exports = (bot, log) => { return new Command(bot, {
    name: path.parse(__filename).name,
    short_desc: `Donator cape viewer`,
    usage: `<minecraft username|discord user>`,
    authlevel: 0,
    tags: ['DM_OPTIONAL', 'BOT_CHANNEL_ONLY'],

    run: (m, args, data) => {
        if(!args[0]) {
            let embed = new djs.RichEmbed()
            .setAuthor(`Usage:`, bot.icons.find('ICO_info'))
            .setDescription(`\`\`\`${data.cmd.metadata.usage}\`\`\``)
            .setColor(bot.cfg.embed.default);

            m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot, log));
        } else {
            targetUser(m, args[0], bot, log, data).then((result) => {
                if(!result || result.type === 'notfound') {
                    getMCname();
                } else {
                    let id = (result.type === 'id') ? result.target : result.target.user.id;

                    bot.getProfile(id, false).then(profile => {
                        if(!profile) {
                            getMCname();
                        } else
                        if(profile.data.cape) {
                            getMCname(profile.data.cape.uuid);
                        } else {
                            let embed = new djs.RichEmbed()
                            .setAuthor(`${(result.type === 'id') ? result.target : result.target.user.tag} does not have a verified cape on their profile.`, bot.icons.find('ICO_error'))
                            .setColor(bot.cfg.embed.error)
                
                            m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot, log));
                        }
                    });
                }
            });

            function getMCname(uuid) {
                if(uuid) {
                    request({ url: `https://api.mojang.com/user/profiles/${uuid}/names`, encoding: null }, (err, res, data) => {
                        if (err || !res || !data || [200, 204].indexOf(res.statusCode) === -1) {
                            throw new Error('Failed to get a response from the Mojang API.')
                        } else
                        if (res.statusCode === 204) {
                            throw new Error('Failed to get Minecraft UUID from the Mojang API.')
                        } else {
                            let dp = JSON.parse(data);
                            let dataNormalized = {
                                name: dp[dp.length - 1]["name"],
                                id: profile.cape.uuid
                            }
                            getCape(dataNormalized);
                        }
                    });
                } else
                if (args[0].match(/\W+/) !== null) {
                    let embed = new djs.RichEmbed()
                    .setAuthor(`Minecraft usernames can only contain letters, numbers, and underscores (_)`, bot.icons.find('ICO_error'))
                    .setColor(bot.cfg.embed.error)
        
                    m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot, log));
                } else
                if (args[0].length > 16) {
                    let embed = new djs.RichEmbed()
                    .setAuthor(`Minecraft usernames cannot exceed 16 characters in length.`, bot.icons.find('ICO_error'))
                    .setColor(bot.cfg.embed.error)
        
                    m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot, log));
                } else {
                    request({ url: 'https://api.mojang.com/users/profiles/minecraft/' + args[0], encoding: null }, (err, res, data) => {
                        if (err || !res || !data || [200, 204].indexOf(res.statusCode) === -1) {
                            throw new Error('Failed to get a response from the Mojang API');
                        } else
                        if (res.statusCode === 204) {
                            let embed = new djs.RichEmbed()
                            .setColor(bot.cfg.embed.error)
                            .setAuthor(`Player "${args[0]}" does not exist.`, bot.icons.find('ICO_error'))
                            .setFooter('Maybe check your spelling?');

                            m.channel.send({ embed: embed }).then(bm => msgFinalizer(m.author.id, bm, bot, log));
                        } else {
                            getCape(JSON.parse(data));
                        }
                    });
                }
            }

            function getCape(player) {
                log(util.inspect(player));

                if(bot.cfg.uuidFilter.indexOf(player.id) > -1) {
                    let embed = new djs.RichEmbed()
                    .setColor(bot.cfg.embed.error)
                    .setAuthor(`Sorry, this player's cape has been blacklisted.`, bot.icons.find('ICO_error'))

                    m.channel.send({ embed: embed }).then(bm => msgFinalizer(m.author.id, bm, bot, log));
                    return;
                }

                request({ url: 'https://optifine.net/capes/' + player.name + '.png', encoding: null }, (err, res, data) => {
                    if (err || !res || !data || [200, 404].indexOf(res.statusCode) === -1) {
                        new Error('Failed to get a response from the OptiFine API')
                    } else
                    if (res.statusCode === 404) {
                        let embed = new djs.RichEmbed()
                        .setAuthor(`Player "${player.name}" does not have an OptiFine cape.`, bot.icons.find('ICO_error'))
                        .setColor(bot.cfg.embed.error)
            
                        m.channel.send({embed: embed}).then(bm => msgFinalizer(m.author.id, bm, bot, log));
                    } else {
                        jimp.read(data, (err, image) => {
                            if (err) {
                                throw err;
                            } else {
                                let full = false;
                                let fallback = false;
                                if (args[1] && args[1].toLowerCase() === 'full' && image.bitmap.width <= 92) {
                                    full = true;
                                    image.resize(276, jimp.AUTO, jimp.RESIZE_NEAREST_NEIGHBOR);
                                    finalize(image);
                                } else
                                if(image.bitmap.width > 92) {
                                    fallback = true;
                                    finalize(image);
                                } else
                                if (jimp.intToRGBA(image.getPixelColor(1, 1)).a !== 0) {
                                    // standard capes
                                    let elytra = image.clone();
                                    let cape = image.clone();

                                    cape.crop(1, 1, 10, 16);
                                    elytra.crop(36, 2, 10, 20);

                                    new jimp(21, 20, (err, image_s2) => {
                                        if (err) {
                                            throw err
                                        } else {
                                            image_s2.composite(cape, 0, 0);
                                            image_s2.composite(elytra, 11, 0);
                                            image_s2.resize(jimp.AUTO, 200, jimp.RESIZE_NEAREST_NEIGHBOR);

                                            finalize(image_s2);
                                        }
                                    });
                                } else {
                                    // banner capes
                                    let elytra = image.clone();
                                    let cape = image.clone();

                                    cape.crop(2, 2, 20, 32);
                                    elytra.crop(72, 4, 20, 40);

                                    new jimp(42, 40, (err, image_s2) => {
                                        if (err) {
                                            throw err
                                        } else {
                                            image_s2.composite(cape, 0, 0);
                                            image_s2.composite(elytra, 22, 0);
                                            image_s2.resize(jimp.AUTO, 200, jimp.RESIZE_NEAREST_NEIGHBOR);

                                            finalize(image_s2);
                                        }
                                    });
                                }

                                function finalize(image_p) {
                                    image_p.getBuffer(jimp.AUTO, (err, imgFinal) => {
                                        if (err) throw err
                                        else {
                                            let embed = new djs.RichEmbed()
                                            .setColor(bot.cfg.embed.default)
                                            .attachFile(new djs.Attachment(imgFinal, "cape.png"))
                                            .setImage('attachment://cape.png')
                                            .setFooter('IGN: ' + player.name);

                                            let desc = "";

                                            bot.db.profiles.find({ "data.cape.uuid": player.id }, (err, dbdocs) => {
                                                if (err) throw err;
                                                else {
                                                    if (dbdocs.length !== 0) {
                                                        desc += '<:okay:642112445997121536> Cape owned by <@' + dbdocs[0].userid + '>\n\n';
                                                    }
                                                    if (fallback && (!args[1] || (args[1] && args[1].toLowerCase() !== 'full'))) {
                                                        desc += `This image could not be cropped because the cape texture has an unusual resolution.`;
                                                    }

                                                    if (full || fallback) {
                                                        embed.setAuthor('Donator Cape (Full Texture)', bot.icons.find('ICO_cape'));
                                                    } else {
                                                        embed.setAuthor('Donator Cape', bot.icons.find('ICO_cape'));
                                                    }

                                                    if (desc.length > 0) {
                                                        embed.setDescription(desc);
                                                    }

                                                    m.channel.send({ embed: embed }).then(bm => msgFinalizer(m.author.id, bm, bot, log));
                                                }
                                            });
                                        }
                                    });
                                }
                            }
                        });
                    }
                });
            }
        }
    }
})}
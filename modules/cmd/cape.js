const path = require(`path`);
const util = require('util');
const djs = require(`discord.js`);
const jimp = require('jimp');
const request = require('request');
const Command = require(path.resolve(`./modules/core/command.js`));
const erm = require(path.resolve(`./modules/util/simpleError.js`));
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
            data.cmd.noArgs(m);
        } else {
            targetUser(m, args[0], bot, data).then((result) => {
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
                            erm(`${(result.type === 'id') ? result.target : result.target.user.tag} does not have a verified cape on their profile.`, bot, {m:m})
                        }
                    });
                }
            });

            function getMCname(uuid) {
                if(uuid) {
                    request({ url: `https://api.mojang.com/user/profiles/${uuid}/names`, encoding: null }, (err, res, data) => {
                        if (err || !res || !data || [200, 204].indexOf(res.statusCode) === -1) {
                            erm(err || new Error('Failed to get a response from the Mojang API.'), bot, {m:m})
                        } else
                        if (res.statusCode === 204) {
                            erm(new Error('Failed to get Minecraft UUID from the Mojang API.'), bot, {m:m})
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
                    erm(`Minecraft usernames can only contain letters, numbers, and underscores (_)`, bot, {m:m})
                } else
                if (args[0].length > 16) {
                    erm(`Minecraft usernames cannot exceed 16 characters in length.`, bot, {m:m})
                } else {
                    request({ url: 'https://api.mojang.com/users/profiles/minecraft/' + args[0], encoding: null }, (err, res, data) => {
                        if (err || !res || !data || [200, 204].indexOf(res.statusCode) === -1) {
                            erm(err || new Error('Failed to get a response from the Mojang API'), bot, {m:m})
                        } else
                        if (res.statusCode === 204) {
                            let embed = erm(`Player "${args[0]}" does not exist.`, bot)
                            .setDescription('Maybe check your spelling?');

                            m.channel.send({ embed: embed }).then(bm => msgFinalizer(m.author.id, bm, bot));
                        } else {
                            getCape(JSON.parse(data));
                        }
                    });
                }
            }

            function getCape(player) {
                log(util.inspect(player));

                // TODO: this whole image processing really needs some optimization and reworking to account for HD custom capes.

                if(bot.cfg.uuidFilter.indexOf(player.id) > -1) {
                    erm(`Sorry, this player's cape has been blacklisted.`, bot, {m:m})
                    return;
                }

                request({ url: 'https://optifine.net/capes/' + player.name + '.png', encoding: null }, (err, res, data) => {
                    if (err || !res || !data || [200, 404].indexOf(res.statusCode) === -1) {
                        erm(err || new Error('Failed to get a response from the OptiFine API'), bot, {m:m})
                    } else
                    if (res.statusCode === 404) {
                        erm(`Player "${player.name}" does not have an OptiFine cape.`, bot, {m:m})
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
                                            let embed = new djs.MessageEmbed()
                                            .setColor(bot.cfg.embed.default)
                                            .attachFiles([new djs.MessageAttachment(imgFinal, "cape.png")])
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

                                                    m.channel.send({ embed: embed }).then(bm => msgFinalizer(m.author.id, bm, bot));
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
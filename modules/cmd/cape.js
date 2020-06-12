const path = require(`path`);
const util = require('util');
const djs = require(`discord.js`);
const Jimp = require('jimp');
const request = require('request');
const Command = require(path.resolve(`./modules/core/command.js`));

const setup = (bot) => { 
    return new Command(bot, {
        name: path.parse(__filename).name,
        aliases: ['cloak', 'elytra'],
        short_desc: `Show off an OptiFine donator cape.`,
        long_desc: `Displays a given user's OptiFine cape and elytra, assuming they've donated and have their cape activated.`,
        args: `<minecraft username | discord member>`,
        authlvl: 0,
        flags: ['DM_OPTIONAL', 'BOT_CHANNEL_ONLY', 'LITE'],
        run: func
    })
}

const func = (m, args, data) => {
    const bot = data.bot;
    const log = data.log;

    if(!args[0]) {
        data.cmd.noArgs(m);
    } else {
        bot.util.target(m, args[0], bot, {type: 0, member:data.member}).then((result) => {
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
                        bot.util.err(`${(result.type === 'id') ? result.target : result.target.user.tag} does not have a verified cape on their profile.`, bot, {m:m})
                    }
                });
            }
        });

        function getMCname(uuid) {
            if(uuid) {
                request({ url: `https://api.mojang.com/user/profiles/${uuid}/names`, encoding: null }, (err, res, data) => {
                    if (err || !res || !data || [200, 204].indexOf(res.statusCode) === -1) {
                        bot.util.err(err || new Error('Failed to get a response from the Mojang API.'), bot, {m:m})
                    } else
                    if (res.statusCode === 204) {
                        bot.util.err(new Error('Failed to get Minecraft UUID from the Mojang API.'), bot, {m:m})
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
                bot.util.err(`Minecraft usernames can only contain letters, numbers, and underscores (_)`, bot, {m:m})
            } else
            if (args[0].length > 16) {
                bot.util.err(`Minecraft usernames cannot exceed 16 characters in length.`, bot, {m:m})
            } else {
                request({ url: 'https://api.mojang.com/users/profiles/minecraft/' + args[0], encoding: null }, (err, res, data) => {
                    if (err || !res || !data || [200, 204].indexOf(res.statusCode) === -1) {
                        bot.util.err(err || new Error('Failed to get a response from the Mojang API'), bot, {m:m})
                    } else
                    if (res.statusCode === 204) {
                        let embed = bot.util.err(`Player "${args[0]}" does not exist.`, bot)
                        .setDescription('Maybe check your spelling?');

                        m.channel.send({ embed: embed }).then(bm => bot.util.responder(m.author.id, bm, bot));
                    } else {
                        getCape(JSON.parse(data));
                    }
                });
            }
        }

        function getCape(player) {
            log(util.inspect(player));

            if(bot.cfg.uuidFilter.indexOf(player.id) > -1) {
                bot.util.err(`Sorry, this player's cape has been blacklisted.`, bot, {m:m});
            } else {
                request({ url: 'https://optifine.net/capes/' + player.name + '.png', encoding: null }, (err, res, data) => {
                if (err || !res || !data || [200, 404].indexOf(res.statusCode) === -1) {
                    bot.util.err(err || new Error('Failed to get a response from the OptiFine API'), bot, {m:m})
                } else
                if (res.statusCode === 404) {
                    bot.util.err(`Player "${player.name}" does not have an OptiFine cape.`, bot, {m:m})
                } else {
                    processCape(data, player);
                }
            });
            }
        }

        function processCape(capeTex, player) {
            Jimp.read(capeTex, (err, image) => {
                if (err) {
                    bot.util.err(err, bot, {m:m})
                } else 
                if(args[1] && args[1].toLowerCase() === 'full') {
                    imageData.type = 'full';

                    final(imageData, player);
                } else
                if(Math.round(image.bitmap.width / image.bitmap.height) !== 2) {
                    log(`Unknown cape resolution: ${player.name}`, 'warn');
                    imageData.type = 'default';

                    final(imageData, player);
                } else {
                    let imageData = {
                        jimp: image,
                        type: null
                    }

                    let baseW = 46;
                    let baseH = 22;

                    // cape cropping
                    let cc = {
                        x: null,
                        y: null,
                        w: null,
                        h: null
                    }

                    // elytra cropping
                    let ec = {
                        x: null,
                        y: null,
                        w: null,
                        h: null
                    }

                    let scanHeight = Math.floor((image.bitmap.height / 10) * 3);
                    let scanRoot = Math.ceil(image.bitmap.height - scanHeight);
                    let colored = 0;

                    image.scan(0, scanRoot, image.bitmap.width, scanHeight, (x, y, idx) => {
                        if(image.bitmap.data[idx+3] > 5) {
                            colored++;
                        }
                    });

                    if(colored < 5) {
                        baseW = 64;
                        baseH = 32;
                    };

                    cc.x = image.bitmap.width / baseW;
                    cc.y = image.bitmap.height / baseH;
                    cc.w = cc.x * 10;
                    cc.h = cc.y * 16;

                    ec.x = (image.bitmap.width / baseW) * 36;
                    ec.y = (image.bitmap.height / baseH) * 2;
                    ec.w = (image.bitmap.width / baseW) * 10;
                    ec.h = (image.bitmap.height / baseH) * 20;

                    let cape = image.clone().crop(cc.x, cc.y, cc.w, cc.h);
                    let elytra = image.clone().crop(ec.x, ec.y, ec.w, ec.h);

                    new Jimp((image.bitmap.width / baseW) * 21, (image.bitmap.height / baseH) * 20, (err, full) => {
                        if(err) {
                            bot.util.err(err, bot, {m:m})
                        } else {
                            let filterMode = (full.bitmap.width < 256) ? Jimp.RESIZE_NEAREST_NEIGHBOR : Jimp.RESIZE_BEZIER;
                            
                            full.blit(cape, 0, 0)
                            .blit(elytra, (image.bitmap.width / baseW) * 11, 0)
                            .resize(Jimp.AUTO, 256, filterMode);

                            imageData.jimp = full;
                            imageData.type = 'cropped';

                            final(imageData, player);
                        }
                    });
                }
            });
        }

        function final(image, player) {
            image.jimp.getBuffer(Jimp.AUTO, (err, img) => {
                if (err) {
                    bot.util.err(err, bot, {m:m})
                } else {
                    let embed = new djs.MessageEmbed()
                    .setColor(bot.cfg.embed.default)
                    .attachFiles([new djs.MessageAttachment(img, "cape.png")])
                    .setImage('attachment://cape.png')
                    .setFooter('IGN: ' + player.name);

                    let desc = [];

                    bot.db.profiles.find({ "data.cape.uuid": player.id }, (err, docs) => {
                        if (err) {
                            bot.util.err(err, bot, {m:m})
                        } else {
                            if (docs.length !== 0) {
                                desc.push(`<:okay:642112445997121536> Cape owned by <@${docs[0].userid}>`);
                            }
                            if (image.type === 'default') {
                                desc.push(`This image could not be cropped because the cape texture has an unusual resolution.`);
                            }

                            if (image.type !== 'cropped') {
                                embed.setAuthor('Donator Cape (Full Texture)', bot.icons.find('ICO_cape'));
                            } else {
                                embed.setAuthor('Donator Cape', bot.icons.find('ICO_cape'));
                            }

                            if (desc.length > 0) {
                                embed.setDescription(desc.join('\n\n'));
                            }

                            m.channel.send({ embed: embed }).then(bm => bot.util.responder(m.author.id, bm, bot));
                        }
                    });
                }
            });
        }
    }
}

module.exports = setup;
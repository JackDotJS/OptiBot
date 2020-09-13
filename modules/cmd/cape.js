const path = require(`path`);
const util = require('util');
const djs = require(`discord.js`);
const Jimp = require('jimp');
const request = require('request');
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    aliases: ['cloak', 'elytra'],
    short_desc: `Show off an OptiFine donator cape.`,
    long_desc: `Displays a given user's OptiFine cape and elytra, assuming they've donated and have their cape activated.`,
    args: `<minecraft username | discord member>`,
    authlvl: 0,
    flags: ['DM_OPTIONAL', 'BOT_CHANNEL_ONLY', 'LITE'],
    run: null
}

metadata.run = (m, args, data) => {

    let capeOwner

    if(!args[0]) {
        OBUtil.missingArgs(m, metadata);
    } else {
        OBUtil.parseTarget(m, 0, args[0], data.member).then((result) => {
            if(!result || result.type === 'notfound') {
                getMCname();
            } else {
                OBUtil.getProfile(result.id, false).then(profile => {
                    if(!profile) {
                        getMCname();
                    } else
                    if(profile.ndata.cape) {
                        getMCname(profile.ndata.cape.uuid, profile.id);
                    } else {
                        OBUtil.err(`${result.tag} does not have a verified cape on their profile.`, {m:m})
                    }
                });
            }
        });

        function getMCname(uuid, discord) {
            if(uuid) {
                request({ url: `https://api.mojang.com/user/profiles/${uuid}/names`, encoding: null }, (err, res, data) => {
                    if (err || !res || !data || [200, 204].indexOf(res.statusCode) === -1) {
                        OBUtil.err(err || new Error('Failed to get a response from the Mojang API.'), {m:m})
                    } else
                    if (res.statusCode === 204) {
                        OBUtil.err(new Error('Failed to get Minecraft UUID from the Mojang API.'), {m:m})
                    } else {
                        let dp = JSON.parse(data);
                        let dataNormalized = {
                            name: dp[dp.length - 1]["name"],
                            id: uuid
                        }
                        getCape(dataNormalized, discord);
                    }
                });
            } else
            if (args[0].match(/\W+/) !== null) {
                OBUtil.err(`Minecraft usernames can only contain letters, numbers, and underscores (_)`, {m:m})
            } else
            if (args[0].length > 16) {
                OBUtil.err(`Minecraft usernames cannot exceed 16 characters in length.`, {m:m})
            } else {
                request({ url: 'https://api.mojang.com/users/profiles/minecraft/' + args[0], encoding: null }, (err, res, data) => {
                    if (err || !res || !data || [200, 204].indexOf(res.statusCode) === -1) {
                        OBUtil.err(err || new Error('Failed to get a response from the Mojang API'), {m:m})
                    } else
                    if (res.statusCode === 204) {
                        let embed = OBUtil.err(`Player "${args[0]}" does not exist.`)
                        .setDescription('Maybe check your spelling?');

                        m.channel.send({ embed: embed }).then(bm => OBUtil.afterSend(bm, m.author.id));
                    } else {
                        getCape(JSON.parse(data));
                    }
                });
            }
        }

        function getCape(player, discord) {
            log(util.inspect(player));

            request({ url: 'https://optifine.net/capes/' + player.name + '.png', encoding: null }, (err, res, data) => {
                if (err || !res || !data || [200, 404].indexOf(res.statusCode) === -1) {
                    OBUtil.err(err || new Error('Failed to get a response from the OptiFine API'), {m:m})
                } else
                if (res.statusCode === 404) {
                    OBUtil.err(`Player "${player.name}" does not have an OptiFine cape.`, {m:m})
                } else {
                    processCape(data, player, discord);
                }
            });

            // todo: create filters system (#111)
            /* if(bot.cfg.uuidFilter.indexOf(player.id) > -1) {
                OBUtil.err(`Sorry, this player's cape has been blacklisted.`, {m:m});
            } else {
                
            } */
        }

        function processCape(capeTex, player, discord) {
            Jimp.read(capeTex, (err, image) => {
                if (err) {
                    OBUtil.err(err, {m:m})
                } else 
                if(args[1] && args[1].toLowerCase() === 'full') {
                    imageData.type = 'full';

                    final(imageData, player, discord);
                } else
                if(Math.round(image.bitmap.width / image.bitmap.height) !== 2) {
                    log(`Unknown cape resolution: ${player.name}`, 'warn');
                    imageData.type = 'default';

                    final(imageData, player, discord);
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
                            OBUtil.err(err, {m:m})
                        } else {
                            let filterMode = (full.bitmap.width < 256) ? Jimp.RESIZE_NEAREST_NEIGHBOR : Jimp.RESIZE_BEZIER;
                            
                            full.blit(cape, 0, 0)
                            .blit(elytra, (image.bitmap.width / baseW) * 11, 0)
                            .resize(Jimp.AUTO, 256, filterMode);

                            imageData.jimp = full;
                            imageData.type = 'cropped';

                            final(imageData, player, discord);
                        }
                    });
                }
            });
        }

        function final(image, player, discord) {
            image.jimp.getBuffer(Jimp.AUTO, (err, img) => {
                if (err) return OBUtil.err(err, {m:m});

                let embed = new djs.MessageEmbed()
                .setColor(bot.cfg.embed.default)
                .attachFiles([new djs.MessageAttachment(img, "cape.png")])
                .setImage('attachment://cape.png')
                .setTitle(djs.Util.escapeMarkdown(player.name))
                .setURL(`https://namemc.com/profile/${player.name}`)

                if (image.type !== 'cropped') {
                    embed.setAuthor('OptiFine Donator Cape (Full Texture)', Assets.getEmoji('ICO_cape').url);
                } else {
                    embed.setAuthor('OptiFine Donator Cape', Assets.getEmoji('ICO_cape').url);
                }

                if (discord) embed.setDescription(`<:okay:642112445997121536> Cape owned by <@${discord}>`);
                if (image.type === 'default') embed.setFooter(`This image could not be cropped because the cape texture has an unusual resolution.`);

                m.channel.send({ embed: embed }).then(bm => OBUtil.afterSend(bm, m.author.id));
            });
        }
    }
}

module.exports = new Command(metadata);
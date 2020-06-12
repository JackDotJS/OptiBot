const djs = require(`discord.js`);

// do NOT use setAuthor() or setFooter()
// these are added automatically when used with the !faq command.

module.exports = (bot) => {
    return [
        // general
        {
            type: 0,
            title: `General`,
            files: [new djs.MessageAttachment(bot.images.find('IMG_head_faq_general.png'), 'category.png')]
        },
        {
            type: 1,
            kw: [`release date`, `release`, `when its done`, `when is it done`, `whens it gonna be done`, `when will it be out`, `when will it be finished`, `eta`, `estimated release`, `release estimate`, `whens optifine coming out`, `whens it coming out`, `whens the update dropping`, `whens the update gonna be done`, `whens the update gonna finish`, `whys it taking so long`, `why is the update taking so long`, `whys it taking forever to update`],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle(`When is [x] gonna be done!?!?!?!`)
            .setDescription(`When it's done. Things take time, and there will never be an official estimate on any OptiFine-related project.`)
        },
        {
            type: 1,
            kw: [`download preview`, `download alpha version`, `download beta version`, `download preview version`, `download alpha`, `download beta`, `download unstable`, `unstable version`, `get preview`, `get preview version`],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle(`Where can I get preview versions?`)
            .setDescription(`Head to https://optifine.net/downloads, and click on "Preview versions" at the top.`)
        },
        {
            type: 1,
            kw: [`download button missing`, `cant download`, `unable to download`, `no download button`, `missing download button`, `empty page`, `empty download page`, `blank download page`, `download glitched`, `download glitch`],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle(`I'm trying to download OptiFine, and the download button won't show. What do I do?`)
            .setDescription(`This is usually caused by ad-blockers. Temporarily disable yours, or switch to ~~the arguably superior~~ uBlock Origin: https://github.com/gorhill/uBlock#installation`)
        },
        {
            type: 1,
            kw: [`snapshots`, `optifine on snapshots`, `snapshot versions`, `minecraft snapshots`],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle(`Does OptiFine work on snapshots?`)
            .setDescription(`No. OptiFine does not get developed for snapshot versions of Minecraft, and there are no plans to do so.`)
        },
        {
            type: 1,
            kw: [`bedrock`, `pocket edition`, `bedrock edition`, `windows 10 edition`, `windows 10`],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle(`How do I use OptiFine on Minecraft: Bedrock/Pocket Edition?`)
            .setDescription(`You cannot. OptiFine is purely a Minecraft: Java edition mod. Anything that claims to be OptiFine for Bedrock/Pocket Edition is completely fraudulent, and may even be malware. Be careful of what you're downloading.`)
        },
        {
            type: 1,
            kw: [`what do the two numbers for fps mean`, `2 numbers fps`, `minimum fps`, `average fps`],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle(`Why are there two numbers for FPS?`)
            .setDescription(`OptiFine changes the FPS counter to display the both the average *and* minimum FPS, where vanilla only shows the average. This gives a much more accurate representation of your games performance, since the minimum framerate reflects how smooth the game might actually feel to play.`)
        },
        {
            type: 1,
            kw: [`vsync`, `turn on vsync`, `vsync option`, `enable vsync`, `activate vsync`, `vertical sync`, `v-sync`],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle(`How do I enable V-Sync?`)
            .setDescription(`In Video Settings, drag the "Max Framerate" slider all the way to the left.`)
        },
        {
            type: 1,
            kw: [`discord activity`, `discord overlay`, `discord status`, `game status`, `discord game detection`],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle(`Why doesn't Discord detect Minecraft when using OptiFine?`)
            .setDescription([
                `To be completely honest, we don't know. However, you *can* try this as a workaround:`,
                ``,
                `1) Make sure the game is currently open and running. `,
                `2) Open the settings menu in Discord, and head to the "Game Activity" tab.`,
                `3) Click "Add it!" underneath the box labeled "No game detected."`,
                `4) Select "Minecraft \`[version]\`"`,
                `5) Click "Add game" and you're done!`,
                ``,
                `**WARNING: Do NOT enable Discord overlay.**`,
                `For some reason, this is absolutely guaranteed to crash your game when OptiFine is installed. Again, we don't know why.`,
                ``,
                `Also, there's a chance this whole workaround won't work for you at all. We *still* don't know why. Sorry.`
            ].join('\n'))
        },
        {
            type: 1,
            kw: [`mcp`, `mod coder pack`],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle(`What is MCP?`)
            .setDescription([
                `Mod Coder Pack, or MCP, is a tool that helps to decompile and recompile Minecraft. This allows a majority of mods to exist, including Forge and OptiFine. For details, you can check out these links:`,
                ``,
                `https://technical-minecraft.fandom.com/wiki/MCP`,
                `https://minecraft.gamepedia.com/Programs_and_editors/Mod_Coder_Pack`
            ].join('\n'))
        },
        {
            type: 1,
            kw: [`mojang mappings`, `minecraft mappings`, `official mappings`, `official minecraft mappings`, `official mojang mappings`],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle(`Why does OptiFine still use MCP as opposed to the new official Mojang mappings?`)
            .setDescription([
                `The Mojang mappings are officially stated as being for "internal, reference purposes" and are completely unclear as to how they can be used. As such, many major Minecraft mod entities like Forge, Fabric, and of course OptiFine are all staying away from using these mappings at all until this issue is resolved by Mojang's legal team.`,
                ``,
                `For more information, check out this article written by [@cpw](https://twitter.com/voxcpw): https://cpw.github.io/MinecraftMappingData`
            ].join('\n'))
        },
        {
            type: 1,
            kw: [`open source`, `why doesnt sp614x have a team`, `source code`, `why doesnt the dev get more people to help`, `why arent there more people working on optifine`, `why is there only one dev`, `why is there only one guy working on the mod`, `why isnt there more people on the dev team`],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle(`Why isn't OptiFine open-source?`)
            .setDescription([
                `The core of OptiFine consists of many, various changes to Minecraft's rendering code. Rather than simple patches, these are significant reorganizations. This means publishing the full source code of OptiFine would be a direct violation of Minecraft's EULA. Technically, it would be possible to extract the actual changes as patches, which can then be published to GitHub as source code. However, there are a number of issues with this idea. First, OptiFine is built on a custom version of Mod Coder Pack. This non-standard version of MCP is used to allow OptiFine to start development on new versions of the game much, much earlier. During this time, official MCP mappings are either completely missing, or otherwise very unstable. Unfortunately, according to the MCP license and Terms of Usage, modified versions of MCP scripts are not allowed to be distributed. This means that, even if OptiFine patches were released, nobody else would be able to collaborate on the code, defeating the entire purpose of going open-source. Even if somehow *all of that* was solved, this would still mean significantly changing how OptiFine development is handled. <@202558206495555585> does not work on the mod using patches, which means he would have to either merge the patches manually, or completely change his entire workflow to use patches. Changing the development process like this would not be a trivial task in the slightest.`,
                ``,
                `In summary, due to a *multitude* of legal and technical complications, <@202558206495555585> cannot make OptiFine open-source.`
            ].join('\n'))
        },
        {
            type: 1,
            kw: [`what if the dev quits`, `what if sp614x quits`, `what if optifine stops updating`, `dev quits`, `quit development`, `development ends`, `death of optifine`, `what if optifine dies`, `dev disappears`, `sp614x disappears`, `developer quits`, `developer disappears`, `developer quits working on optifine`, `dev stops working on optifine`, `dev stops working`],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle(`Since OptiFine isn't open-source, what happens if the developer disappears, or just gives up and quits?`)
            .setDescription([
                `First of all, we hope it never happens. Regardless, if it ever comes down to it, Java programs are not difficult to decompile. If <@202558206495555585> ever went missing, virtually anyone with the right knowledge could decompile OptiFine in its entirety, compare it to decompiled vanilla Minecraft code, and extract the patches.`,
                ``,
                `Alternatively, if <@202558206495555585> ever decides to quit, he is willing to publish OptiFine's patches to GitHub. With that said, there are currently no plans to stop OptiFine development. Either way, OptiFine can live again.`
            ].join('\n'))
        },
        {
            type: 1,
            kw: [`mojang buying optifine`, `why isnt optifine part of minecraft`, `optifine in vanilla`],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle(`Why hasn't Mojang adopted OptiFine as an official part of the game?`)
            .setDescription([`The original story most people know of is that Mojang *did* try to buy OptiFine, but they did not want the entirety of the mod, which lead to the deal falling through.`,
                ``,
                `The reality is that Mojang and Microsoft cannot accept the modifications OptiFine has made, due to a legal policy held between both Mojang and Microsoft that does not allow for external code to be accepted outside of their internal development team. Therefore, there's nothing that OptiFine could do to get it added into vanilla Minecraft. It has nothing to do with the zoom or shader features that most people think is the reason this never happened. Really, it's a matter of legal policies that cannot be bypassed.`
            ].join('\n'))
        },
        // donation stuff
        {
            type: 0,
            title: `Donations & Capes`,
            files: [new djs.MessageAttachment(bot.images.find('IMG_head_faq_donations.png'), 'category.png')]
        },
        {
            type: 1,
            kw: [`change email`, `update optifine email`, `update email`, `change optifine email`, `change donator email`, `change donation email`, `update donator email`],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle(`How do I change my donation E-mail?`)
            .setDescription(`Unfortunately, it is not possible to change donation E-mails. We don't know if this functionality will be added in the future.`)
        },
        {
            type: 1,
            kw: [`changing username`, `change username`, `change minecraft username`, `move optifine cape to new username`, `new username`],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle(`Will I have to move my cape if I change my Minecraft username?`)
            .setDescription(`Usually, no. OptiFine will update your username automatically, but this process may take up to 24 hours. If you need the cape sooner, you can move it manually at https://optifine.net/login`)
        },
        {
            type: 1,
            kw: [`custom cape`, `custom optifine cape`, `custom image cape`, `upload cape texture`, `upload image cape`, `upload cape`],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle(`How do I get a fully custom OptiFine cape?`)
            .setDescription([
                `You cannot, for various reasons:`,
                ``,
                `• Minecon capes.`,
                `• Mojang staff capes.`,
                `• Any other vanilla Minecraft cape.`,
                `• Pornography.`,
                `• Offensive imagery.`,
                `• Shocking or disturbing imagery.`,
                ``,
                `Custom capes for everyone would require some form of moderation to prevent these types of capes being uploaded and used. Given how many people have donator capes, and how many would likely start submitting the type of garbage listed above, this is simply and completely unrealistic.`,
                ``,
                `In addition, you might be aware that there are already a few custom capes in existence. These capes were only gifted to a very small number of people for very specific, individual reasons. Please do not ask for one yourself. <@202558206495555585> himself has stated that he will not be adding any more custom capes.`
            ].join('\n'))
        },
        {
            type: 1,
            kw: [`stolen cape`, `cape stolen`, `cape was stolen`],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle(`My cape was stolen! What do I do?`)
            .setDescription(`**Scan your computer, and change your passwords IMMEDIATELY. In that order.** This should at least include your E-mail account, your Minecraft/Mojang account, and your OptiFine account. **Again, in that order.** All of this is to ensure no strangers have access to any of your relevant accounts. After the passwords have been updated, and you are absolutely certain that nobody else has unauthorized access to your sensitive data, you can log-in at https://optifine.net/login. From here, simply update the username for the cape in question. You may have to wait 24 hours before the cape can be moved again.`)
        },
        {
            type: 1,
            kw: [`cape not showing`, `cape not working`, `invisible cape`, `cant see cape`, `cape not visible`, `cape disappeared`, `why is my cloak gone`, `why is my layer not show`, `my layer is not seen by me`],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle(`Why isn't my cape showing up in-game?`)
            .setDescription([
                `There are several reasons that your cape may not display in-game.`,
                ``,
                `1) **You have capes hidden.**`,
                `Check that capes are enabled in options:`,
                `\`\`\`Skin Customization... > Cape: ON\`\`\``,
                `\`\`\`Video Settings... > Details... > Show Capes: ON\`\`\``,
                `2) **Your cape has not been activated.**`,
                `Capes are an optional reward for donating to OptiFine. If you did not elect to have a cape activated when initially donating, you can still activate your cape at any time. Log-in at https://optifine.net/login and simply click "Activate Cape" in the "Username" column of the "Donations" section.`,
                ``,
                `3) **Your donation is still being processed.**`,
                `If you've recently donated, in some cases it may take up to several days before your cape is activated. Please contact <@202558206495555585> if you do not receive your cape after some time has passed.`,
                ``,
                `4) **You recently changed your Minecraft username.**`,
                `Use this command for details: \`${bot.prefix}faq changing username\``,
                ``,
                `5) **Your cape has been stolen.**`,
                `Use this command for details: \`${bot.prefix}faq stolen cape\``,
                ``,
                `If you still cannot see your cape at this point, there is a very slim chance that your internet service provider may be caching certain things "for your convenience." There have been a small number of cases where this was the issue, and the only solution was to temporarily switch to a mobile network. The cape should reappear on the original network within a few days.`
            ].join('\n'))
        },
        // compatibility
        {
            type: 0,
            title: `Compatibility`,
            files: [new djs.MessageAttachment(bot.images.find('IMG_head_faq_compat.png'), 'category.png')]
        },
        {
            type: 1,
            kw: [`install optifine on new version`],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle(`Can I force OptiFine to install on a different, newer version of Minecraft?`)
            .setDescription(`No. Each version of OptiFine is specifically developed for a single version of the game. Even if you *somehow* managed to force install OptiFine on a different version, it would more than likely crash immediately or at the VERY least have a multitude of bugs and other issues.`)
        },
        {
            type: 1,
            kw: [`cracked launcher`, `third-party launcher`, `multimc launcher`, `piracy`, `pirated version`, `twitch launcher`],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle(`Why won't OptiFine work on my cracked/custom/third-party launcher?`)
            .setDescription([
                `Your mileage will vary when using anything other than the official Mojang launcher.`,
                ``,
                `For users with cracked/pirated launchers, we will not help you. Buy the game first.`
            ].join('\n'))
        },
        {
            type: 1,
            kw: [`forge crash`, `forge crashing`, `optifine and forge`, `forge`, `forge compatibility`],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle(`Why can't I use OptiFine with Forge?`)
            .setDescription([
                `Normally, you should. Most versions of OptiFine are compatible with Forge. However, you must use a specific version of the modloader. You can find which version of Forge you need to use by checking the OptiFine changelogs, which can be found next to the download links on https://optifine.net/downloads.`,
                ``,
                `Please note that *some* versions of OptiFine are NOT compatible with Forge at all. This includes most versions between 1.13-1.14.4. Again, check the changelogs before trying to use Forge.`
            ].join('\n'))
        },
        {
            type: 1,
            kw: [`fabric`, `fabric api`, `optifabric`, `fabric loader`, `fabric modloader`, `using fabric`, `fabric support`],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle(`Is OptiFine compatible with Fabric?`)
            .setDescription(`Officially, no. OptiFine does not plan to add native support for Fabric like it does for Forge. However, there is a third-party mod that adds compatibility for OptiFine on Fabric. You can check it out here: https://www.curseforge.com/minecraft/mc-mods/optifabric`)
        },
        // shaders
        {
            type: 0,
            title: `Shaders`,
            files: [new djs.MessageAttachment(bot.images.find('IMG_head_faq_shaders.png'), 'category.png')]
        },
        {
            type: 1,
            kw: [`internal shaders`, `internal`, `default shaders`, `internal shader pack`],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle(`What are "internal" shaders?`)
            .setDescription(`"Internal" shaders enable OptiFine's shader pipeline and extended vertex format without actually loading any shader programs (or "packs"). This can be used to test if the shader pipeline works at all on your system, or they can be used to "disable" shaders without having to reload significant resources.`)
        },
        {
            type: 1,
            kw: [`rtx`, `rtx on`, `nvidia rtx`, `20 series`, `20 series cards`, `rtx 20`, `rtx shader`, `rtx shader packs`],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle(`Do shaders support NVIDIA RTX?`)
            .setDescription([
                `No, and for the foreseeable future, they will not. NVIDIA RTX is a very new technology, and unfortunately, the version of OpenGL that Minecraft runs on is too outdated to use it. While some shader packs are developing some form of path tracing (such as SEUS PTGI), this should not be mistaken for RTX technology.`,
                ``,
                `To be clear, this does NOT mean RTX cards cannot run shaders at all. This only means that shaders cannot utilize the new RT cores found in the 20-series graphics cards.`
            ].join('\n'))
        },
        {
            type: 1,
            kw: [`install shaders standalone`, `standalone shaders`, `only shaders`],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle(`Can I use shaders without OptiFine?`)
            .setDescription(`No. Currently, OptiFine is the only known mod that provides support for shader packs. Unfortunately, the original Shaders Mod no longer seems to be available to download.`)
        },
        // meta, discord server stuff
        {
            type: 0,
            title: `Discord Server`,
            files: [new djs.MessageAttachment(bot.images.find('IMG_head_faq_discord.png'), 'category.png')]
        },
        {
            type: 1,
            kw: [`donator role`, `get donator role`, `request donator role`],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle(`How do I get the Donator role?`)
            .setDescription(`DM this bot with the following command for detailed instructions: \`${bot.prefix}help dr\``)
        },
        {
            type: 1,
            kw: [`shader developer`, `shader dev`, `texture artist`, `texture role`, `mod dev`, `mod developer`, `mod developer role`, `shader developer role`, `texture artist role`, `request roles`, `get roles`],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle(`How do I get the Shader Developer/Texture Artist/Mod Developer role?`)
            .setDescription([
                `These roles are given to users that show proficiency in their given field. If you feel you qualify for one or more of these roles, simply ask any online moderator for assistance. You can summon a moderator with this command: \`${bot.prefix}modping\``,
                ``,
                `To speed things along, you should include the shader pack/resource pack/mod you've created or contributed to. This would usually be downloads links that include screenshots and proof of your contribution.`
            ].join('\n'))
        }
    ]
}
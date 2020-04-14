const djs = require(`discord.js`);

// do NOT use setAuthor() or setFooter()
// these are added automatically when used with the !policy command.

module.exports = (bot) => {
    return [
        {
            type: 0,
            title: 'Introduction (Start here!)',
            files: [new djs.MessageAttachment(bot.images.find('IMG_head_intro.png'), 'header.png')]
        },
        {
            type: 1,
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle(`Welcome to the OptiFine Discord Moderation team!`)
            .setDescription(`Our goal is simple: Provide the best possible experience for all members of our community. By joining our team, you can now further aid us in this endeavor! We're excited to have you here, and we hope to see how you perform in moderating soon.\n\nAdditionally, you now have access to our moderator-only server. You can join via this link: https://discord.gg/MFM7qQ7\n\nBefore diving into moderation duties, please be sure to read these policies to completion at LEAST once. Keep in mind that these can, and *will* change. It's only natural that, as our server grows, we too should evolve to moderate it effectively as we move into the future. Finally, remember this: **Moderation is volunteer work.** It's a labor of love, and nothing more.`)
            .addField('Information for Jr. Moderators', `As a <@&644668061818945557>, you do not have complete access to all moderation tools during your evaluation period. For now, you are limited to OptiBot's built-in moderation utilities. You can find exactly which tools you have access to by using this command: \`${bot.prefix}list jrmod\``)
        },
        {
            type: 1,
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.error)
            .setTitle(`Warning`)
            .setDescription(`Due to the current state of OptiBot's development, these policies are going to mention some bot commands that **likely do not work. At all.** For details, please contact <@181214529340833792>. Thank you.`)
        },
        {
            type: 0,
            title: 'Moderator Code of Conduct',
            files: [new djs.MessageAttachment(bot.images.find('IMG_head_coc.png'), 'header.png')]
        },
        {
            type: 1,
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle('Follow Moderation Policy (duh)')
            .setDescription(`It's easy to say "just use common sense", but what we consider common can greatly differ between people. As such, the following policies have been put in place to help all of us moderate the server effectively and consistently. Of course, there are a few obvious cases were policy can be skipped entirely (such as some guy trying to spam @everyone), but otherwise please avoid doing this whenever possible.`)
        },
        {
            type: 1,
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle('Follow the Rules (also duh)')
            .setDescription(`Becoming a moderator does not mean you are above the law and magically exempt from our server rules. Set a good example for other members and follow the rules at all times.`)
        },
        {
            type: 1,
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle('Remain Unbiased')
            .setDescription(`Thanks to this weird thing called "being human" and having "emotions", it's naturally impossible to remain neutral in every situation. Try to consult with other moderators when at all possible.`)
        },
        {
            type: 1,
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle('Know Your Tools')
            .setDescription(`As a moderator, you have access to a few tools provided directly by Discord: Kicking and banning. You can also mute and deafen people in voice channels. In addition, we have our own Discord bot. <@468582311370162176> allows us to perform even more moderation actions, such as giving warnings, muting users in text chat, and more. You can view all moderator-only commands by typing \`${bot.prefix}list mod\`, and you can view detailed information on a specific command with \`${bot.prefix}help <command>\``)
        },
        {
            type: 1,
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle(`Review Before Acting`)
            .setDescription(`If at all possible, be sure to review these policies before acting as a moderator. For quick references, you can view and search individual policies with the \`${bot.prefix}policy\` command.`)
        },
        {
            type: 1,
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle(`Don't Overwhelm Yourself!`)
            .setDescription(`If you're the only moderator online and you have something important to do in real life, *please feel free to leave.* Once again, moderating is nothing more than a community service, and you are not obligated to sit here and oversee the chat 24 hours a day. While we appreciate the enthusiasm, please don't sacrifice your own well-being for the sake of our server!`)
        },
        {
            type: 0,
            title: 'Staff Assignments',
            files: [new djs.MessageAttachment(bot.images.find('IMG_head_assign.png'), 'header.png')]
        },
        {
            type: 1,
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle(`<@663122057818537995>`)
            .setDescription(`Administrators`)
        },
        {
            type: 0,
            title: 'Violation Policies',
            files: [new djs.MessageAttachment(bot.images.find('IMG_head_policies.png'), 'header.png')]
        },
        {
            type: 2,
            title: `Rule 1) Be respectful and civilized`,
            kw: ['rule 1', 'keep discussions friendly, respectful, and (above all) civil', 'be respectful and civilized', 'friendly', 'respectful', 'civil', 'civilized', 'toxicity', 'insults', 'defamation', 'slander', 'harassment', 'degradation', 'slurs', 'racial slurs', 'racism', 'nword', 'flaming', 'flame war', 'hate speech', 'homophobia', 'transphobia'],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle('Rule #1 | Be respectful and civilized')
            .setDescription(`The internet is, unfortunately, quite a toxic place when you really look at it. Masked with anonymity, we tend to show our true colors. As moderators, we must attempt to combat this norm and try to create a clean, friendly environment for our members. This especially goes for our new members. As much as we hate having to deal with the new guy, remember that we were all there at one point, starting from the bottom. All our members should aim to be patient and supportive of each other.\n\nThe following is not allowed:\n\n　• Trolling\n　• Insults\n　• Defamation/Slander\n　• Harassment\n　• Degradation\n　• Racial slurs (including "soft n-words")\n　• Flaming/Flame wars\n　• Hate speech\n　• Homophobia, Transphobia, etc`)
            .addField('Policy', `Depending on the severity, members are to be warned or temporarily muted for up to 48 hours. Repeat offenders (3+ violations) are to be permanently muted.`)
        },
        {
            type: 2,
            title: `Rule 2) No Prohibited Content`,
            kw: ['rule 2', 'no prohibited content', 'prohibited content', 'restricted content', 'nsfw', 'nsfl', 'piracy', 'offensive content', 'nazism', 'questionable content', 'disturbing content', 'shocking content', 'gore', 'confidential info', 'confidential', 'personal info', 'personal information', 'politics', 'religion', 'controversial issues', 'cracks', 'cracking', 'flashing gifs', 'animated pics'],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle('Rule #2 | No Prohibited Content')
            .setDescription(`The following content is NOT allowed in the slightest. Items marked with an underline come directly from Discord's Terms of Service. (see rule 3)\n\n　• Bigotry, Nazism, and other offensive content.\n　• Fast, seizure-inducing, flashing animated pictures.\n　• Politics, religion, and other controversial issues.\n　• __Pornographic, questionable, and other NSFW content.__**\\***\n　• __Disturbing or shocking NSFL content.__\n　• __Confidential and personal information__\n　• __Cracks, piracy, and other illegal content.__\n　• __Viruses and malware__\n　• __Hacks, cheats and exploits for video games.__\n\nThese restrictions apply to **all things visible in chat.** This means all discussions, images, links, profile pictures, nicknames, etc.\n\n**\\***NSFW is against TOS when displayed without an age gate. (marked NSFW channel)`)
            .addField('Policy', `Offending content should be deleted immediately, if at all possible. Users who join the server solely to post this kind of content are to be banned. All others are up to your discretion as a moderator.`)
        },
        {
            type: 2,
            title: `Rule 3) Discord Terms of Service`,
            kw: ['rule 3', 'discord terms of service & community guidelines', 'tos', 'community guidelines', 'discord', 'discord rules', 'trust and safety'],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle('Rule #3 | Discord Terms of Service & Community Guidelines')
            .setDescription(`**THIS IS IMPORTANT.** Discord's own rules are to be strictly enforced AT ALL TIMES. Failure to do so may result in complete removal of our server, and maybe even deletion of our own accounts. Many of our own server rules mimic Discord's rules already, so there's not much else to go over. Regardless, you can read these rules here:\n\n**[Discord Terms of Service](https://discordapp.com/terms) | [Discord Community Guidelines](https://discordapp.com/guidelines)**\n\nIn summary, excluding everything already mentioned so far, the following is strictly forbidden:\n\n　• Users under the age of 13 years old. (Unfortunately, we do not have a way to verify anyone's age. If some guy says they're 9 years old or something, we just have to assume they're serious.)\n　• Organization of community raids.\n　• Evading server bans and user blocks.\n\nDiscord reserves the right to update their terms at any time. It may be in your best interest to read the terms via their own websites linked above, rather than reading this summary. Regardless, we'll try our best to keep this policy as up-to-date as possible for everyone's convenience.`)
            .addField('Policy', `Any user found to be in direct violation of the Discord TOS or Community Guidelines MUST be banned immediately without exception. These users must also be reported to Discord Trust & Safety, which can be done here: https://dis.gd/request`)
        },
        {
            type: 2,
            title: `Rule 4) No Spamming`,
            kw: ['rule 4', 'no spamming', 'spam', 'spamming', 'mass ping', 'wall of text'],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle('Rule #4 | No Spamming')
            .setDescription(`Examples of spam includes, but is not limited to:\n\n　• Messages that only contain random, arbitrary characters.\n　• Posting the same type of message over and over and over and over.\n　• Mass pinging users or roles for no legitimate reason.\n　• Large walls of text that do not contribute to real discussions. (copypastas for example)`)
            .addField('Policy', `Depending on the severity, members are to be warned or temporarily muted for up to 24 hours upon violation of this rule. Users that join for the sole purpose of mass spam are to be permanently muted.`)
        },
        {
            type: 2,
            title: `Rule 5) No Advertising`,
            kw: ['rule 5', 'no advertising', 'ads', 'advertising', 'invite links'],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle('Rule #5 | No Advertising')
            .setDescription(`Advertising of any kind is generally forbidden. **The only permanent exceptions to this rule are Resource Packs, Shader Packs, and other Minecraft Mods.** Moderators may grant special permission for a user to advertise, under the following conditions: \n\n1. The advertisement must be approved by at least 3 separate moderators, including yourself.\n2. The advertisement MUST comply with all other server rules. \n\nIf you yourself wish to advertise something, you must also follow these terms. **You do not automatically have permission to advertise something as a moderator!**\n\nExamples of advertising includes, but is not limited to:\n\n　• Unsolicited Discord server invite links\n　• Referral links\n　• Unwanted social media profile/channel links\n\n**Be sure to also consider context.** Generally, most advertisements are posted at random, but if someone posts a link that is relevant to the active conversation, you may consider allowing it.`)
            .addField('Policy', `Users who join the server solely to advertise are to be permanently muted. If a user is found to be advertising in people’s DMs, this can be escalated to a ban. All others without permission should be given warnings. Repeat offenders (2+ violations) are to be permanently muted. **All unauthorized advertisements should be deleted immediately.**`)
        },
        {
            type: 2,
            title: `Rule 6) Stay on-topic`,
            kw: ['rule 6', 'keep topics to their appropriate channels', 'stay on-topic', 'offtopic', 'inappropriate channel', 'wrong channel', 'wrong topic', 'move discussion'],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle('Rule #6 | Stay on-topic')
            .setDescription(`This is a fairly simple one. All users should keep discussions to the specified channel at all times. If a topic starts changing from the one specified by the current channel, politely tell the users to move the conversation to the appropriate channel. If the conversation has not moved or returned to the current channel topic within ~10 messages after your request, any remaining active participants of the conversation are in violation of this rule.`)
            .addField('Policy', `Members are to be warned or temporarily muted for up to 24 hours. Repeat offenders (3+ violations) are to be permanently muted.`)
        },
        {
            type: 2,
            title: `Rule 7) No begging`,
            kw: ['rule 7', 'do not beg for capes', 'no begging', 'begging', 'free cape', 'asking for cape', 'capes', 'asking for free stuff', 'free stuff', 'nagging', 'give me stuff', 'giveaway'],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle('Rule #7 | No begging')
            .setDescription(`This isn't a giveaway server. If someone *wants* to give stuff away on their own, that's fine. However, *asking* people to give stuff away is absolutely *not* fine.\n\nIn the case of Donator capes, these are supposed to be a gift given to users who donate $10 to OptiFine's development. As such, not only is begging for a cape just plain pathetic (come on... it's *$10*), but also somewhat disrespectful to the developer.`)
            .addField('Policy', `Depending on the severity, users are to be warned or temporarily muted for up to 24 hours upon violation of this rule. Repeat offenders (3+ violations) can be permanently muted.`)
        },
        {
            type: 2,
            title: `Rule 8) Speak English`,
            kw: ['rule 8', 'speak english', 'english', 'foreign language', 'language', 'translate', 'translation', 'translator'],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle('Rule #8 | Speak English')
            .setDescription(`This is an English-speaking server (incase you haven't noticed). Most of us moderators fluently speak this language, and for some of us, it's the *only* language we know. As such, when someone starts speaking a different language, it can make moderation difficult or even outright impossible. To help with this issue, we have the \`${bot.prefix}translate\` command. However, this is not a permanent solution, and we must (politely) ask all users to speak English themselves. This can be easily done with an online translator, such as https://www.deepl.com/translator or https://translate.google.com/`)
            .addField('Policy', `First, users are to be told to speak English, and to use a translator if necessary. Failing to cooporate, users are to be warned or temporarily muted for up to 24 hours upon violation of this rule.`)
        },
        {
            type: 2,
            title: `*Rule 9) No reselling of capes*`,
            kw: ['rule 9', 'cape reselling', 'cape selling', 'selling capes', 'reselling capes', 'cape scam'],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.error)
            .setTitle('Rule #9 | No reselling of capes')
            .setDescription(`Notice that this rule has a red-colored embed. This is a hidden rule, and should be considered **confidential information** due to the very nature of cape reselling. Explanation further down.\n\nIn a way, this rule is partially an extension of rules #5 and #7. While begging for a cape at least implies donating again to give a new cape for someone, *reselling* a cape guarantees that absolutely NO money to being given to the developer. It's just borderline insulting.\n\nOn the other hand, capes sold via third parties often come from hacked/compromised Minecraft accounts. To quote <@202558206495555585> himself... \n> the biggest problem is that capes very often come from hacked MC accounts. there are bots that constantly try to hack accounts with weak passwords. the hacked accounts are put in a database and the account price depends on name length, has vanilla cape, has OF cape, and so on\n\nTo top it all off, capes can always be transferred back to the original owner simply by logging in to the website at https://optifine.net/login. This makes it insanely easy to make simple scams out of cape reselling. As such, we want to minimize public knowledge of this idea as much as possible. This is for the sake of everyone’s security, and to prevent more people from getting the idea of trying this scam for themselves.`)
            .addField('Policy', `Users in violation of this rule are to be temporarily muted for up to 7 days, or otherwise banned permanently. If asked for an explanation by any non-moderator, call it advertising. Just like rule #5, **advertisements for cape reselling are to be deleted immediately.**`)
        },
        {
            type: 2,
            title: `OptiBot (Mis)usage`,
            kw: ['optibot usage', 'bot usage', 'optibot', 'bot'],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle('OptiBot (Mis)usage')
            .setDescription(`While we have a channel dedicated solely for bot commands, OptiBot is mainly designed to be used in regular discussions, as a utility for various things. This includes referencing OptiFine documentation, displaying an <#531622141393764352> entry, and much more.`)
            .addField('Policy', `OptiBot commands are not *strictly* limited to <#626843115650547743>, but generally any bot usage that is not relevant to any active conversation should be kept to this channel. Members who fail to do so may be in violation of rules #4 and/or #6.`)
        },
        {
            type: 2,
            title: `Memes & Reaction Images`,
            kw: ['memes, shitposts, & reaction images', 'memes', 'shitposts', 'shitposting', 'reaction images'],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle('Memes, Shitposts, & Reaction Images')
            .setDescription(`Here comes *that* part of moderation. Sigh.\n\nAs ridiculous as it sounds, dealing with memes is an incredibly delicate task. Outright banning memes will almost guarantee either a dead server, or outrage followed by protests, riots and pitchforks, and overall just a messy disaster on all fronts. To keep everyone happy, we’ve created a single channel that is dedicated to this content: <#584850909725458503>. Now memes can no longer interrupt actual conversations, and people can still enjoy funny pictures or whatever. Everyone’s happy.\n\nReaction images are slightly different. These images are allowed, if they meet the following conditions:\n\n1. They are *clearly* being used in the context of reacting to something.\n2. They are NOT being excessively posted. (2-3 or more of these types of images in a row.)`)
            .addField('Policy', `To keep everything clean and organized, memes are to be kept to the <#584850909725458503> channel at ALL times. This type of content is not allowed in any other channel, not even <#426005631997181963>. Reactions images are allowed as long as they’re used in the context of a reaction, and not being posted repetitively. Members who fail to follow are in violation of rules #4 and/or #6.`)
        },
        {
            type: 0,
            title: 'Other Policies',
            files: [new djs.MessageAttachment(bot.images.find('IMG_head_other.png'), 'header.png')]
        },
        {
            type: 2,
            title: `Mini-Modding & Member Rewards`,
            kw: ['mini-modding', 'awards', 'rewards', 'good behaviour', 'following rules'],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle('Mini-Modding & Member Rewards')
            .setDescription(`We have no rules against mini-modding and, in fact, we encourage it (to an extent). Any member who is seen promoting good behaviour should be given a medal.\n\n...No, literally.`)
            .addField('Policy', `Any user who does a good deed, or consistently encourages positive behaviour can be awarded with medals. This can be done by any moderator by simply adding a 🏅 reaction emoji to the user's message. Alternatively, you can use the \`${bot.prefix}award\` command.`)
        },
        {
            type: 2,
            title: `Assigning Member Roles`,
            kw: ['roles', 'assigning member roles', 'member roles', 'rank', 'texture artist', 'shader developer', 'mod developer'],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle('Member Roles')
            .setDescription(`We have a select number of roles that can be granted to any user that meet the specified requirements.\n\n**<@&423836695301980171>**\nUser must have decent knowledge of various features and functions of Resource Packs, including (and especially) the additional features provided by OptiFine. The user must also have created or otherwise contributed towards a publicly available Resource Pack.\\*\n\n**<@&423834274601369601>**\nUser must have a decent knowledge of the inner workings of Shader Packs and how to effectively write GLSL code. User must also have created or otherwise contributed towards a publicly available Shader Pack.\\*\n\n**<@&423839066631569408>**\nUser must have decent knowledge of Minecraft mod development, the internal workings of Minecraft source code, and how to effectively write Java code. User must also have created or otherwise contributed towards a publicly available Minecraft mod.\\*\n\n\\*Publicly available refers to the item in question being available for download on places such as Curseforge, Planet Minecraft, Minecraft Forums, a Discord server, GitHub, etc...\n\nNote that all other roles cannot be granted by moderators, and must be acquired via different methods. For example, users can only gain the <@&424169541346525194> role by using the OptiBot command \`${bot.prefix}dr\` via DM.`)
            .addField('Policy', `Any user may request any of these roles, granted they meet the specified requirements. Users can, of course, also request multiple roles at once.`)
        },
        {
            type: 2,
            title: `Donator Cape Verification`,
            kw: ['cape verification', 'cv', 'verify cape'],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle('Donator Cape Verification')
            .setDescription(`An excerpt from our own <#531622141393764352>: \n> A verified cape is simply an **optional** cosmetic enhancement for viewing donator capes via the \`${bot.prefix}cape\` command. Having a verified cape makes it possible for anyone to view your cape without having to know your Minecraft username, by using either an @mention or user ID in place of the username. Additionally, upon viewing a verified cape, the owner's Discord username is prominently displayed at the top of the message.`)
            .addField('Policy', `Any user, including those without the <@&424169541346525194> role, may request cape verification. However, the user in question MUST first verify their identity by linking their Discord account to their Minecraft username via this website: https://namemc.com`)
        },
        {
            type: 2,
            title: `Ban Appeals`,
            kw: ['unbanning', 'revoke ban', 'ban removal', 'unban', 'removing ban', 'ban appeal', 'appeal ban', 'lift ban', 'ban lifting'],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle('Member Ban Appeals')
            .setDescription(`Ban appeals can be done via this online form: https://forms.gle/kqMKzeBxzm29pWku8\n\nOnce a ban appeal is recieved, it must be approved by no less than 4 different moderators. Ideally, votes should be given at least 2-3 days to be processed, given time zones and moderator activity. Once an appeal is approved, the user in question should be contacted as soon as possible. **Do not unban the user without doing the following:**`)
            .addField('Policy', `Any user may request to have their ban lifted, granted they have not violated the Discord Terms of Service, Discord Community Guidelines, or rule #9. If you've been privately contacted by a banned user, simply redirect them to the form linked above.`)
        },
        {
            type: 2,
            title: `Server Changes & Voting`,
            kw: ['policy updates', 'rule updates', 'updating rules', 'updating policies', 'changing rules', 'changing policies', 'voting'],
            embed: new djs.MessageEmbed()
            .setColor(bot.cfg.embed.default)
            .setTitle('Server Changes & Voting')
            .setDescription(`This server is by no means a dictatorship. Voting is crucial to keeping a balance in our moderation, especially when it comes to making major changes in *how* we moderate.`)
            .addField('Policy', `If a change is deemed necessary for just about anything (server rules, policies, etc), start a discussion and vote in the <#467073441904984074> channel. Be sure to give these things time, as not all of us are online and available at the same time.`)
        }
    ]
}
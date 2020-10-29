//const djs
//const bot

// do NOT use setAuthor() or setFooter()
// these are added automatically when used with the !policy command.

// use "title" property to denote new sections or subsections. must be a string
// use "files" property to denote major sections with header images. this will require a bit of actual knowledge of how optibot works internally, so if you need a header, it'd be better to just write a comment.


// all entries with a "title" property AND "files" property are marked as new, major sections.
// all entries with only a "title" property are marked as subsections.
// both will appear in the "index" embed(s) at the end of the policies channel.
// entries that do not have either properties will still work and be posted as normal, but will not appear in the index.

// entries with the "kw" (keyword) property are sorta marked as "searchable" and can be retrieved with the !policy command.
// this property must be an array of strings. each string is simply a way to match a query to the given embed.


// todo: make new headers, also maybe color code headers for each team (red = moderators/general, blue = support, purple = social, grey = bug hunters)

/* eslint-disable no-undef, no-irregular-whitespace*/

[
  {
    title: 'General Moderation Practice',
    files: [Assets.getImage('IMG_head_discord_general').attachment]
  },
  {
    //kw: ['[TODO]'],
    embed: new djs.MessageEmbed()
      .setColor(bot.cfg.embed.default)
      .setTitle('Information for Junior Moderators')
      .setDescription('[TODO: explain jr mod evaluation period]')
  },
  {
    //kw: ['[TODO]'],
    embed: new djs.MessageEmbed()
      .setColor(bot.cfg.embed.default)
      .setDescription('[TODO: explain general moderation procedures]')
  },
  {
    title: 'Server Rules & Violation Policies',
    files: [Assets.getImage('IMG_head_discord_rules_policies').attachment]
  },
  {
    title: 'Rule 1) Discord TOS/Guidelines',
    kw: ['rule 1', 'discord terms of service & community guidelines', 'tos', 'community guidelines', 'discord', 'discord rules', 'trust and safety'],
    embed: new djs.MessageEmbed()
      .setColor(bot.cfg.embed.default)
      .setTitle('Rule #1 | Discord Terms of Service & Community Guidelines')
      .setDescription([
        `**THIS IS IMPORTANT.** Discord's own rules are to be strictly enforced AT ALL TIMES. Failure to do so may result in complete removal of our server, and maybe even deletion of our own accounts. Many of our own server rules mimic Discord's rules already, so there's not much else to go over. Regardless, you can read these rules here:`,
        ``,
        `**[Discord Terms of Service](https://discordapp.com/terms) | [Discord Community Guidelines](https://discordapp.com/guidelines)**`,
        ``,
        `In summary, the following is STRICTLY forbidden:`,
        ``,
        `　• Users under the age of 13 years old. (Unfortunately, we do not have an easy way to verify anyone's age. If some guy says they're 9 years old or something, we just have to assume they're serious.)`,
        `　• Organization of community raids.`,
        `　• Evading server bans and user blocks.`,
        `　• Viruses and Malware.`,
        ``,
        `Discord reserves the right to update their terms at any time. It may be in your best interest to read the terms via their own websites linked above, rather than reading this summary. Regardless, we'll try our best to keep this policy as up-to-date as possible for everyone's convenience.`
      ].join('\n'))
      .addField('Violation Marks', `1000`, true)
      .addField('Notes', `Users in violation of this rule are __NOT__ eligible for ban appeals.`, true)
  },
  {
    title: 'Rule 2) Be respectful and civilized',
    kw: ['rule 2', 'keep discussions friendly, respectful, and (above all) civil', 'be respectful and civilized', 'friendly', 'respectful', 'civil', 'civilized', 'toxicity', 'insults', 'defamation', 'slander', 'harassment', 'degradation', 'slurs', 'racial slurs', 'racism', 'nword', 'flaming', 'flame war', 'hate speech', 'homophobia', 'transphobia'],
    embed: new djs.MessageEmbed()
      .setColor(bot.cfg.embed.default)
      .setTitle('Rule #2 | Be respectful and civilized')
      .setDescription([
        `The internet is, unfortunately, quite a toxic place when you really look at it. Masked with anonymity, we tend to show our true colors. As moderators, we must attempt to combat this norm and try to create a clean, friendly environment for our members. This especially goes for our new members. As much as we hate having to deal with the new guy, remember that we were all there at one point, starting from the bottom. All our members should aim to be patient and supportive of each other.`,
        ``,
        `The following is not allowed:`,
        ``,
        `　• Trolling`,
        `　• Insults`,
        `　• Defamation/Slander`,
        `　• Harassment`,
        `　• Degradation`,
        `　• Racial slurs (including "soft n-words")`,
        `　• Flaming/Flame wars`,
        `　• Hate speech`,
        `　• Homophobia, Transphobia, etc`
      ].join('\n'))
      .addField('Violation Marks', [
        `**Minor Offenses**: 50`,
        `**All Others**: 300-600`
      ].join('\n'), true)
  },
  {
    title: 'Rule 3) No Prohibited Content',
    kw: ['rule 3', 'no prohibited content', 'prohibited content', 'restricted content', 'nsfw', 'nsfl', 'piracy', 'offensive content', 'nazism', 'questionable content', 'disturbing content', 'shocking content', 'gore', 'confidential info', 'confidential', 'personal info', 'personal information', 'politics', 'religion', 'controversial issues', 'cracks', 'cracking', 'flashing gifs', 'animated pics'],
    embed: new djs.MessageEmbed()
      .setColor(bot.cfg.embed.default)
      .setTitle('Rule #2 | No Prohibited Content')
      .setDescription([
        `The following content is NOT allowed in the slightest. Items marked with an underline come directly from Discord's Terms of Service. (see rule 1)`,
        ``,
        `　• Bigotry, Nazism, and other offensive content.`,
        `　• Fast, seizure-inducing, flashing animated pictures.`,
        `　• Politics, religion, and other controversial issues.`,
        `　• __Pornographic, questionable, and other NSFW content.__**\\***`,
        `　• __Disturbing or shocking NSFL content.__`,
        `　• __Confidential and personal information__`,
        `　• __Cracks, piracy, and other illegal content.__`,
        `　• __Viruses and malware__`,
        `　• __Hacks, cheats and exploits for video games.__`,
        ``,
        `These restrictions apply to **all things visible in chat.** This means all discussions, images, links, profile pictures, nicknames, etc.`,
        ``,
        `**\\***NSFW is against TOS when displayed without an age gate. (marked NSFW channel)`
      ].join('\n'))
      .addField('Policy', '[TODO]')
  },
  {
    title: 'Rule 4) No Spamming',
    kw: ['rule 4', 'no spamming', 'spam', 'spamming', 'mass ping', 'wall of text'],
    embed: new djs.MessageEmbed()
      .setColor(bot.cfg.embed.default)
      .setTitle('Rule #4 | No Spamming')
      .setDescription([
        `Examples of spam includes, but is not limited to:`,
        ``,
        `　• Messages that only contain random, arbitrary characters.`,
        `　• Posting the same type of message over and over and over and over.`,
        `　• Mass pinging users or roles for no legitimate reason.`,
        `　• Large walls of text that do not contribute to real discussions. (copypastas for example)`,
        `　• Repeated usage of irrelevant bot commands outside of <#626843115650547743>`,
        ``,
        `Note that this rule is somewhat "relaxed" for the <#584850909725458503> channel.`
      ].join('\n'))
      .addField('Policy', '[TODO]')
  },
  {
    title: 'Rule 5) No Advertising',
    kw: ['rule 5', 'no advertising', 'ads', 'advertising', 'invite links'],
    embed: new djs.MessageEmbed()
      .setColor(bot.cfg.embed.default)
      .setTitle('Rule #5 | No Advertising')
      .setDescription([
        `Advertising of any kind is generally forbidden. **The only permanent exceptions to this rule are Resource Packs, Shader Packs, and other Minecraft Mods.** Moderators may grant special permission for a user to advertise, under the following conditions: `,
        ``,
        `1. The advertisement must be approved by at least 3 separate moderators, including yourself.`,
        `2. The advertisement MUST comply with all other server rules. `,
        ``,
        `If you yourself wish to advertise something, you must also follow these terms. **You do not automatically have permission to advertise something as a moderator!**`,
        ``,
        `Any link URL, server IP, or other reference that's posted with the sole intention of marketing purposes or general promotion is considered advertising. Examples of this includes, but is not limited to:`,
        ``,
        `　• Unsolicited Discord server invite links`,
        `　• Referral links`,
        `　• Unwanted social media profile/channel links`,
        ``,
        `**Be sure to also consider context.** Generally, most advertisements are posted at random, but if someone posts a link that is relevant to the active conversation, you may consider allowing it.`
      ].join('\n'))
      .addField('Policy', '[TODO]')
  },
  {
    title: 'Rule 6) Stay on-topic',
    kw: ['rule 6', 'keep topics to their appropriate channels', 'stay on-topic', 'offtopic', 'inappropriate channel', 'wrong channel', 'wrong topic', 'move discussion'],
    embed: new djs.MessageEmbed()
      .setColor(bot.cfg.embed.default)
      .setTitle('Rule #6 | Stay on-topic')
      .setDescription('This is a fairly simple one. All users should keep discussions to the specified channel at all times. If a topic starts changing from the one specified by the current channel, politely tell the users to move the conversation to the appropriate channel. If the conversation has not moved or returned to the current channel topic within ~10 messages after your request, any remaining active participants of the conversation are in violation of this rule.')
      .addField('Policy', '[TODO]')
  },
  {
    title: 'Rule 7) No begging',
    kw: ['rule 7', 'do not beg for capes', 'no begging', 'begging', 'free cape', 'asking for cape', 'capes', 'asking for free stuff', 'free stuff', 'nagging', 'give me stuff', 'giveaway'],
    embed: new djs.MessageEmbed()
      .setColor(bot.cfg.embed.default)
      .setTitle('Rule #7 | No begging')
      .setDescription([
        `This is not a giveaway server. If someone *wants* to give stuff away on their own, that's fine. However, *asking* people to give stuff away is absolutely *not* fine.`,
        ``,
        `In the case of Donator capes, these are supposed to be a gift given to users who donate $10 to OptiFine's development. As such, not only is begging for a cape just plain pathetic (come on... it's *$10*), but also somewhat disrespectful to the developer.`
      ].join('\n'))
      .addField('Policy', '[TODO]')
  },
  {
    title: 'Rule 8) Speak English',
    kw: ['rule 8', 'speak english', 'english', 'foreign language', 'language', 'translate', 'translation', 'translator'],
    embed: new djs.MessageEmbed()
      .setColor(bot.cfg.embed.default)
      .setTitle('Rule #8 | Speak English')
      .setDescription(`This is an English-speaking server (incase you haven't noticed). Most of us moderators fluently speak this language, and for some of us, it's the *only* language we know. As such, when someone starts speaking a different language, it can make moderation difficult or even outright impossible. To help with this issue, we have the \`${bot.prefix}translate\` command. However, this is not a permanent solution, and we must (politely) ask all users to speak English themselves. This can be easily done with an online translator, such as https://www.deepl.com/translator or https://translate.google.com/`)
      .addField('Policy', '[TODO]')
  },
  {
    title: 'Rule 9) Temporary Rules',
    kw: ['rule 9', 'temporary rules', 'temporary', 'temp rules', 'temp'],
    embed: new djs.MessageEmbed()
      .setColor(bot.cfg.embed.default)
      .setTitle('Rule #9 | Temporary Rules')
      .setDescription([
        `This rule is reserved for temporary restrictions. The current temporary rules are listed as followed:`,
        ``,
        `There are no temporary rules currently in place.`
        /* `　• ` */
      ].join('\n'))
      .addField('Policy', '[TODO]')
  },
  {
    title: '*Rule 10) No reselling of capes*',
    kw: ['rule 10', 'cape reselling', 'cape selling', 'selling capes', 'reselling capes', 'cape scam'],
    embed: new djs.MessageEmbed()
      .setColor(bot.cfg.embed.error)
      .setTitle('Rule #10 | No reselling of capes')
      .setDescription([
        `**Notice: This is a hidden rule, and should be considered confidential information due to the very nature of cape reselling.**`,
        ``,
        `In a way, this rule is partially an extension of rules #5 and #7. While begging for a cape may at least imply donating again to give a new cape for someone, *reselling* a cape guarantees that absolutely NO money to being given to the developer. It's borderline insulting.`,
        ``,
        `On the other hand, capes sold via third parties often come from hacked/compromised Minecraft accounts. To quote <@202558206495555585> himself... `,
        `> the biggest problem is that capes very often come from hacked MC accounts. there are bots that constantly try to hack accounts with weak passwords. the hacked accounts are put in a database and the account price depends on name length, has vanilla cape, has OF cape, and so on`,
        ``,
        `To top it all off, capes can always be transferred back to the original owner simply by logging in to the website at https://optifine.net/login. This makes it insanely easy to make simple scams out of cape reselling. As such, we want to minimize public knowledge of this idea as much as possible. This is for the sake of everyone’s security, and to prevent more people from getting the idea of trying this scam for themselves.`
      ].join('\n'))
      .addField('Policy', '[TODO]')
  },
  {
    title: 'Other Policies',
    files: [Assets.getImage('IMG_head_discord_other').attachment]
  },
  {
    title: 'Memes & Reaction Images',
    kw: ['memes, shitposts, & reaction images', 'memes', 'shitposts', 'shitposting', 'reaction images'],
    embed: new djs.MessageEmbed()
      .setColor(bot.cfg.embed.default)
      .setTitle('Memes, Shitposts, & Reaction Images')
      .setDescription([
        `Here comes *that* part of moderation. Sigh.`,
        ``,
        `As ridiculous as it may sound, dealing with memes is an incredibly delicate task. Outright banning memes will almost guarantee either a dead server, or outrage followed by protests, riots and pitchforks, and overall just a messy disaster on all fronts. To keep everyone happy, we’ve created a single channel that is dedicated to this content: <#584850909725458503>. To keep everything clean and organized, memes are to be kept to this channel at ALL times. This type of content is not allowed in any other channel, not even <#426005631997181963> or <#423535412871561217>.`,
        ``,
        `Reaction images are slightly different. These images are allowed, if they meet the following conditions:`,
        ``,
        `1. They are *clearly* being used in the context of reacting to something.`,
        `2. They are NOT being excessively posted. (no more than 2-3 of these types of images in a row.)`,
        ``,
        `Members who fail to follow this policy are in violation of rules #4 and/or #6.`
      ].join('\n'))
  },
  {
    title: 'Assigning Member Roles',
    kw: ['roles', 'assigning member roles', 'member roles', 'rank', 'texture artist', 'shader developer', 'mod developer'],
    embed: new djs.MessageEmbed()
      .setColor(bot.cfg.embed.default)
      .setTitle('Member Roles')
      .setDescription(`We have a select number of roles that can be granted to any user that meet the specified requirements.\n\n**<@&423836695301980171>**\nUser must have decent knowledge of various features and functions of Resource Packs, including (and especially) the additional features provided by OptiFine. The user must also have created or otherwise contributed towards a publicly available Resource Pack.\\*\n\n**<@&423834274601369601>**\nUser must have a decent knowledge of the inner workings of Shader Packs and how to effectively write GLSL code. User must also have created or otherwise contributed towards a publicly available Shader Pack.\\*\n\n**<@&423839066631569408>**\nUser must have decent knowledge of Minecraft mod development, the internal workings of Minecraft source code, and how to effectively write Java code. User must also have created or otherwise contributed towards a publicly available Minecraft mod.\\*\n\n\\*Publicly available refers to the item in question being available for download on places such as Curseforge, Planet Minecraft, Minecraft Forums, a Discord server, GitHub, etc...\n\nNote that all other roles cannot be granted by moderators, and must be acquired via different methods. For example, users can only gain the <@&424169541346525194> role by using the OptiBot command \`${bot.prefix}dr\` via DM.`)
      .addField('Policy', 'Any user may request any of these roles, granted they meet the specified requirements. Users can, of course, also request multiple roles at once.')
  },
  {
    title: 'Ban Appeals',
    kw: ['unbanning', 'revoke ban', 'ban removal', 'unban', 'removing ban', 'ban appeal', 'appeal ban', 'lift ban', 'ban lifting'],
    embed: new djs.MessageEmbed()
      .setColor(bot.cfg.embed.default)
      .setTitle('Member Ban Appeals')
      .setDescription([
        `Ban appeals can be done via the following online form. If you've been privately contacted by a banned user, simply redirect them here:`,
        `[\`\`\`https://forms.gle/kqMKzeBxzm29pWku8\`\`\`](https://forms.gle/kqMKzeBxzm29pWku8)`,
        ``,
        `**Note that users are NOT eligible for ban appeals for violating certain rules.** Check the violation policies above for details.`,
        ``,
        `Once a ban appeal is received, it must be approved by no less than 3 different moderators. Ideally, votes should be given at least 2-3 days to be processed, given time zones and moderator activity. Once an appeal is **either approved or rejected**, the user in question should be contacted as soon as possible. **Do not unban the user without doing the following:** First, the user's identity must be confirmed. It is entirely possible to impersonate a user for a ban appeal, which is where this step comes in. The user must first verify the contents of their ban appeal. Ask them how they answered for various questions on the appeal form. Once they have correctly answered, they can finally be unbanned.`,
      ].join('\n'))
      .addField('Policy', 'Any user may request to have their ban lifted, granted they have not violated the Discord Terms of Service, Discord Community Guidelines, rule #10, or been previously banned before. If you\'ve been privately contacted by a banned user, simply redirect them to the form linked above.')
  },
];
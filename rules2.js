// do NOT use setAuthor() or setFooter()
// these are added automatically when used with the !rule command. (TODO)

let qn = `\n> `;

module.exports = [
    {
        files: [Assets.getImage('IMG_head_rules').attachment]
    },
    {
        embed: new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .setTitle(`Welcome to the official OptiFine Discord server!`)
        .setDescription([
            `By communicating and participating in this server, you agree to adhere to the following rules at all times.`,
            ``,
            `If you see someone breaking these rules, please ping any online moderator, or use the \`${bot.prefix}modping\` command.`,
        ].join('\n'))
    },
    {
        kw: ['rule 1', 'tos', 'terms of service', 'community guidelines', 'guidelines', 'discord tos', 'discord guidelines', 'discord rules'],
        embed: new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .setTitle(`1) Follow Discord's TOS and Community Guidelines`)
        .setDescription(`> ` + [
            `https://discordapp.com/terms`,
            `https://discordapp.com/guidelines`
        ].join(qn))
    },
    {
        kw: ['rule 2', 'respectful', 'civil', 'kind', 'rude', 'asshole', 'dont be an asshole', 'agree to disagree', 'flaming', 'flame war'],
        embed: new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .setTitle(`2) Be respectful and civilized`)
        .setDescription(`> ` + [
            `This is your usual "don't be an asshole" rule. Agree to disagree. `,
            ``,
            `If you have a problem with someone, talk it out in DMs, or ping a moderator for help. (Again, you can use the \`${bot.prefix}modping\` command!)`
        ].join(qn))
    },
    {
        kw: ['rule 3', 'prohibited content', 'offensive', 'nsfw', 'nsfl', 'questionable', 'porn', 'nazism', 'racism', 'edgy', 'transphobia', 'homophobia', 'politics', 'religion', 'controversial', 'misinformation', 'tragic events', 'seizure content', 'seizure-inducing', 'epilepsy', 'flashing images', 'flashing', 'loud', 'earrape', 'bass-boosted', 'loud music', 'loud audio', 'war', 'violence'],
        embed: new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .setTitle(`3) No prohibited content`)
        .setDescription(`> ` + [
            `The following is NOT allowed at any time, including but not limited to: `,
            ``,
            ` ● Offensive content.`,
            ` ● Questionable and NSFW content.`,
            ` ● Politics, religion, and other controversial issues.`,
            ` ● Jokes, memes, and misinformation about past or on-going tragic events.`,
            ` ● Potentially seizure-inducing animated images/videos.`,
            ` ● Excessively loud audio/videos.`
        ].join(qn))
    },
    {
        kw: ['rule 4', 'spam', 'random garbage', 'random shit', 'nonsense', 'garbage', 'trash'],
        embed: new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .setTitle(`4) No spamming`)
        .setDescription(`> ` + [
            `This means no random garbage that doesn't contribute anything to real discussions.`,
        ].join(qn))
    },
    {
        kw: ['rule 5', 'advertising', 'promotions', 'promotional content', 'marketing', 'unsolicited link', 'random links', 'discord invites', 'referral links', 'unwanted links', 'self promotion'],
        embed: new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .setTitle(`5) No promoting or advertising`)
        .setDescription(`> ` + [
            `Unsolicited server invites, referral links, and any/all other unwanted promotional content is not allowed.`,
            ``,
            `Resource Packs, Shader Packs, and other Minecraft Mods **are allowed, within reason.**`
        ].join(qn))
    },
    {
        kw: ['rule 6', 'off topic', 'wrong channel', 'channel usage', 'channels'],
        embed: new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .setTitle(`6) Stay on-topic`)
        .setDescription(`> ` + [
            `We have multiple channels for a reason. Please use them appropriately.`,
            `Anything NOT related to OptiFine should go in <#426005631997181963> or <#423535412871561217>.`
        ].join(qn))
    },
    {
        kw: ['rule 7', 'begging', 'buy cape', 'give me cape', 'asking for cape', 'asking for free stuff', 'begging for stuff', 'free cape', 'begging for cape'],
        embed: new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .setTitle(`7) No begging`)
        .setDescription(`> ` + [
            `Asking others to buy you anything (especially OptiFine capes) is unacceptable.`,
        ].join(qn))
    },
    {
        kw: ['rule 8', 'english', 'language', 'foreign language', 'speak english', 'english only', 'translate', 'second language'],
        embed: new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .setTitle(`8) Speak English`)
        .setDescription(`> ` + [
            `This is an English-speaking server. If you cannot fluently write in English, please use a translator.`,
            ``,
            `https://www.deepl.com/translator`,
            `https://translate.google.com`
        ].join(qn))
    },
    {
        kw: ['rule 9', 'temporary', 'temp rules', 'temp'],
        embed: new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .setTitle(`9) Temporary Rules`)
        .setDescription(`> ` + [
            `None, currently.`,
        ].join(qn))
    },
    {
        files: [Assets.getImage('IMG_head_guidelines').attachment]
    },
    {
        embed: new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .setTitle(`Use common sense`)
        .setDescription(`*Please.* It's not difficult, we promise. Think before speaking, try doing your own research, respect other's opinions, and overall have some decency.`)
    },
    {
        embed: new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .setTitle(`Please DO NOT ping or privately message server moderators for general OptiFine support.`)
        .setDescription([
            `Any questions about OptiFine should be redirected to <#423433009568546827>.`,
            `Here, more people will see your question/issue and you'll be much, MUCH more likely to get faster and better help.`
        ].join(`\n`))
    },
    {
        embed: new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .setTitle(`Don't ask to ask, just ask`)
        .setDescription([
            `In other words, *please* don't say "Can I ask a question?" or "Can someone help me?", just go ahead and state your question. You might be surprised to see how much faster you'll get help by doing this.`,
        ].join(`\n`))
    },
    {
        files: [Assets.getImage('IMG_head_info').attachment]
    },
    {
        embed: new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .setTitle(`Questions or Complaints`)
        .setDescription([
            `Please feel free to contact an <@&663122057818537995> if you have any questions or complaints regarding our staff team.`,
        ].join(`\n`))
    },
    {
        embed: new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .setTitle(`Requesting Roles`)
        .setDescription([
            `If you're a creator of a resource pack, shader pack, or other Minecraft mod, and you'd like the relevant roles to highlight your expertise, you can ping any moderator (or use the \`${bot.prefix}modping\` command) to make a request.`,
            ``,
            `[For more information, see this <#531622141393764352> entry.](https://discordapp.com/channels/423430686880301056/531622141393764352/556593372182216705 "https://discordapp.com/channels/423430686880301056/531622141393764352/556593372182216705")`
        ].join(`\n`))
    },
    {
        embed: new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .setTitle(`Ban Appeals`)
        .setDescription([
            `Under certain circumstances, most server bans may qualify to be revoked.`,
            ``,
            `[To get started, see this Google Form](https://forms.gle/kqMKzeBxzm29pWku8 "https://forms.gle/kqMKzeBxzm29pWku8"), and PLEASE be sure to read all the information provided.`
        ].join(`\n`))
    },
    {
        embed: new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .setTitle(`Permanent Invite Link`)
        .setDescription([
            `If you'd like to invite a friend to this server, you can use this link:`,
            `https://discord.gg/OptiFine`
        ].join(`\n`))
    },
    {
        files: [Assets.getImage('IMG_head_privacy').attachment]
    },
    {
        embed: new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .setTitle(`Just a quick word on how we process your data here...`)
        .setDescription([
            `We make use of Discord bots to provide services for you, our members, and our own server moderators. In order to enable these services, some information which you make available through this server may be retained. This includes:`,
            ``,
            ` ● Message contents and metadata`,
            ` ● User profile data`,
            ` ● User activity`, 
            ``,
            `All of this data comes as provided by the Discord API. By joining and remaining in this server, you acknowledge and express consent to having your data processed in accordance to this policy. If you do not agree with this policy, you can terminate this agreement by leaving this Discord server.`,
            ``,
            `If you have any questions or concerns regarding this policy, please feel free to message any <@&467060304145023006> or <@&663122057818537995>.`
        ])
    },
]
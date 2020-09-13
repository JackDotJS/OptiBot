// do NOT use setAuthor() or setFooter()
// these are added automatically when used with the !rule command. (TODO)

const at = `${Assets.getEmoji('ICO_space')}\n${Assets.getEmoji('ICO_space')}`;
const jt = `${Assets.getEmoji('ICO_space')}\n> `;

module.exports = [
  {
    files: [Assets.getImage('IMG_head_rules').attachment]
  },
  {
    kw: ['example', 'test'],
    embed: new djs.MessageEmbed()
      .setColor(bot.cfg.embed.default)
      .setTitle('Welcome to the official OptiFine Discord server!')
      .setDescription([
        '**By communicating and participating in this server, you agree to adhere to the following rules at all times.**',
        '',
        `If you see someone breaking these rules, please ping any online moderator, or use the ${bot.prefix}modping command.`,
        `${Assets.getEmoji('ICO_space')}`
      ].join('\n'))
      .addField(
        '1) Follow Discord\'s TOS and Community Guidelines',
        `> https://discordapp.com/terms, https://discordapp.com/guidelines \n${Assets.getEmoji('ICO_space')}`
      )
      .addField(
        '2) Be respectful and civilized',
        '> ' + [
          'This is your usual "don\'t be an asshole" rule. Agree to disagree.',
          'If you have a problem with someone, talk it out in DMs, or ping a moderator for help.'
        ].join(jt) + at
      )
      .addField(
        '3) No prohibited content',
        '> ' + [
          'The following is NOT allowed at any time, including but not limited to: ',
          ' ● Offensive content.',
          ' ● Questionable and NSFW content.',
          ' ● Politics, religion, and other controversial issues.',
          ' ● Jokes, memes, and misinformation about recent or on-going tragic events.',
          ' ● Potentially seizure-inducing animated images/videos.',
          ' ● Excessively loud audio/videos.'
        ].join(jt) + at
      )
      .addField(
        '4) No spamming',
        `> This means no random garbage that doesn't contribute anything to real discussions. \n${Assets.getEmoji('ICO_space')}`
      )
      .addField(
        '5) No advertising',
        '> ' + [
          'No unsolicited server invites, referral links, etc...',
          'Resource Packs, Shader Packs, and other Minecraft Mods **are allowed within reason.**'
        ].join(jt) + at
      )
      .addField(
        '6) Stay on-topic',
        '> ' + [
          'We have multiple channels for a reason. Please use them appropriately.',
          'Anything NOT related to OptiFine should go in #general or #donators.'
        ].join(jt) + at
      )
      .addField(
        '7) No begging',
        `> Asking others to buy you anything (especially OptiFine capes) is completely unacceptable. \n${Assets.getEmoji('ICO_space')}`
      )
      .addField(
        '8) Speak English',
        '> ' + [
          'This is an English-speaking server. If you cannot fluently write in English, please use a translator.',
          'https://www.deepl.com/translator, https://translate.google.com'
        ].join(jt) + at
      )
      .addField(
        '9) Temporary Rules',
        '> ' + [
          'None, currently.',
        ].join(jt)
      )
  },
  {
    files: [Assets.getImage('IMG_head_guidelines').attachment]
  },
  {
    kw: ['example', 'test'],
    embed: new djs.MessageEmbed()
      .setColor(bot.cfg.embed.default)
      .setDescription([
        'These guidelines are meant to steer users in the right direction. They are NOT rules, and as such, they will not be strictly enforced. Regardless, we urge you to follow them. It\'ll just make everyone\'s lives a lot easier.',
      ].join('\n'))
      .addField(
        'Use common sense',
        '> ' + [
          '*Please.* It\'s not difficult, I promise.',
        ].join(jt) + at
      )
      .addField(
        'Please DON\'T message moderators for general questions about OptiFine itself',
        '> ' + [
          'Any questions about OptiFine should be redirected to <#423433009568546827>. Here, more people will see your question/issue and you\'ll be much more likely to get faster and better help.',
        ].join(jt) + at
      )
      .addField(
        'Don\'t ask to ask, just ask',
        '> ' + [
          'In other words, please don\'t say "Can I ask a question?", just say it. You might be surprised to see how much faster you\'ll get help by doing this.',
          '[For more information, see this website.](https://sol.gfxile.net/dontask.html "https://sol.gfxile.net/dontask.html")'
        ].join(jt)
      )
  },
  {
    files: [Assets.getImage('IMG_head_info').attachment]
  },
  {
    kw: ['example', 'test'],
    embed: new djs.MessageEmbed()
      .setColor(bot.cfg.embed.default)
      .addField(
        'Requesting roles',
        '> ' + [
          'If you\'re a creator of a resource pack, shader pack, or other Minecraft mod, and you\'d like the relevant roles to highlight your expertise, you can ping any moderator (or use the `!modping` command) to make a request.',
          '[For more information, see this <#531622141393764352> entry.](https://discordapp.com/channels/423430686880301056/531622141393764352/556593372182216705 "https://discordapp.com/channels/423430686880301056/531622141393764352/556593372182216705")'
        ].join(jt) + at
      )
      .addField(
        'Ban appeals',
        '> ' + [
          'If you\'re ever banned from our server, you may qualify to have the ban lifted.',
          '[For more information, see this Google Form.](https://forms.gle/kqMKzeBxzm29pWku8 "https://forms.gle/kqMKzeBxzm29pWku8")'
        ].join(jt) + at
      )
      .addField(
        'Permanent invite link',
        '> ' + [
          'If you\'d like to invite a friend to this server, you can use this link:',
          'https://discord.gg/OptiFine'
        ].join(jt)
      )
  },
  {
    files: [Assets.getImage('IMG_head_privacy').attachment]
  },
  {
    kw: ['example', 'test'],
    embed: new djs.MessageEmbed()
      .setColor(bot.cfg.embed.default)
      .setTitle('Just a quick word on how we process your data here...')
      .setDescription([
        'We make use of Discord bots to provide services for you, our members, and our own server moderators. In order to enable these services, some information which you make available through this server may be retained. This includes, but is not limited to:',
        '',
        ' ● Message contents and metadata',
        ' ● User profile data',
        ' ● User activity', 
        '',
        'All of this data comes as provided by the Discord API. By joining and remaining in this server, you acknowledge and express consent to having your data processed in accordance to this policy. If you do not agree with this policy, you can terminate this agreement by leaving this Discord server.',
        '',
        'If you have any questions or concerns regarding this policy, please feel free to message any of our <@&467060304145023006>s or <@&663122057818537995>s.'
      ])
  },
];
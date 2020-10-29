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

/* eslint-disable no-undef */

[
  {
    title: 'Introduction **(Start here!)**',
    files: [Assets.getImage('IMG_head_staff_intro').attachment]
  },
  {
    embed: new djs.MessageEmbed()
      .setColor(bot.cfg.embed.default)
      .setTitle('Welcome to the OptiFine Team!')
      .setDescription('Our goal is simple: Provide the best possible experience for all members of our community. By joining our team, you can now further aid us in this endeavor! We\'re excited to have you here, and we hope to see how you perform very soon.\n\nBefore diving into your duties, please be sure to read these policies **to completion, at LEAST once.** Keep in mind that these can, and *will* change. It\'s only natural that, as our community grows, we too should evolve to manage it effectively as we move into the future. Finally, remember this: **This is volunteer work.** It\'s a labor of love, and nothing more.')
  },
  /*     {
        title: 'Code of Conduct',
        files: [Assets.getImage('IMG_head_staff_coc').attachment]
    },
    {
        embed: new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .setTitle('Follow Moderation Policy (duh)')
        .setDescription(`It's easy to say "just use common sense", but what we consider common can greatly differ between people. As such, the following policies have been put in place to help all of us moderate the server effectively and consistently. Of course, there are a few obvious cases were policy can be skipped entirely (such as some guy trying to spam @everyone), but otherwise please avoid doing this whenever possible.`)
    },
    {
        embed: new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .setTitle('Follow the Rules (also duh)')
        .setDescription(`Becoming a moderator does not mean you are above the law and magically exempt from our server rules. Set a good example for other members and follow the rules at all times.`)
    },
    {
        embed: new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .setTitle(`Accept that you're not unbiased`)
        .setDescription(`Thanks to this weird thing called "being human" and having "emotions", it's naturally impossible to remain neutral in every situation. Try to consult with other moderators when at all possible.`)
    },
    {
        embed: new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .setTitle('Be Friendly, Approachable, and Transparent.')
        .setDescription(`It's easy to become frustrated when you have to deal with 40+ people every day asking the same questions and refusing to do their own research, despite how easy we might make it for them. Unfortunately, we just have to just work with it. Remain calm and friendly when trying to help our members, especially the new ones. Remember, it's not always the same guy asking the same questions over and over. You're likely talking to someone who just joined a couple minutes ago. \n\nThis also goes for people you have to moderate for XYZ reason(s). If someone believes they were wrongfully muted, talk it out in DMs. Be calm and explain your reasoning. If it ever turns out you're wrong, just accept it and move on. Please don't double down on anything you know is false.`)
    },
    {
        embed: new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .setTitle('Know Your Tools')
        .setDescription(`As a <@&467060304145023006>, you have access to a few tools provided directly by Discord: Kicking and banning. You can also mute and deafen people in voice channels. In addition, we have our own Discord bot. <@468582311370162176> allows us to perform even more moderation actions, such as giving warnings, muting users in text chat, and more. You can view all moderator-only commands by typing \`${bot.prefix}list mod\`, and you can view detailed information on a specific command with \`${bot.prefix}help <command>\``)
    },
    {
        embed: new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .setTitle(`Review Before Acting`)
        .setDescription(`If at all possible, try to review these policies before acting as a moderator. For quick references, you can view and search individual policies with the \`${bot.prefix}policy\` command.`)
    },
    {
        embed: new djs.MessageEmbed()
        .setColor(bot.cfg.embed.default)
        .setTitle(`Don't Overwhelm Yourself!`)
        .setDescription(`If you're the only moderator online and you have something important to do in real life, *please feel free to leave.* Once again, moderating is nothing more than a community service, and you are not obligated to sit here and oversee the chat 24 hours a day. While we appreciate the enthusiasm, please don't sacrifice your own well-being for the sake of our server!`)
    }, */
  {
    title: 'Staff Assignments',
    files: [Assets.getImage('IMG_head_staff_assign').attachment]
  },
  {
    embed: new djs.MessageEmbed()
      .setColor(bot.cfg.embed.default)
      .setTitle('Administrators')
      .setDescription('An <@&663122057818537995> is responsible for managing a majority of OptiFine\'s community as a whole, and making executive decisions for each team, such as handling major Discord moderation disputes.')
  },
  {
    embed: new djs.MessageEmbed()
      .setColor(bot.cfg.embed.default)
      .setTitle('Discord Moderation Team')
      .addField('Lead Moderators', 'A <@&467060304145023006> is responsible for ')
      .addField('Moderators', 'A <@&467060304145023006> is responsible for day-to-day management of interactions between server members in public text channels. As a moderator, it is your job to ensure our community remains friendly, welcoming, and peaceful, while reprimanding those who seek to do otherwise.')
      .addField('Junior Moderators', `Alternatively called "Trial Moderators", A <@&644668061818945557> has the same job as Moderators, only with restricted moderation abilities. During their evaluation period, Jr. Moderators are NOT able to kick/ban server members, but they can delete messages and access MOST bot-based moderation commands, including \`${bot.prefix}mute\` and \`${bot.prefix}warn\` (See \`${bot.prefix}list jrmod\` for more)`)
  },
  {
    embed: new djs.MessageEmbed()
      .setColor(bot.cfg.embed.default)
      .setTitle('Support Team')
      .addField('Support Managers', 'A <@&729734667582046280> is responsible for [TODO]')
      .addField('Support Team Members', 'A <@&729735394006138900> member is responsible for [TODO]')
  },
  {
    embed: new djs.MessageEmbed()
      .setColor(bot.cfg.embed.default)
      .setTitle('Social Media Team')
      .addField('Social Media Managers', 'A <@&729735451287617600> is responsible for [TODO]')
      .addField('Social Media Team Members', 'A <@&729735496355414056> member is responsible for [TODO]')
  },
  {
    embed: new djs.MessageEmbed()
      .setColor(bot.cfg.embed.default)
      .setTitle('Bug Hunters')
      .setDescription('A <@&729735521039024250> is responsible for [TODO]')
  },
  {
    title: 'General Staff Policies',
    files: [Assets.getImage('IMG_head_staff_general').attachment]
  },
  {
    title: 'Staff Applications',
    kw: ['moderator applications', 'applications', 'apps', 'mod apps', 'moderator apps', 'mod applications', 'hire mods', 'hire moderators', 'new mods', 'new moderators', 'staff applications', 'staff apps', 'hire staff', 'new staff'],
    embed: new djs.MessageEmbed()
      .setColor(bot.cfg.embed.default)
      .setTitle('Staff Applications')
      .setDescription([
        'All staff applications start here:',
        '',
        'https://forms.gle/EXMSN2LaM4gnRXYU9',
        '',
        ''
      ].join('\n'))
      .addField('Policy', 'When staff positions need to be filled, the above form can simply be opened to the public. Applications must remain open for no less than one week, but can otherwise remain open for as long as deemed necessary. Most rounds of applications are left open for 2 weeks at a time. [TODO: explain filtering process]')
  },
  {
    title: 'Staff Breaks & Vacations',
    //kw: ['[TODO]'],
    embed: new djs.MessageEmbed()
      .setColor(bot.cfg.embed.default)
      .setTitle('Staff Breaks and Vacations')
      .setDescription([
        '[TODO]',
      ].join('\n'))
      .addField('Policy', '[TODO]')
  }
];
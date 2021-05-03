const path = require(`path`);
const djs = require(`discord.js`);
const fetch = require(`node-fetch`);
const { Command, Assets, memory } = require(`../core/OptiBot.js`);

const bot = memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  description: {
    short: `Update a static information channel.`,
    long: [
      `Updates a static information channel using information from the given file. This command expects files from our GitHub repositories, linked here:`,
      `https://github.com/Team-OptiFine/DiscordInfoPrivate`,
      `https://github.com/Team-OptiFine/DiscordInformation`
    ].join(`\n`)
  },
  args: `<channel> <file url>`,
  dm: false,
  flags: [ `STAFF_CHANNEL_ONLY`, `STRICT`, `DELETE_ON_MISUSE`, `LITE` ],
  run: null
};

metadata.run = async (m, args) => {
  if(!args[1]) return bot.util.missingArgs(m, metadata);

  // validate target channel ID
  let target = args[0].match(/(?<=<#)\d{17,19}(?=>)|^\d{17,19}$/);

  // validate url
  let file = args[1].match(/^(https?:\/\/)?([\da-z\.-]+\.[a-z\.]{2,6}|[\d\.]+)([\/:?=&#]{1}[\da-z\.-]+)*[\/\?]?$/gi); // eslint-disable-line no-useless-escape

  if(file != null) {
    try {
      file = new URL(file[0]);
    }
    catch(err) {
      // damn bro that sucks
    }
  }

  if (target == null) {
    return bot.util.err(`You must specify a valid channel.`, { m });
  }

  target = target[0];

  const channel = bot.channels.cache.get(target);
  if (channel == null) {
    return bot.util.err(`You must specify a valid channel.`, { m });
  }

  const ms = (await channel.messages.fetch({ limit: 100, force: true })).array().reverse();

  if (ms.some(msg => msg.author.id !== bot.user.id)) {
    return bot.util.err(`Cannot load embeds in a channel containing user messages.`, { m });
  }

  if(file == null || !file.hostname.toLowerCase().includes(`github`) || !file.pathname.startsWith(`/Team-OptiFine`)) {
    return bot.util.err(`You must specify a valid file URL`, { m });
  }

  const getFile = (input) => {
    const url = [
      `https://api.github.com/repos/Team-OptiFine/`
    ];

    if (input.toLowerCase().includes(`discord-info-private`)) {
      url.push(`Discord-Info-Private/contents/`);
    } else if (input.toLowerCase().includes(`discord-information`)) {
      url.push(`Discord-Information/contents/`);
    } else {
      throw new Error(`Invalid Info Data URL`);
    }

    const filepath = input.match(/(?<=[\/\\]main[\/\\]).*/); // eslint-disable-line no-useless-escape

    if (filepath == null) throw new Error(`Invalid Info Data URL`);

    url.push(filepath[0]);

    if (!(url.join(``).endsWith(`README.md`))) url.push(`/README.md`);

    return url.join(``);
  };

  const apihref = getFile(args[1]);

  // dir: https://github.com/Team-OptiFine/Discord-Info-Private/tree/main/example
  // file: https://github.com/Team-OptiFine/Discord-Info-Private/blob/main/example/README.md
  // raw file: https://raw.githubusercontent.com/Team-OptiFine/Discord-Info-Private/main/example/README.md

  // api get file contents: https://api.github.com/repos/Team-OptiFine/Discord-Info-Private/contents/example/README.md
  // MUST BE CONVERTED FROM BASE64!!!!!!!!!!!!!!!

  const cembed = new djs.MessageEmbed()
    .setColor(bot.cfg.colors.warn)
    .setAuthor(`Are you sure?`, await Assets.getIcon(`ICO_warn`, bot.cfg.colors.warn))
    .setDescription(`todo: add more text here`);

  const bm = await bot.send(m, { embed: cembed, delayControl: true });

  const confirmation = await bot.util.confirm(m, bm.msg);

  switch (confirmation) {
    case `confirm`:
      await bm.msg.edit(`loading`, { embed: null });
      break;
    case `cancel`:
      await bm.msg.edit(`cancelled`, { embed: null });
      bm.addControl();
      return;
    default:
      await bm.msg.edit(`timed out`, { embed: null });
      bm.addControl();
      return;
  }

  const now = new Date();

  const res = await fetch(apihref, { headers: { 'Authorization': `token ${bot.keys.github}` } });
  const body = Buffer.from((await res.json()).content, `base64`).toString(`ascii`);

  log(res);
  log(body);

  body.replace(/<!--(?!OB).*?-->/g, ``); // remove non-function comments

  // isolate img tags
  // (?<=<img\s).+(?=\/?>)

  // isolate functional comments
  // <!--OB-(?:.|\n|\r)*?-->

  const pageData = {
    opts: {},
    sections: [],
    mkLinks: [],
    loadErrors: []
  };

  const rawSections = body.split(/(?=<div)/);

  const extractJSON = (text) => {
    const result = [];
    const funcs = [...text.matchAll(/<!--OB\s(.*?)-->/gs)];

    for (const func of funcs) {
      const value = func[1].trim();

      if (value.length === 0) continue;

      try {
        const json = JSON.parse(value);

        result.push({
          index: func.index,
          string: value,
          json
        });
      }
      catch (err) {
        log(`Error parsing info channel text`, `warn`);
        log(err.stack, `warn`);

        pageData.loadErrors.push(`Could not extract JSON from text: \n${text}`);
      }
    }

    return result;
  };

  const stringReplace = (text, i1, i2, substring) => {
    return text.substring(0, i1) + substring + text.substring(i2);
  };

  const sanitize = (text) => {
    return text.replace(/<!--.*?-->/gs, ``);
  };

  const processText = (text, sectionIndex, embedIndex) => {
    const jsons = extractJSON(text);

    let selection = null;
    let modified = text;

    for (const data of jsons) {
      if (data.json === `select`) {
        selection = data;
        continue;
      }

      if (selection != null) {
        // handle text replacement
        if (data.json.replace != null && typeof data.json.replace === `string`) {
          modified = stringReplace(modified, selection.index, data.index, data.json.replace);
        }

        // add embed link
        if (data.json.linkto != null && typeof data.json.linkto === `string`) {
          for (const qitem of pageData.mkLinks) {
            if (qitem.name === data.json.linkto) {

              // todo: check if URL markdown exists
              // todo: get beginning and end indexes of URL markdown

              qitem.from.push({
                sectionIndex,
                embedIndex,
                i1: null,
                i2: null,
                url: null // this is set later
              });
            }
          }
        }

        selection = null;
      }
    }

    return sanitize(modified).trim();
  };

  const resolveColor = (input) => {
    let color;

    switch (input) {
      case `default`:
      case `blue`:
        color = bot.cfg.colors.default;
        break;
      case `okay`:
      case `green`:
        color = bot.cfg.colors.okay;
        break;
      case `warn`:
      case `yellow`:
        color = bot.cfg.colors.warn;
        break;
      case `err`:
      case `error`:
      case `red`:
        color = bot.cfg.colors.error;
        break;
      default:
        color = input;
    }

    try {
      return djs.Util.resolveColor(color);
    }
    catch (err) {
      pageData.loadErrors.push(err.stack);
    }

    return bot.cfg.colors.default;
  };

  for (const section of rawSections) {
    if (!section.startsWith(`<div`)) {
      // get page options
      const jsons = extractJSON(section);

      log(jsons[0]);

      if (jsons.length > 0 && jsons[0].json.opts != null) pageData.opts = jsons[0].json.opts;

      continue;
    }

    const sectionData = {
      title: `Untitled Section`,
      banner: null,
      embeds : []
    };

    const bannerTag = section.match(/<img.*?>/s);

    if (bannerTag != null) {
      const title = bannerTag[0].match(/alt="(.*?)"/);
      const url = bannerTag[0].match(/src="(.*?)"/);

      if (title != null && title[1].length > 0) sectionData.title = title[1];
      if (url != null && url[1].length > 0) sectionData.banner = url[1];
    }

    const rawEmbeds = section.split(/^(?=#{3}(?!#))/gm).slice(1);

    for (const rawEmbed of rawEmbeds) {
      const embedData = {
        tags: null,
        embed: new djs.MessageEmbed()
      };

      const cleanEmbed = sanitize(rawEmbed);

      // get embed title
      const title = cleanEmbed.match(/(?<=^#{3}).*$/m);
      if (title != null && title[0].length > 0) {
        embedData.embed.setTitle(processText(title[0], pageData.sections.length, sectionData.embeds.length));
      }

      // thanks to how the split() method works we get descriptions and embed options through the embed fields processing just below

      // this might be slightly confusing but it simplifies the processing quite a bit since we dont have to go way out of our way just to get the embed description + options

      const rawFields = rawEmbed.split(/^(?=#{4}(?!#))/gm);

      for (const rawField of rawFields) {
        const cleanField = sanitize(rawField);

        // do description + embed options stuff here
        if (!rawField.startsWith(`####`)) {
          // get embed options
          const options = extractJSON(rawField);
          if (options.length > 0) {
            // add embed tags
            if (options[0].json.tags != null) {
              embedData.tags = options[0].json.tags;
            }

            // add embed color
            if (options[0].json.color != null) {
              embedData.embed.setColor(resolveColor(options[0].json.color));
            }

            // add embed link
            if (options[0].json.linkfrom != null) {
              let add = true;

              for (const qitem of pageData.mkLinks) {
                if (qitem.name === options[0].json.linkfrom) {
                  add = false;
                  pageData.loadErrors.push(`LinkFrom embed duplicate: ${options[0].json.linkfrom}`);
                  break;
                }
              }

              if (add) {
                pageData.mkLinks.push({
                  name: options[0].json.linkfrom,
                  to: {
                    sectionIndex: pageData.sections.length,
                    embedIndex: sectionData.embeds.length,
                    url: null
                  },
                  from: []
                });
              }
            }
          }

          const description = rawField.match(/(?<=^#{3}.*?\n).*/s);

          // get embed description
          if (description != null && description[0].length > 0) {
            embedData.embed.setDescription(processText(description[0], pageData.sections.length, sectionData.embeds.length));
          }

          if (embedData.embed.color == null) {
            if (pageData.opts.color == null) {
              embedData.embed.setColor(bot.cfg.colors.default);
            } else {
              embedData.embed.setColor(resolveColor(pageData.opts.color));
            }
          }

          continue;
        }

        const fieldJSONs = extractJSON(rawField);
        const fieldName = cleanField.match(/(?<=^#{4}).*$/m);
        const fieldValue = cleanField.match(/(?<=^#.*?[\n\r]).*/s);
        let fieldInline = false;

        if (fieldJSONs.length > 0 && fieldJSONs[0].json.inline === true) {
          fieldInline = true;
        }

        // underscore thingys prevent discord api error
        embedData.embed.addField(
          (fieldName != null && fieldName[0].length > 0) ? processText(fieldName[0], pageData.sections.length, sectionData.embeds.length) : `_ _`,
          (fieldValue != null && fieldValue[0].length > 0) ? processText(fieldValue[0], pageData.sections.length, sectionData.embeds.length) : `_ _`,
          fieldInline
        );
      }

      sectionData.embeds.push(embedData);
    }

    pageData.sections.push(sectionData);
  }

  //return bot.send(m, new djs.MessageAttachment(Buffer.from(JSON.stringify(pageData, null, 2)), `output.txt`));

  let marker = 0;

  const footerData = [];

  for (const section of pageData.sections) {
    const sectionContent = (section.banner != null) ? section.banner : section.title;

    //////////////////////////////
    // HANDLE SECTIONS
    //////////////////////////////

    if (ms[marker] != null) {
      // edit msg
      if (ms[marker].content != sectionContent) await ms[marker].edit(sectionContent, { embed: null });

      footerData.push({
        type: `SECTION`,
        title: section.title,
        url: ms[marker].url
      });
    } else {
      // post msg
      const sbm = await bot.send(channel, sectionContent);

      footerData.push({
        type: `SECTION`,
        title: section.title,
        url: sbm.msg.url
      });
    }

    marker++;

    //////////////////////////////
    // HANDLE EMBEDS
    //////////////////////////////

    if (section.embeds.length === 0) continue;

    for (const embedData of section.embeds) {
      const embed = embedData.embed;
      const embedTitle = (embed.title != null) ? embed.title : `Untitled Paragraph`;

      if (ms[marker] != null) {
        // edit msg

        if (JSON.stringify(ms[marker].embeds[0]) != JSON.stringify(embed)) await ms[marker].edit(`_ _`, { embed });

        footerData.push({
          type: `EMBED`,
          title: embedTitle,
          url: ms[marker].url
        });
      } else {
        // post msg
        const ebm = await bot.send(channel, `_ _`, { embed });

        footerData.push({
          type: `EMBED`,
          title: embedTitle,
          url: ebm.msg.url
        });
      }

      marker++;
    }
  }

  for (null; marker < ms.length; marker++) {
    if (!ms[marker].deleted) await ms[marker].delete();
  }

  if (pageData.opts.footer != null) {
    let footer = [];

    if (pageData.opts.footer.image) await bot.send(channel, pageData.opts.footer.image);

    if ([`TABLE`, `MINI_TABLE`].includes(pageData.opts.footer.mode)) {
      let embed;

      const resetEmbed = () => {
        embed = new djs.MessageEmbed()
          .setColor((pageData.opts.color != null) ? resolveColor(pageData.opts.color) : bot.cfg.colors.default);
      };

      resetEmbed();
      
      for (const item of footerData) {
        if (pageData.opts.footer.mode === `MINI_TABLE` && item.type === `EMBED`) continue;

        const text = `${(item.type === `SECTION`) ? `\n\n` : ``}${(item.type === `EMBED`) ? `_ _ _ _ - ` : ``}[${item.title}](${item.url})`;

        if (pageData.opts.footer.fields) {
          if (embed.description != null) {
            if ((footer.join(`\n`).trim().length + text.length) >= 2000) {
              embed.setDescription(footer.join(`\n`).trim());
    
              footer = [];
            } else {
              footer.push(text);
            }
          } else {
            if (embed.fields.length === 25) {
              await bot.send(channel, { embed });

              resetEmbed();
            }

            if ((footer.join(`\n`).trim().length + text.length) >= 1000) {
              embed.addField(`_ _`, footer.join(`\n`).trim());
    
              footer = [];
            } else {
              footer.push(text);
            }
          }
        } else {
          if ((footer.join(`\n`).trim().length + text.length) >= 2000) {
            // post table message
            embed.setDescription(footer.join(`\n`).trim());
  
            await bot.send(channel, { embed });

            resetEmbed();
  
            footer = [];
          } else {
            footer.push(text);
          }
        }
      }

      if (footer.length > 0) {
        // post final
        embed.setDescription(footer.join(`\n`).trim());
  
        await bot.send(channel, { embed });
      }

      const finalEmbed = new djs.MessageEmbed()
        .setColor((pageData.opts.color != null) ? resolveColor(pageData.opts.color) : bot.cfg.colors.default)
        .setFooter(`Last Updated: ${now.toUTCString()}`)
        .setTimestamp(now);

      await bot.send(channel, { embed: finalEmbed });
    }

    if (pageData.opts.footer.mode === `JUMP_TO_START`) {
      const embed = new djs.MessageEmbed()
        .setColor((pageData.opts.color != null) ? resolveColor(pageData.opts.color) : bot.cfg.colors.default)
        .setDescription(`[Jump to Start](${footerData[0].url})`)
        .setFooter(`Last Updated: ${now.toUTCString()}`)
        .setTimestamp(now);
      
      await bot.send(channel, { embed });
    }
  }

  await bm.msg.edit(`done`, { embed: null });
  bm.addControl();

  if (pageData.loadErrors.length > 0) {
    bot.send(m, `load errors:`, { files: [ new djs.MessageAttachment(Buffer.from(JSON.stringify(pageData.loadErrors, null, 2)), `errors.txt`) ] });
  }
};

module.exports = new Command(metadata);
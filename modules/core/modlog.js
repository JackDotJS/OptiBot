const util = require(`util`);
const djs = require(`discord.js`);
const timeago = require(`timeago.js`);
const memory = require(`./memory.js`);
const RecordEntry = require(`./record_entry.js`);

module.exports = class LogEntry {
  constructor(opts = { time: new Date(), console: true, embed: true, channel: `misc` }) {
    const bot = memory.core.client;

    const data = {
      embed: new djs.MessageEmbed(),
      ptd: {
        report: `Untitled Report`,
        title: null,
        header: null,
        description: null,
        sections: [],
      },
      truncated: false,
      publishing: {
        console: (opts.console != null) ? opts.console : true,
        embed: (opts.embed != null) ? opts.embed : true
      },
      time: (opts.time != null) ? opts.time : new Date(),
      channel: (opts.channel != null) ? opts.channel : `misc`,
      caller: new Error().stack.split(`\n`)[2].match(/\w+\.js:\d+:\d+/i),
      icon: null,
      message: null
    };

    data.channel = bot.cfg.channels.log[data.channel];

    if (!data.channel) {
      data.channel = bot.cfg.channels.log[`misc`];
    }

    data.channel = bot.channels.cache.get(data.channel);

    data.embed.setFooter(`Click on embed title to download plaintext report.\nEvent logged on ${data.time.toUTCString()}`)
      .setTimestamp(data.time);

    this.data = data;
    this.embed = data.embed;
    this.ptd = data.ptd;
  }

  _truncate(text, limit) {
    let str = String(text);

    if (text.length > limit) {
      str = text.substring(0, limit - 3).trim() + `...`;
      this.data.truncated = true;
    } else
    if (text.length + 1 <= limit) {
      str += `​`; // zero-width character to fix huge emoji on mobile
    }

    if (text.trim().length === 0) {
      str = `undefined`;
    }

    return str;
  }

  _compilePlaintext() {
    const plaintext = [];
    const w = 64;
    const div = `#`.repeat(w);

    const center = (text, width) => {
      if (text.length > width) return text;

      const left = Math.floor((width - (text.length)) / 2);
      const right = Math.ceil((width - (text.length)) / 2);

      return `${` `.repeat(left)}${text}${` `.repeat(right)}`;
    };

    plaintext.push(
      center(this.ptd.report, w),
      center(`${this.data.time.toUTCString()}`, w),
      center(`${this.data.caller} (approx.)`, w),
      ``,
      div,
      ``,
      this.ptd.title || `<Untitled>`,
      ``,
    );

    if (this.ptd.header) {
      plaintext.push(
        `------ ${this.ptd.header} ------`,
        ``,
      );
    }

    if (this.ptd.description) {
      plaintext.push(
        this.ptd.description,
        ``,
      );
    }

    if (this.ptd.sections.length > 0) {
      for (let i = 0; i < this.ptd.sections.length; i++) {
        const section = this.ptd.sections[i];

        plaintext.push(
          `--- ${section.title} ---`,
          section.content,
          ``,
        );

        if (i + 1 < this.ptd.sections.length) {
          plaintext.push(``);
        }
      }
    }

    return plaintext.join(`\n`);
  }

  preLoad() {
    const bot = memory.core.client;

    if (this.data.publishing.embed) {
      const embed = new djs.MessageEmbed()
        .setColor(bot.cfg.colors.default)
        .setTitle(`Loading...`);

      this.data.channel.send(embed).then(msg => {
        this.data.message = msg;
      });
    }

    return this;
  }

  error(err) {
    return new Promise((resolve, reject) => {
      const bot = memory.core.client;
      const log = bot.log;

      const embed = bot.util.err(err);
      const plaintext = this._compilePlaintext();

      embed.setFooter([
        `Click on embed title to download plaintext report.`,
        `Some log data may be corrupt or missing due to this error.`,
        `Event logged on ${this.data.time.toUTCString()}`
      ].join(`\n`))
        .setTimestamp(this.data.time);

      if (this.data.publishing.embed) {
        bot.channels.cache.get(bot.cfg.channels.cache).send({
          files: [new djs.MessageAttachment(Buffer.from(plaintext), `${this.ptd.report.toLowerCase().replace(/[/\\?%*:|"<> ]/g, `_`)}.txt`)]
        }).then(att => {
          embed.author.url = [...att.attachments.values()][0].url;

          if (this.data.message) {
            this.data.message.edit(embed).then(msg => {
              resolve(msg);
            }).catch(err => {
              bot.util.err(err);
            });
          } else {
            this.data.channel.send(embed).then(msg => {
              resolve(msg);
            }).catch(err => {
              bot.util.err(err);
            });
          }
        }).catch(err => {
          bot.util.err(err);
        });
      }
    });
  }

  setColor(color) {
    this.embed.setColor(color);
    return this;
  }

  setIcon(icon) {
    if (this.embed.author) {
      this.embed.author.iconURL = icon;
    } else {
      this.data.icon = icon;
    }
    return this;
  }

  setThumbnail(image) {
    this.embed.setThumbnail(image);
    return this;
  }

  setTitle(text, reportTitle = text) {
    this.embed.setAuthor(this._truncate(text, 256), this.data.icon);
    this.ptd.title = text;
    this.ptd.report = reportTitle;
    return this;
  }

  setHeader(text, plaintext = text) {
    this.embed.setTitle(this._truncate(text, 256));
    this.ptd.header = plaintext;
    return this;
  }

  setDescription(text, plaintext = text) {
    this.embed.setDescription(this._truncate(text, 2048));
    this.ptd.description = plaintext;
    return this;
  }

  addSection(_title, _content, inline) {
    const bot = memory.core.client;
    const log = bot.log;

    const title = this._truncate(_title, 256);
    const title_r = title;

    let final_content = _content;
    let final_content_raw = _content;

    if (typeof _content !== `string`) {
      if (_content.constructor === Object) {
        if (typeof _content.data !== undefined && typeof _content.raw !== undefined) {
          final_content = _content.data;
          final_content_raw = _content.raw;
        } else {
          final_content = `undefined`;
          final_content_raw = `undefined`;
        }
      }

      if (final_content.constructor === djs.User || final_content.constructor === djs.GuildMember) {
        const mem = (final_content.constructor === djs.GuildMember) ? final_content.user : final_content;
        if (final_content === final_content_raw) final_content_raw = `USER: ${mem.tag} (${mem.id})`;

        final_content = [
          `${mem.toString()} | ${mem.tag}`,
          `\`\`\`yaml\nID: ${mem.id}\`\`\``
        ].join(`\n`);
      } else
      if (final_content.constructor === djs.Message) {
        if (final_content === final_content_raw) final_content_raw = [
          `CHANNEL: #${final_content.channel.name} (${final_content.channel.id})`,
          `DIRECT URL${(final_content.deleted) ? ` (DELETED):` : `:`} ${final_content.url}`
        ].join(`\n`);

        final_content = `${final_content.channel.toString()} | [Direct URL](${final_content.url} "${final_content.url}") ${(final_content.deleted) ? `(deleted)` : ``}`;
      } else
      if (final_content.constructor === djs.TextChannel) {
        if (final_content === final_content_raw) final_content_raw = `CHANNEL${(final_content.deleted) ? ` (DELETED):` : `:`} #${final_content.name} (${final_content.id})`;

        final_content = [
          `${final_content.toString()} ${(final_content.deleted) ? `(deleted)` : ``}`,
          `\`\`\`yaml\nID: ${final_content.id}\`\`\``
        ].join(`\n`);
      } else
      if (final_content.constructor === Date) {
        final_content = `${final_content.toUTCString()} \n(${timeago.format(final_content)})`;

        if (final_content === final_content_raw) final_content_raw = final_content;
      } else
      if (final_content.constructor === Number) {
        final_content = final_content.toLocaleString();

        if (final_content === final_content_raw) final_content_raw = final_content;
      } else
      if (final_content.constructor === RecordEntry) {
        if (final_content === final_content_raw) final_content_raw = [
          `CASE ID: ${final_content.display.id}`,
          `ACTION: ${final_content.display.action}`,
          `REASON: ${final_content.reason}`
        ].join(`\n`);

        log(final_content_raw);

        final_content = [
          `${final_content.display.icon} ${final_content.display.action}`,
          `\`\`\`yaml\nID: ${final_content.display.id}\`\`\``
        ].join(`\n`);
      }
    }

    final_content = this._truncate(final_content, 1024);

    this.embed.addField(title, final_content, inline);
    this.ptd.sections.push({
      title: title_r,
      content: final_content_raw
    });

    log(final_content_raw);

    return this;
  }

  submit() {
    return new Promise((resolve, reject) => {
      const bot = memory.core.client;
      const log = bot.log;

      const plaintext = this._compilePlaintext();

      if (this.data.publishing.console) {
        log(`\n\n\n${plaintext}\n\n\n`, `info`);
      }

      if (this.data.publishing.embed) {
        bot.channels.cache.get(bot.cfg.channels.cache).send({
          files: [new djs.MessageAttachment(Buffer.from(plaintext), `${this.ptd.report.toLowerCase().replace(/[/\\?%*:|"<> ]/g, `_`)}.txt`)]
        }).then(att => {
          if (this.embed.author) {
            this.embed.author.url = [...att.attachments.values()][0].url;
          } else {
            this.embed.setAuthor(`<Untitled>`, undefined, [...att.attachments.values()][0].url);
          }

          if (this.data.message) {
            this.data.message.edit(this.embed).then(msg => {
              resolve(msg);
            }).catch(err => {
              this.error(err).then((msg) => {
                resolve(msg);
              });
            });
          } else {
            this.data.channel.send(this.embed).then(msg => {
              resolve(msg);
            }).catch(err => {
              this.error(err).then((msg) => {
                resolve(msg);
              });
            });
          }
        }).catch(err => {
          this.error(err).then((msg) => {
            resolve(msg);
          });
        });
      }
    });
  }
};
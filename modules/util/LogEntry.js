const util = require(`util`);
const djs = require(`discord.js`);
const cid = require('caller-id');

module.exports = class LogEntry {
    constructor(bot, opts = {time: new Date(), console: true, embed: true, call: null}) {
        const data = {
            embed: new djs.MessageEmbed(),
            ptd: {
                report: null,
                title: null,
                header: null,
                description: null,
                sections: [],
            },
            files: undefined,
            truncated: false,
            publishing: {
                console: (opts.console === undefined) ? true : opts.console,
                embed: (opts.embed === undefined) ? true : opts.embed
            },
            time: (opts.time === undefined) ? new Date() : opts.time,
            caller: new Error().stack.split('\n')[2].match(/\w+\.js:\d+:\d+/i),
            icon: null,
        };

        data.embed.setFooter(`Event logged on ${data.time.toUTCString()}`)
        .setTimestamp(data.time)

        Object.defineProperty(this, 'bot', {
            get: () => {
                return bot;
            }
        });

        Object.defineProperty(this, 'data', {
            get: () => {
                return data;
            }
        });

        Object.defineProperty(this, 'embed', {
            get: () => {
                return data.embed;
            }
        });

        Object.defineProperty(this, 'ptd', {
            get: () => {
                return data.ptd;
            }
        });
    }

    _truncate(text, limit) {
        let str = String(text)

        if(text.length > limit) {
            str = text.substring(0, limit-3).trim()+'...';
            this.data.truncated = true;
        }

        if(text.trim().length === 0) {
            text = "undefined";
        }

        return str;
    }

    setColor(color) {
        this.embed.setColor(color);
        return this;
    }

    setIcon(icon) {
        if(this.embed.author) {
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

    addSection(_title, _content) {
        // todo: add zero-width character to fix giant emoji on mobile
        let zw = "​";

        let title = this._truncate(_title, 256);
        let title_r = title;

        let final_content = _content;
        let final_content_raw = _content;

        if(typeof _content !== 'string') {
            if(_content.constructor === Object) {
                if(_content.data) {
                    final_content = _content.data;
                    final_content_raw = _content.raw || _content.data;
                } else {
                    final_content = "undefined";
                    final_content_raw = "undefined";
                }
            }
    
            if(final_content.constructor === djs.User) {
                final_content_raw = `USER: ${final_content.tag} (${final_content.id})`;
    
                final_content = [
                    `${final_content.toString()} | ${final_content.tag}`,
                    `\`\`\`yaml\nID: ${final_content.id}\`\`\``
                ].join('\n');
            } else
            if(final_content.constructor === djs.Message) {
                final_content_raw = [
                    `CHANNEL: ${final_content.channel.name} (${final_content.channel.id})`,
                    `DIRECT URL${(final_content.deleted) ? " (DELETED):" : ":"} ${final_content.url}`
                ].join('\n');
    
                final_content = `${final_content.channel.toString()} | [Direct URL](${final_content.url}) ${(final_content.deleted) ? "(deleted)" : ""}`;
            }
        }

        final_content = this._truncate(final_content, 1024);

        this.embed.addField(title, final_content);
        this.ptd.sections.push({
            title: title_r,
            content: final_content_raw
        });

        return this;
    }

    submit(destination) {
        return new Promise((resolve, reject) => {
            const bot = this.bot;
            const log = this.bot.log;

            if(this.data.publishing.console) {
                let plaintext = [];
                let w = 64;
                let div = `#`.repeat(w);

                let center = (text, width) => {
                    if(text.length > width) return text;
                    
                    let left = Math.floor((width - (text.length)) / 2);
                    let right = Math.ceil((width - (text.length)) / 2);

                    return `${" ".repeat(left)}${text}${` `.repeat(right)}`;
                }

                plaintext.push(
                    center(this.ptd.report || `<Unknown Report>`, w),
                    center(`${this.data.time.toUTCString()}`, w),
                    center(`${this.data.caller} (approx.)`, w),
                    ``,
                    div,
                    ``,
                    this.ptd.title || `<Untitled>`,
                    ``,
                )

                if(this.ptd.header) {
                    plaintext.push(
                        `------ ${this.ptd.header} ------`,
                        ``,
                    );
                }

                if(this.ptd.description) {
                    plaintext.push(
                        this.ptd.description,
                        ``,
                    );
                }

                if(this.ptd.sections.length > 0) {
                    for(let i = 0; i < this.ptd.sections.length; i++) {
                        let section = this.ptd.sections[i];

                        plaintext.push(
                            `--- ${section.title} ---`,
                            section.content,
                            ``,
                        )

                        if(i+1 < this.ptd.sections.length) {
                            plaintext.push(``);
                        }
                    }
                }

                log(`\n\n\n${plaintext.join('\n')}\n\n\n`, 'info');
            }

            if(this.data.publishing.embed) {
                bot.guilds.cache.get(bot.cfg.guilds.log).channels.cache.get(bot.cfg.channels.log[destination] || bot.cfg.channels.log.misc).send({
                    embed: this.embed,
                    files: this.data.files
                }).then(msg => {
                    resolve(msg);
                }).catch(err => {
                    reject(err);
                })
            }
        });
    }
}
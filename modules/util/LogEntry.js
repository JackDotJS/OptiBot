const util = require(`util`);
const djs = require(`discord.js`);
const cid = require('caller-id');
const timeago = require("timeago.js");

module.exports = class LogEntry {
    constructor(bot, opts = {time: new Date(), console: true, embed: true, channel: "misc"}) {
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
                console: (opts.console === undefined) ? true : opts.console,
                embed: (opts.embed === undefined) ? true : opts.embed
            },
            time: (opts.time === undefined) ? new Date() : opts.time,
            channel: (opts.channel === undefined) ? "misc" : opts.channel,
            caller: new Error().stack.split('\n')[2].match(/\w+\.js:\d+:\d+/i),
            icon: null,
            message: null
        };

        data.channel = bot.cfg.channels.log[data.channel];

        if(!data.channel) {
            data.channel = bot.cfg.channels.log["misc"]
        }

        data.channel = bot.guilds.cache.get(bot.cfg.guilds.log).channels.cache.get(data.channel);

        data.embed.setFooter(`Click on embed title for plaintext report.\nEvent logged on ${data.time.toUTCString()}`)
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

    preLoad() {
        if(this.data.publishing.embed) {
            let embed = new djs.MessageEmbed()
            .setColor(this.bot.cfg.embed.default)
            .setTitle(`Loading...`)

            this.data.channel.send(embed).then(msg => {
                this.data.message = msg;
            });
        }
        
        return this;
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
                if(_content.data && _content.raw) {
                    final_content = _content.data;
                    final_content_raw = _content.raw;
                } else {
                    final_content = "undefined";
                    final_content_raw = "undefined";
                }
            }
    
            if(final_content.constructor === djs.User || final_content.constructor === djs.GuildMember) {
                let mem = (final_content.constructor === djs.GuildMember) ? final_content.user : final_content;
                if (!_content.raw) final_content_raw = `USER: ${mem.tag} (${mem.id})`;
    
                final_content = [
                    `${mem.toString()} | ${mem.tag}`,
                    `\`\`\`yaml\nID: ${mem.id}\`\`\``
                ].join('\n');
            } else
            if(final_content.constructor === djs.Message) {
                if (!_content.raw) final_content_raw = [
                    `CHANNEL: #${final_content.channel.name} (${final_content.channel.id})`,
                    `DIRECT URL${(final_content.deleted) ? " (DELETED):" : ":"} ${final_content.url}`
                ].join('\n');
    
                final_content = `${final_content.channel.toString()} | [Direct URL](${final_content.url} "${final_content.url}") ${(final_content.deleted) ? "(deleted)" : ""}`;
            } else
            if(final_content.constructor === Date) {
                final_content = `${final_content.toUTCString()} \n(${timeago.format(final_content)})`;

                if (!_content.raw) final_content_raw = final_content;
            } else
            if(final_content.constructor === Number) {
                final_content = final_content.toLocaleString();

                if (!_content.raw) final_content_raw = final_content;
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

    submit(includeRaw) {
        return new Promise((resolve, reject) => {
            const bot = this.bot;
            const log = this.bot.log;

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
                center(this.ptd.report, w),
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

            plaintext = plaintext.join('\n');

            if(this.data.publishing.console) {
                log(`\n\n\n${plaintext}\n\n\n`, 'info');
            }

            if(this.data.publishing.embed) {
                bot.guilds.cache.get(bot.cfg.guilds.optibot).channels.cache.get(bot.cfg.channels.logFiles).send({
                    files: [new djs.MessageAttachment(Buffer.from(plaintext), `${this.ptd.report.toLowerCase().replace(' ', '_')}.txt`)]
                }).then(att => {
                    if(this.embed.author) {
                        this.embed.author.url = [...att.attachments.values()][0].url
                    } else {
                        this.embed.setAuthor('<Untitled>', undefined, [...att.attachments.values()][0].url)
                    }

                    if(this.data.message) {
                        this.data.message.edit(this.embed).then(msg => {
                            resolve(msg);
                        }).catch(err => {
                            // todo: try to log in given channel
                            reject(err);
                        })
                    } else {
                        this.data.channel.send(this.embed).then(msg => {
                            resolve(msg);
                        }).catch(err => {
                            // todo: try to log in given channel
                            reject(err);
                        });
                    }
                });
            }
        });
    }
}
/**
 * OptiBot NX - Core & Boot Manager
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Written by Kyle Edwards <wingedasterisk@gmail.com>, January 2020
 * 
 * My final gift to you.
 * Here's to another lousy decade.
 */

const child = require(`child_process`);
const readline = require(`readline`);
const fs = require(`fs`);
const util = require(`util`);
const crypto = require(`crypto`);
const callerId = require(`caller-id`);
const AZip = require('adm-zip');
const pkg = require(`./package.json`);

const env = {
    mode: 0,
    log: {
        /**
         * 0 = TRACE
         * 1 = DEBUG
         * 2 = INFO
         * 3 = WARN
         * 4 = ERROR
         * 5 = FATAL
         */
        level: 2,
        stream: null,
        filename: null
    },
    rl: null,
    autostart: {
        rph: 0,
        hour: 0,
        interval: setInterval(() => {
            let now = new Date().getHours();
            if(now !== env.autostart.hour) {
                env.autostart.rph = 0;
                env.autostart.hour = now;
            }
        }, 1000)
    },
    cr: {
        logfile: null
    },
    r: {
        author: null,
        guild: null,
        channel: null,
        message: null
    }
}

const log = (m, lvl, file) => {
    let call = callerId.getData();
    let now = new Date();
    let t_hour = now.getUTCHours().toString().padStart(2, '0');
    let t_min = now.getUTCMinutes().toString().padStart(2, '0');
    let t_sec = now.getUTCSeconds().toString().padStart(2, '0');
    let t_ms = now.getUTCMilliseconds().toString().padStart(3, '0');
    let entry = {
        timestamp: {
            content: `${t_hour}:${t_min}:${t_sec}.${t_ms}`,
            color: `\x1b[0m`
        },
        file: {
            content: `${call.filePath.substring(call.filePath.lastIndexOf(`\\`)+1)}:${call.lineNumber}`,
            color: `\x1b[33m`
        },
        level: {
            content: `TRACE`,
            color: `\x1b[35m`
        },
        message: {
            content: m,
            color: `\x1b[97m`
        }
    }

    if(lvl) {
        if(lvl.toLowerCase() === `fatal`) {
            entry.level.content = `FATAL`;
            entry.level.color = '\x1b[7;91m';
            entry.message.color = '\x1b[91m';
        } else
        if(lvl.toLowerCase() === `error`) {
            if (env.log.level > 4) return;
            entry.level.content = `ERROR`;
            entry.level.color = '\x1b[91m';
            entry.message.color = '\x1b[91m';
        } else
        if(lvl.toLowerCase() === `warn`) {
            if (env.log.level > 3) return;
            entry.level.content = `WARN`;
            entry.level.color = '\x1b[93m';
            entry.message.color = '\x1b[93m';
        } else
        if(lvl.toLowerCase() === `info`) {
            if (env.log.level > 2) return;
            entry.level.content = `INFO`;
            entry.level.color = '\x1b[0m';
            entry.message.color = '\x1b[97m';
        } else
        if(lvl.toLowerCase() === `debug`) {
            if (env.log.level > 1) return;
            entry.level.content = `DEBUG`;
            entry.level.color = '\x1b[35m';
            entry.message.color = '\x1b[35m';
        } else
        if (env.log.level > 0) return;
    } else
    if (env.log.level > 0) return;

    if(typeof m !== `string`) {
        entry.message.color = `\x1b[33m`;
        if(m instanceof Error) {
            entry.message.content = m.stack;
        } else 
        if(Buffer.isBuffer(m)) {
            entry.message.content = m.toString();
        } else {
            try {
                entry.message.content = util.inspect(m, {getters: true, showHidden: true})
            }
            catch(e) {
                try {
                    entry.message.content = m.toString();
                }
                catch(e) {
                    log(`failed interp of log entry`, `error`);
                }
            }
        }
    }

    if(file) {
        entry.file.content = file;
    }

    let m1c = `[${entry.timestamp.content}] [${entry.file.content}] [${entry.level.content}] : `;
    let m2c = entry.message.content.replace(/\n/g, `\n${(` `.repeat(m1c.length))}`)+`\n`;

    let m1 = `[${entry.timestamp.color}${entry.timestamp.content}\x1b[0m] [${entry.file.color}${entry.file.content}\x1b[0m] ${entry.level.color}[${entry.level.content}]\x1b[0m : `;
    let m2 = entry.message.color+entry.message.content.replace(/\n/g, `\n${(` `.repeat(m1c.length))}`)+`\x1b[0m`;

    console.log(m1+m2);
    if(env.log.stream) env.log.stream.write(m1c+m2c);
}

// check and setup required directories and files

if (!fs.existsSync(`./assets`)) {
    throw new Error(`./assets directory not found.`);
}

if (!fs.existsSync(`./assets/img`)) {
    throw new Error(`./assets/img directory not found.`);
}

if (!fs.existsSync(`./cfg`)) {
    throw new Error(`./cfg directory not found.`);
}

if (!fs.existsSync(`./cfg/config.json`)) {
    throw new Error(`./cfg/config.json file not found.`);
}

if (!fs.existsSync(`./cfg/keys.json`)) {
    throw new Error(`./cfg/keys.json file not found.`);
}

if(typeof require(`./cfg/keys.json`).discord !== 'string') {
    throw new Error(`./cfg/keys.json - Missing Discord API token.`);
}

if (!fs.existsSync(`./archive`)) {
    fs.mkdirSync(`./archive`)
}

if (!fs.existsSync(`./archive/logs`)) {
    fs.mkdirSync(`./archive/logs`)
}

if (!fs.existsSync(`./archive/data`)) {
    fs.mkdirSync(`./archive/data`)
}

if (!fs.existsSync(`./data`)) {
    fs.mkdirSync(`./data`)
}

if (!fs.existsSync(`./data/profiles.db`)) {
    fs.writeFileSync(`./data/profiles.db`, ``);
}

if (!fs.existsSync(`./logs`)) {
    fs.mkdirSync(`./logs`)
}

if (!fs.existsSync(`./modules`)) {
    throw new Error(`OptiBot Modules directory not found.`);
}

if (!fs.existsSync(`./modules/cmd`)) {
    throw new Error(`Commands directory not found.`);
}

if (!fs.existsSync(`./modules/core`)) {
    throw new Error(`Core Module directory not found.`);
}

if (!fs.existsSync(`./modules/core/OptiBot.js`)) {
    throw new Error(`OptiBot Core Module not found.`);
}

process.title = `OptiBot ${pkg.version}`;

(function q1() {
    process.stdout.write('\033c');
    process.stdout.write(`\u001b[2J\u001b[0;0H`);
    if(process.argv.indexOf(`--skipsetup`) > -1) {
        env.mode = parseInt(process.argv.indexOf(`--skipsetup`) + 1);
        init();
    } else {
        env.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        env.rl.question(`START OPTIBOT [Y/N]\n`, (res) => {
            if(res.trim().toLowerCase() === `y`) {
                q2();
            } else
            if(res.trim().toLowerCase() === `n`) {
                process.exit();
            } else {
                q1();
            }
        });
    }
})();

function q2() {
    process.stdout.write('\033c');
    process.stdout.write(`\u001b[2J\u001b[0;0H`);
    env.rl.question(`SET OPERATING MODE [0-3]\n`, (res) => {
        let mode = parseInt(res);

        if(isNaN(mode) || mode < 0 || mode > 3) {
            q2();
        } else {
            /**
             * MODE 0 - FULL FEATURE SET, CLOSED ACCESS | CODE MODE
             * MODE 1 - LIMITED FEATURE SET, CLOSED ACCESS | ULTRALIGHT MODE
             * MODE 2 - LIMITED FEATURE SET, PUBLIC ACCESS | LITE MODE
             * MODE 3 - FULL FEATURE SET, PUBLIC ACCESS | NORMAL
             */
            env.mode = mode;
            if(mode === 0) env.log.level = 0;

            env.rl.close();
            init();
        }
    });
}

function init() {
    process.stdout.write('\033c');
    process.stdout.write(`\u001b[2J\u001b[0;0H`);

    // 🦀

    process.title = `OptiBot ${pkg.version} | Spawning Process...`;
    
    env.log.filename = new Date().toUTCString().replace(/[/\\?%*:|"<>]/g, `.`)
    env.log.stream = fs.createWriteStream(`./logs/${env.log.filename}.log`);
    
    function preinit() {
        if(env.autostart.rph > 5 && env.mode != 0) {
            log(`Pre-Init: Unusually high client reset count: ${env.autostart.rph}`, 'warn')
            if(env.autostart.rph > 50) {
                log(`Pre-Init: Potential boot loop detected, shutting down for safety.`, 'warn')
                return end(19, true, 'FATAL')
            }
        }

        log(`Pre-Init: Backing up OptiBot profiles...`, 'info')
        let pzip = new AZip();
        pzip.addLocalFile(`./data/profiles.db`)

        pzip.writeZip(`./archive/data/profiles_before_${env.log.filename}.zip`, (err) => {
            if(err) throw err;

            log(`Pre-Init: OptiBot profiles successfully archived.`, 'info')

            if(new Date().getUTCDate() === 1) {
                log(`Pre-Init: Archiving log files...`, 'info')
                let logs = fs.readdirSync('./logs');

                let zipData = {}
                let current = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

                for(let log of logs) {
                    if(!log.endsWith('.log')) continue;
                    let creation = new Date(Math.min(fs.statSync(`./logs/${log}`).mtime.getTime(), Date.parse(log.substring(0, log.lastIndexOf("GMT")+3).replace(/\./g, ":"))))

                    if(creation.toLocaleString('default', { month: 'long', year: 'numeric' }) === current) continue;

                    let target = `${creation.getUTCMonth()}_${creation.getUTCFullYear()}`;

                    if(zipData[target] != null) {
                        zipData[target].files.push(log);
                    } else {
                        zipData[target] = {
                            files: [log],
                            name: `${creation.toLocaleString('default', { month: 'long', year: 'numeric' })}`
                        }
                    }
                }

                let keys = Object.keys(zipData);

                if(keys.length === 0) {
                    spawn();
                } else {
                    log(`Pre-Init: Preparing to write ${keys.length} ZIP archive(s)...`, 'info')

                    let archived = 0;
                    let i = 0;
                    (function nextZip() {
                        if (i >= keys.length) {
                            log(`Pre-Init: Successfully archived ${archived} log files.`, 'info')
                            return spawn();
                        }

                        let data = zipData[keys[i]];
                        let path = `./archive/logs/${data.name}.zip`;
                        let zip = (fs.existsSync(path)) ? new AZip(path) : new AZip();

                        for(let file of data.files) {
                            archived++;
                            zip.addLocalFile(`./logs/${file}`);
                            fs.unlinkSync(`./logs/${file}`);
                        }

                        zip.writeZip(path, (err) => {
                            if(err) log(err.stack, 'error');

                            i++;
                            nextZip();
                        })
                    })();
                }
            } else {
                spawn();
            }
        });
    }

    function spawn() {
        log('OptiBot is now booting...', 'info');
        const bot = child.spawn('node', ['index.js', env.mode, env.log.filename], {
            stdio: ['pipe', 'pipe', 'pipe', 'ipc']
        });

        var chunks_out = [];
        bot.stdout.on('data', (data) => {
            chunks_out = chunks_out.concat(data);
            log(data, undefined, 'index.js:NULL');
        });
        bot.stdout.on('end', () => {
            let content = Buffer.concat(chunks_out).toString();
            if (content.length > 0) log(content, undefined, 'index.js:NULL');
            chunks_out = [];
        });

        var chunks_err = [];
        bot.stderr.on('data', (data) => {
            chunks_err = chunks_err.concat(data);
            log(data, 'fatal', 'index.js:NULL');
        });
        bot.stderr.on('end', () => {
            let content = Buffer.concat(chunks_err).toString();
            if (content.length > 0) log(content, 'fatal', 'index.js:NULL');
            chunks_err = [];
        });

        bot.on('message', (data) => {
            if(data.type === 'log') {
                log(data.message, data.level, data.misc);
            } else
            if(data.type === 'ready') {
                log('Bot ready');
                if(env.cr.logfile !== null) {
                    // send crash data
                    bot.send({ crashlog: env.cr.logfile }, (err) => {
                        if(err) {
                            log('Failed to send crashlog data: '+err.stack, 'error');
                        } else {
                            // once finished, clear crash data so it's not sent again during next scheduled restart.
                            env.cr.logfile = null;
                        }
                    });
                }

                if(env.r.guild !== null) {
                    // send restart data
                    bot.send({ restart: env.r }, (err) => {
                        if(err) {
                            log('Failed to send restart data: '+err.stack, 'error');
                        } else {
                            env.r.guild = null;
                            env.r.channel = null;
                            env.r.message = null;
                            env.r.author = null;
                        }
                    });
                }
            } else
            if(data.type === 'logLvl') {
                env.log.level = parseInt(data.content)
                log('Log level updated.', 'fatal');
            } else
            if(data.type === 'restart') {
                env.r.guild = data.guild;
                env.r.channel = data.channel;
                env.r.message = data.message;
                env.r.author = data.author;
            }
        });

        bot.on('exit', (code) => {
            log(`Child process ended with exit code ${code}`, 'info');

            if([18, 1].indexOf(code) > -1) {
                env.r.guild = null;
                env.r.channel = null;
                env.r.message = null;
                env.r.author = null;
            }

            if(code === 0) {
                log('OptiBot is now shutting down at user request.', 'info');
                end(code, true);
            } else
            if(code === 1) {
                log('OptiBot seems to have crashed. Restarting...', 'info');
                let logSuffix = 'CRASH';

                env.cr.logfile = `${env.log.filename}_${logSuffix}.log`;
                setTimeout(() => {
                    end(code, false, logSuffix)
                }, (env.mode === 0) ? 5000 : 10);
            } else
            if(code === 2) {
                log('Bash Error. (How the fuck?)', 'fatal');
                end(code, true);
            } else
            if(code === 3) {
                log('Internal JavaScript parse error.', 'fatal');
                end(code, true);
            } else
            if(code === 4) {
                log('Internal JavaScript Evaluation Failure.', 'fatal');
                end(code, true);
            } else
            if(code === 5) {
                log('Fatal Error.', 'fatal');
                end(code, true);
            } else
            if(code === 6) {
                log('Non-function Internal Exception Handler.', 'fatal');
                end(code, true);
            } else
            if(code === 7) {
                log('Internal Exception Handler Run-Time Failure.', 'fatal');
                end(code, true);
            } else
            if(code === 8) {
                log('Uncaught exception. (Unused in newer NodeJS)', 'fatal');
                end(code, true);
            } else
            if(code === 9) {
                log('Invalid Launch Argument(s).', 'fatal');
                end(code, true);
            } else
            if(code === 10) {
                log('Internal JavaScript Run-Time Failure.', 'fatal');
                end(code, true);
            } else
            if(code === 12) {
                log('Invalid Debug Argument(s).', 'fatal');
                end(code, true);
            } else


            if(code === 16) {
                log('OptiBot is now restarting at user request...', 'info');
                end(code, false);
            } else
            if(code === 17) {
                if(env.mode === 0) {
                    log('OptiBot cannot be updated in mode 0. Restarting...', 'info');
                    end(16, false);
                } else {
                    log('OptiBot is now being updated...', 'info');
                    update();
                }
            } else
            if(code === 18) {
                log('OptiBot is now undergoing scheduled restart.', 'info');
                end(code, false);
            } else
            if(code === 19) {
                log('OptiBot is shutting down automatically.', 'fatal');
                end(code, true, 'FATAL');
            } else

            
            if(code > 128) {
                log(`Signal exit code ${code - 128}.`, 'fatal');
                end(code, true);
            }
        });
    }

    function end(code, exit, log_suffix) {
        env.autostart.rph++;

        setTimeout(() => {
            env.log.stream.end();

            if(log_suffix) {
                fs.rename(`./logs/${env.log.filename}.log`, `./logs/${env.log.filename}_${log_suffix}.log`, (err) => {
                    if(err) throw err;
                    else {
                        if(exit) {
                            process.exit(code);
                        } else {
                            setTimeout(() => {
                                init();
                            }, (env.mode === 0) ? 5000 : 500);
                        }
                    }
                });
            } else {
                setTimeout(() => {
                    if(exit) {
                        process.exit(code);
                    } else {
                        init();
                    }
                }, 500);
            }
        }, 500);
    }

    function update() {
        setTimeout(() => {
            child.execSync('git fetch --all');
            child.execSync('git reset --hard origin/master');
            child.execSync('npm install');

            setTimeout(() => {
                env.log.stream.end();

                setTimeout(() => {
                    // i know this looks like a fucking mess of commands and switches but trust me it NEEDS to be structured precisely like this to work.
                    // fuck windows batch
                    child.spawn(`cmd`, ['/C', 'start', '""', 'cmd', '/C', 'init.bat', '--skipsetup', env.mode], {
                        detached: true,
                        stdio: 'ignore',
                        cwd: __dirname
                    }).unref();

                    process.exit(3);
                }, 500);
            }, 500);
        }, 500);
    }

    preinit();
}
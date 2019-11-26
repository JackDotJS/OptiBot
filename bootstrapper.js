// Written by Kyle Edwards <wingedasterisk@gmail.com>, August 2019
// I put a lot of work into this, please don't redistribute it or anything.
// ========================================================================
// OptiBot 2.0 Head Node: Bootstrapper

////////////////////////////////////////////////////////////////////////////////
// Dependencies, Configuration files
////////////////////////////////////////////////////////////////////////////////

const { spawn } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const crypto = require('crypto');
const callerId = require('caller-id');

const pkg = require('./package.json');

////////////////////////////////////////////////////////////////////////////////
// Pre-Initialize
////////////////////////////////////////////////////////////////////////////////

const env = {
    debug: false,
    log: null,
    logName: null,
    loglvl: 2,
    init: new Date(),
    args: process.argv,
    rl: readline.createInterface({
        input: process.stdin,
        output: process.stdout
    }),
    rph: 0, // resets per hour
    currentHour: 0,
    crashData: null
}

const log = (m, lvl, data) => {
    let now = new Date();

    let timestamp = `${('0'+now.getHours()).slice(-2)}:${('0'+now.getMinutes()).slice(-2)}:${('0'+now.getSeconds()).slice(-2)}.${('00'+now.getMilliseconds()).slice(-3)}`;
    let path = callerId.getData().filePath;
    let filename = path.substring(path.lastIndexOf('\\')+1);
    let line = callerId.getData().lineNumber;
    let level = '[INFO]';
    let message = String(m);
    let message_color = '\x1b[97m';
    let level_color = '';
    let file_color = '\x1b[33m';
    let color_reset = '\x1b[0m';

    if(lvl) {
        if(lvl.toLowerCase() === 'fatal') {
            level = '[FATAL]';
            level_color = '\x1b[7;91m';
            message_color = '\x1b[91m';
        } else
        if(lvl.toLowerCase() === 'error') {
            if(env.loglvl > 4) return;
            level = '[ERROR]';
            level_color = '\x1b[91m';
            message_color = '\x1b[91m';
        } else
        if(lvl.toLowerCase() === 'warn') {
            if(env.loglvl > 3) return;
            level = '[WARN]';
            level_color = '\x1b[93m';
            message_color = '\x1b[93m';
        } else
        if(lvl.toLowerCase() === 'debug') {
            if(env.loglvl > 1) return;
            level = '[DEBUG]';
            level_color = '\x1b[35m';
            message_color = '\x1b[35m';
        } else
        if(lvl.toLowerCase() === 'trace') {
            if(env.loglvl > 0) return;
            level = '[TRACE]';
            level_color = '\x1b[35m';
            message_color = '\x1b[35m';
        }
    }

    if(!lvl || lvl.toLowerCase() === 'info') {
        if(env.loglvl > 2) return;
        level = '[INFO]';
        level_color = '';
        message_color = '\x1b[97m';
    }

    
    if(typeof m !== 'string') {
        message_color = '\x1b[33m';
        if(typeof m === 'null') {
            message = 'null';
            finalSend();
        } else
        if(typeof m === 'function') {
            message = m.toString();
            finalSend();
        } else
        if(typeof m === 'undefined') {
            message = 'undefined';
            finalSend();
        } else 
        if(Buffer.isBuffer(m)) {
            message = m.toString();
            finalSend();
        } else 
        if(m instanceof Error) {
            if(!lvl) {
                level = '\x1b[91m[ERROR]';
                message_color = '\x1b[91m';
            }
            message = m.stack;
            finalSend();
        } else {
            try {
                // try Map
                Map.prototype.has.call(m);
                message = JSON.stringify(Object.fromEntries(m), null, 4);
                finalSend();
            } 
            catch(e2) {
                try {
                    // try Set
                    Set.prototype.has.call(m);
                    message = JSON.stringify(Array.from(m), null, 4);
                    finalSend();
                }
                catch(e3) {
                    try {
                        // try JSON
                        message = JSON.stringify(m, null, 4);
                        finalSend();
                    }
                    catch(e) {
                        console.log('failed interp');
                        finalSend();
                    }
                    
                }
            }
        }
    } else {
        finalSend();
    }

    function finalSend() {
        let m1_clean = `[${timestamp}] [${(data) ? data : filename+':'+line}] ${level} : `;
        let m2_clean = message.replace(/\n/g, '\n'+(' '.repeat(m1_clean.length)));

        let m1 = `[${timestamp}] [${file_color}${(data) ? data : filename+':'+line}${color_reset}] ${level_color}${level}\x1b[0m : `;
        let m2 = message_color+message.replace(/\n/g, '\n'+(' '.repeat(m1_clean.length)))+'\x1b[0m';
        

        console.log(m1+m2);
        env.log.write(m1_clean+m2_clean+'\n');
    }
}

////////////////////////////////////////////////////////////////////////////////
// Initialize
////////////////////////////////////////////////////////////////////////////////

process.title = `OptiBot ${pkg.version}`;

setInterval(() => {
    let now = new Date();
    if(now.getHours() !== env.currentHour) {
        env.rph = 0;
        env.currentHour = now.getHours();
    }
}, 1000);

(function setup_dirs() {
    init_q1();
    return;

    (function check_cfg() {
        fs.mkdir('./cfg', (err) => {
            if(err) {
                if(err.code === 'EEXIST') {
                    check_data();
                } else throw err;
            } else {
                
            }
        });
    })();

    function check_data() {
        return;
        let buildTemplate = {
            num:0,
            hash:"nodata"
        }
    
        fs.mkdir('./data', (err) => {
            if(err) {
                if(err.code === 'EEXIST') {
                    check_logs();
                } else throw err;
            } else {
                fs.writeFile('./data/build.json', JSON.stringify(buildTemplate), (err) => {
                    if(err) throw err;
                    else {
                        check_logs();
                    }
                });
            }
        });
    }

    function check_logs() {
        return;
        fs.mkdir('./logs', (err) => {
            if(err && err.code !== 'EEXIST') throw err;
            else {
                setup_files()
            }
        });
    }
})();

function setup_files() {
    return;
    // todo: check if files exist before writing

    let default_config = {
        "basic": {
            "trigger": "!",
            "of_server": "423430686880301056",
            "ob_server": "517649143590813707"
        },
        "cd": {
            "timer_min": 5,
            "timer_max": 30,
            "ol_threshold": 1,
            "ol_timer": 2,
            "post_timer_mult": 3,
            "post_timer": 3,
            "countdown_interval": 2,
            "show_countdown": true
        },
        "db": {
            "size": 64
        },
        "vs": {
            "embed": {
                "default": "E29F00",
                "okay": "43B581",
                "error": "DD2E44"
            },
            "typer": true
        },
        "superusers": [
            "181214529340833792",
            "271760054691037184"
        ],
        "roles": {
            "shader_dev": "423834274601369601",
            "texture_artist": "423836695301980171",
            "mod_dev": "423839066631569408",
            "muted": "551089007078015025",
            "donator": "424169541346525194",
            "moderator": "467060304145023006"
        },
        "channels": {
            "blacklist": [
                "479192475727167488",
                "531622141393764352",
                "531622838881484800",
                "423433522842173451",
                "468678768043753482"
            ],
            "mod": [
                "519150952863891458",
                "467073441904984074",
                "545801068664324106"
            ]
        },
        "splash": [
            "uwu",
            "<3",
            "${splashtext}",
            "if (\"true\" === \"true\") return !false",
            "now in 3 new flavors",
            "while yall here be sure to check out my soundcloud",
            "lmao n00b gg ez",
            "psp exclusive",
            "bot of the year",
            "this bot has gone 0 days bug-free",
            "[next version] hype",
            "optifine 1.14 when???",
            "i cant read",
            "establish communism",
            "my wife left me",
            "FUCK EPIC",
            "the all new range rover sport",
            "hilarious joke",
            "JavaScript, also known as Java for short."
        ]
    }

    fs.writeFile('./cfg/config.json', JSON.stringify(default_config), (err) => {
        if(err) throw err;
        else {
        }
    });


}

function init_q1() {
    env.rl.question('Start OptiBot? [Y/N]', (res) => {
        if(res.trim().toLowerCase() === 'y') {
            init_q2();
        } else
        if(res.trim().toLowerCase() === 'n') {
            process.exit();
        } else {
            init_q1();
        }
    });
}

function init_q2() {
    env.rl.question('Enable Development Flags? [Y/N]', (res) => {
        if(res.trim().toLowerCase() === 'y') {
            env.debug = true;
            env.loglvl = 0;
            env.rl.close();
            init_final()
        } else
        if(res.trim().toLowerCase() === 'n') {
            env.rl.close();
            init_final()
        } else {
            init_q2();
        }
    });
}

function init_final() {
    let now = new Date();
    env.logName = now.toUTCString().replace(/[/\\?%*:|"<>]/g, '.');
    env.log = fs.createWriteStream(`./logs/${env.logName}.log`);

    setTimeout(() => {
        if(env.rph > 8 && !env.debug) {
            log(`Reset limit exceeded.`, 'fatal');
            log(`OptiBot encountered too many fatal errors and is shutting down to prevent any further damage. This is likely a problem that the program cannot solve on it's own.`);
            end(code, true, 'OVERFLOW');
        } else {
            log('Initialization: Copying profiles for safety', 'debug');
            fs.copyFile(`./data/profiles.db`, `./archive/data/profiles_before_${env.logName}.db`, (err) => {
                if(err) throw err
                else {
                    // check build #
                    fs.readFile('./index.js', (err, data) => {
                        if(err) throw err;
                        else {
                            fs.readFile('./data/build.json', (err, hash) => {
                                if(err) throw err;
                                else {
                                    let old_build = JSON.parse(hash);
                                    let new_build = crypto.createHmac('sha256', 'optibot').update(data).digest('hex');
                
                                    if(old_build.hash !== new_build) {
                                        let build_data = {
                                            num: old_build.num+1,
                                            hash: new_build
                                        }
                
                                        fs.writeFile('./data/build.json', JSON.stringify(build_data), (err) => {
                                            if(err) throw err;
                                            else {
                                                startBot()
                                            }
                                        });
                                    } else {
                                        startBot()
                                    }
                                }
                            });
                        }
                    });

                    function startBot() {
                        process.stdout.write('\033c');
                        log('Initialization: Spawning child process (index.js)', 'debug');
                        const optibot = spawn('node', ['index.js', env.debug], {
                            stdio: ['pipe', 'pipe', 'pipe', 'ipc']
                        });

                        let crashData_temp = null;
                        

                        optibot.stdout.on('data', (data) => {
                            log(data, undefined, 'index.js:NULL');
                        });

                        optibot.stderr.on('data', (data) => {
                            log(data, 'fatal', 'index.js:NULL');
                        });

                        optibot.on('message', (data) => {
                            //log(data, 'trace');
                            if(data.type === 'log') {
                                if (typeof data.misc !== 'undefined') {
                                    log(data.message, data.level, data.misc);
                                }
                            } else
                            if(data.type === 'ready') {
                                log('Bot ready', 'debug');
                                log(env.crashData, 'debug');
                                if(env.crashData) {
                                    log('It seems OptiBot recovered from a crash.', 'warn')
                                    optibot.send({
                                        crash: env.crashData
                                    });

                                    env.crashData = null;
                                }
                            } else
                            if(data.type === 'status') {
                                log(`Status acknowledged`, 'debug');
                                crashData_temp = {
                                    guild: data.guild,
                                    channel: data.channel,
                                    message: data.message,
                                    log: env.logName
                                }
                                log(crashData_temp, 'trace');
                            } else
                            if(data.type === 'logName') {
                                optibot.send({
                                    type: data.type,
                                    content: env.logName,
                                    id: data.id
                                });
                            } else
                            if(data.type === 'logLvl') {
                                env.loglvl = parseInt(data.content)
                                log('Log level updated.', 'fatal');
                            } else
                            if(data.type === 'startup') {
                                optibot.send({
                                    type: data.type,
                                    content: env.init.getTime(),
                                    id: data.id
                                });
                            } else
                            if(data.type && data.id) {
                                log(`Unknown data request: ${data.type}`, 'warn');
                                optibot.send({
                                    type: 'null',
                                    content: 'null',
                                    id: data.id
                                })
                            }
                        });

                        optibot.on('exit', (code) => {
                            setTimeout(() => {
                                log(`Child process ended with exit code ${code}`);

                                if(code === 0) {
                                    log('OptiBot is now shutting down at user request.');
                                    end(code, true);
                                } else
                                if(code === 1) {
                                    log('OptiBot seems to have crashed. Restarting...');
                                    let logSuffix = 'CRASH';

                                    if(crashData_temp) {
                                        log('before', 'trace')
                                        log(env.crashData, 'trace')

                                        crashData_temp.log = `${env.logName}_${logSuffix}.log`;

                                        env.crashData = JSON.parse(JSON.stringify(crashData_temp));
                                        log('after', 'trace')
                                        log(env.crashData, 'trace')
                                    }
                                    end(code, false, logSuffix);
                                } else
                                if(code === 2) {
                                    log('OptiBot is now restarting at user request...');
                                    end(code, false);
                                } else
                                if(code === 3) {
                                    log('Resetting message cache and restarting at user request...');
                                    fs.unlink('./data/messages.db', (err) => {
                                        if(err) log('Failed to delete messages database.', 'fatal');
                                        end(code, false);
                                    });
                                } else
                                if(code === 4) {
                                    log('OptiBot is being updated...');
                                    //unused
                                    update();
                                } else
                                if(code === 10) {
                                    log('OptiBot is now undergoing scheduled restart.');
                                    end(code, false);
                                } else
                                if(code === 24) {
                                    log(`OptiBot encountered a fatal error. This is likely a problem that the program cannot solve on it's own. The program will attempt to restart anyway, just in case.`, 'fatal');
                                    end(code, false, 'FATAL');
                                } else
                                if(code === 1000) {
                                    log(`OptiBot was forcefully shut down.`, 'fatal');
                                    end(code, true, 'OBES');
                                }
                            }, 1000);
                        });
                    }
                }
            });
        }
    }, 1000);

    function end(code, exit, log_suffix) {
        env.rph++;

        setTimeout(() => {
            env.log.end();

            if(log_suffix) {
                fs.rename(`./logs/${env.logName}.log`, `./logs/${env.logName}_${log_suffix}.log`, (err) => {
                    if(err) throw err;
                    else {
                        if(exit) {
                            process.exit(code);
                        } else {
                            setTimeout(() => {
                                init_final();
                            }, (env.debug) ? 5000 : 500);
                        }
                    }
                });
            } else {
                setTimeout(() => {
                    if(exit) {
                        process.exit(code);
                    } else {
                        init_final();
                    }
                }, 500);
            }
        }, 500);
    }

    function update() {
        // todo
        end(undefined, true);
    }
}
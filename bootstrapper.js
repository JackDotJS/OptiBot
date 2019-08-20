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
    loglvl: 0,
    init: new Date(),
    args: process.argv,
    rl: readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })
}

const log = (m, lvl, data) => {
    let now = new Date();

    let timestamp = `${('0'+now.getHours()).slice(-2)}:${('0'+now.getMinutes()).slice(-2)}:${('0'+now.getSeconds()).slice(-2)}.${('00'+now.getMilliseconds()).slice(-3)}`;
    let path = callerId.getData().filePath;
    let filename = path.substring(path.lastIndexOf('\\')+1);
    let line = callerId.getData().lineNumber;
    let level = '[INFO]';
    let message = String(m);
    let message_color = '\x1b[97m'
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
            level = '[ERROR]';
            level_color = '\x1b[91m';
            message_color = '\x1b[91m';
        } else
        if(lvl.toLowerCase() === 'warn') {
            level = '[WARN]';
            level_color = '\x1b[93m';
            message_color = '\x1b[93m';
        } else
        if(lvl.toLowerCase() === 'debug') {
            level = '[DEBUG]';
            level_color = '\x1b[35m';
            message_color = '\x1b[35m';
        } else
        if(lvl.toLowerCase() === 'trace') {
            level = '[TRACE]';
            level_color = '\x1b[35m';
            message_color = '\x1b[35m';
        }
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
                message =JSON.stringify(Object.fromEntries(m));
                finalSend();
            } 
            catch(e2) {
                try {
                    // try Set
                    Set.prototype.has.call(m);
                    message = JSON.stringify(Array.from(m));
                    finalSend();
                }
                catch(e3) {
                    try {
                        // try JSON
                        message = JSON.stringify(m);
                    }
                    catch(e) {
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

(function setup() {
    (function check_cfg() {
        // todo
        check_data();
    })();

    function check_data() {
        let buildTemplate = {
            num:0,
            hash:"nodata"
        
        }
    
        fs.mkdir('./data', (err) => {
            if(err) {
                if(err.code === 'EEXIST') {
                    check_logs();
                } else throw err;
            }
            else {
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
        fs.mkdir('./logs', (err) => {
            if(err && err.code !== 'EEXIST') throw err;
            else {
                init_q1();
            }
        });
    }
})();

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
            init_build()
        } else
        if(res.trim().toLowerCase() === 'n') {
            init_build()
        } else {
            init_q2();
        }
    });
}

function init_build() {
    env.rl.close();

    // check build#
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
                                init_final();
                            }
                        });
                    } else {
                        init_final();
                    }
                }
            });
        }
    });
}

function init_final() {
    let now = new Date();
    env.logName = now.toString().replace(/[/\\?%*:|"<>]/g, '.');
    env.log = fs.createWriteStream(`./logs/${env.logName}.log`);


    process.stdout.write('\033c');
    log('Initialization: Spawning child process (index.js)', 'debug');
    const optibot = spawn('node', ['index.js', env.debug, env.init.getTime()], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc']
    });

    optibot.stdout.on('data', (data) => {
        log(data);
    });

    optibot.stderr.on('data', (data) => {
        log(data, 'fatal');
    });

    optibot.on('message', (data) => {
        if(typeof data.misc !== 'undefined') {
            log(data.message, data.level, data.misc);
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
                end(code, false, true);
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
                update();
            } else
            if(code === 10) {
                log('OptiBot is now undergoing scheduled restart.');
                end(code, false);
            } else
            if(code === 24) {
                log(`OptiBot encountered a fatal error and is shutting down to prevent any further damage. This is likely a problem that the program cannot solve on it's own.`);
                end(code, true, true);
            }
        }, 1000);
    });

    function end(code, exit, error) {
        setTimeout(() => {
            env.log.end();

            if(error) {
                fs.rename(`./logs/${env.logName}.log`, `./logs/${env.logName}_CRASH.log`, (err) => {
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
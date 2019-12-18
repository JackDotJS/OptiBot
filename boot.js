/**
 * OptiBot NX - Core & Boot Manager
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Written by Kyle Edwards <wingedasterisk@gmail.com>, December 2019
 * 
 * My final gift to you.
 * Here's to another lousy decade.
 */

const child = require(`child_process`);
const readline = require(`readline`);
const fs = require(`fs`);
const crypto = require(`crypto`);
const callerId = require(`caller-id`);
const zip = require(`adm-zip`);
const pkg = require(`./package.json`);

const env = {
    dev: false,
    log: {
        /**
         * 0 = TRACE
         * 1 = DEBUG
         * 2 = INFO
         * 3 = WARN
         * 4 = ERROR
         * 5 = FATAL
         */
        level: 0,
        stream: null,
        filename: null
    },
    rl: readline.createInterface({
        input: process.stdin,
        output: process.stdout
    }),
    autostart: {
        rph: 0,
        hour: 0,
        interval: setInterval(() => {
            let now = new Date().getHours();
            if(now !== env.currentHour) {
                env.autostart.rph = 0;
                env.autostart.hour = now;
            }
        }, 1000)
    }
}

const log = (m, lvl, data) => {
    let call = callerId.getData();
    let entry = {
        timestamp: {
            content: `${new Date().toLocaleTimeString()} | ${new Date().getMilliseconds()}`,
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
        if(lvl.toLowerCase() === 'fatal') {
            entry.level.content = 'FATAL';
            entry.level.color = '\x1b[7;91m';
            entry.message.color = '\x1b[91m';
        } else
        if(lvl.toLowerCase() === 'error') {
            if (env.log.level > 4) return;
            entry.level.content = 'ERROR';
            entry.level.color = '\x1b[91m';
            entry.message.color = '\x1b[91m';
        } else
        if(lvl.toLowerCase() === 'warn') {
            if (env.log.level > 3) return;
            entry.level.content = 'WARN';
            entry.level.color = '\x1b[93m';
            entry.message.color = '\x1b[93m';
        } else
        if(lvl.toLowerCase() === 'info') {
            if (env.log.level > 2) return;
            entry.level.content = 'INFO';
            entry.level.color = '\x1b[0m';
            entry.message.color = '\x1b[97m';
        } else
        if(lvl.toLowerCase() === 'debug') {
            if (env.log.level > 1) return;
            entry.level.content = 'DEBUG';
            entry.level.color = '\x1b[35m';
            entry.message.color = '\x1b[35m';
        } else
        if (env.log.level > 0) return;
    }

    if(typeof m !== `string`) {
        entry.message.color = `\x1b[33m`;
        if(typeof m === `null`) {
            entry.message.content = `null`;
        } else
        if(typeof m === `function`) {
            entry.message.content = m.toString();
        } else
        if(typeof m === `undefined`) {
            entry.message.content = `undefined`;
        } else 
        if(Buffer.isBuffer(m)) {
            entry.message.content = m.toString();
        } else 
        if(m instanceof Error) {
            entry.message.content = m.stack;
        } else {
            try {
                // try Map
                Map.prototype.has.call(m);
                entry.message.content = JSON.stringify(Object.fromEntries(m), null, 4);
            } 
            catch(e2) {
                try {
                    // try Set
                    Set.prototype.has.call(m);
                    entry.message.content = JSON.stringify(Array.from(m), null, 4);
                }
                catch(e3) {
                    try {
                        // try JSON
                        entry.message.content = JSON.stringify(m, null, 4);
                    }
                    catch(e) {
                        log(`failed interp of log entry`, `error`);
                    }
                }
            }
        }
    }

    let m1 = `[${entry.timestamp.color}${entry.timestamp.content}\x1b[0m] [${entry.file.color}${entry.file.content}\x1b[0m] ${entry.level.color}[${entry.level.content}]\x1b[0m : `;
    let m2 = entry.message.color+entry.message.content.replace(/\n/g, `\n${(` `.repeat(m1.length))}`)+`\x1b[0m`;

    let m1c = `[${entry.timestamp.content}] [${entry.file.content}] [${entry.level.content}] : `;
    let m2c = entry.message.content.replace(/\n/g, `\n${(` `.repeat(m1.length))}`)+`\n`;

    console.log(m1+m2);
    if(env.log.stream) env.log.stream.write(m1c+m2c);
}

if (!fs.existsSync('./logs')) {
    fs.mkdirSync('./logs')
}

if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data')
}

if (!fs.existsSync('./cmd')) {
    throw new Error('Commands directory not found.');
}

if (!fs.existsSync('./core')) {
    throw new Error('Core directory not found.');
}

if (!fs.existsSync('./cfg')) {
    throw new Error('Config directory not found.');
}

process.title = `OptiBot ${pkg.version}`;

(function q1() {
    process.stdout.write(`\u001b[2J\u001b[0;0H`);
    if(process.argv.indexOf('--skipsetup') > -1) {
        if(process.argv.indexOf('--dev') > -1) {
            env.dev = true;
            env.rl.close();
        } else {
            env.log.level = 2;
        }
        init();
    } else {
        env.rl.question('Start OptiBot [Y/N]\n', (res) => {
            if(res.trim().toLowerCase() === 'y') {
                q2();
            } else
            if(res.trim().toLowerCase() === 'n') {
                process.exit();
            } else {
                q1();
            }
        });
    }
})();

function q2() {
    process.stdout.write(`\u001b[2J\u001b[0;0H`);
    env.rl.question('Enable Dev Environment [Y/N]\n', (res) => {
        if(res.trim().toLowerCase() === 'y') {
            env.dev = true;
            env.rl.close();
            init()
        } else
        if(res.trim().toLowerCase() === 'n') {
            env.log.level = 2;
            env.rl.close();
            init()
        } else {
            q2();
        }
    });
}

function init() {
    process.stdout.write(`\u001b[2J\u001b[0;0H`);
    
    env.log.filename = new Date().toUTCString().replace(/[/\\?%*:|"<>]/g, '.')
    env.log.stream = fs.createWriteStream(`./logs/${env.log.filename}.log`);


    let width = 64; //inner width of box

    function centerText(text, totalWidth) {
        let leftMargin = Math.floor((totalWidth - (text.length)) / 2);
        let rightMargin = Math.ceil((totalWidth - (text.length)) / 2);

        return '│' + (' '.repeat(leftMargin)) + text + (' '.repeat(rightMargin)) + '│';
    }

    log(`╭${'─'.repeat(width)}╮`, 'info'); 
    log(centerText(`  `, width), 'info');
    log(centerText(`OptiBot ${pkg.version}`, width), 'info');
    log(centerText(`(c) Kyle Edwards <wingedasterisk@gmail.com>, 2019`, width), 'info');
    //log(centerText(`Successfully booted in ${bootTimeTaken} seconds.`, width), 'info');
    //log(centerText(`  `, width), 'info');
    //log(centerText(TOOLS.randomizer(cfg.splash), width), 'info');
    log(centerText(`  `, width), 'info');
    log(`╰${'─'.repeat(width)}╯`, 'info');
}
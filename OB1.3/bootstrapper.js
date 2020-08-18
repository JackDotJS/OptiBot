////////////////////////////////////////
//     OptiBot 1.3: Bootstrapper      //
//         Kyle Edwards, 2019         //
////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
// Dependencies, Configuration files
////////////////////////////////////////////////////////////////////////////////

const { spawn } = require('child_process');
const readline = require('readline');
const fs = require('fs');

const pkg = require('./package.json');

////////////////////////////////////////////////////////////////////////////////
// Initialize
////////////////////////////////////////////////////////////////////////////////

var debugMode = false;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

process.stdout.write('\033c'+`OptiBot ${pkg.version} \n`);
process.title = 'OptiBot ' + pkg.version;

(function q_init() {
    rl.question('Confirm Initialization? [Y/N]', (value) => {
        if(value.trim().toLowerCase() === "y") {
            process.stdout.write('\033c'+`OptiBot ${pkg.version} \n`);
            (function q_debug() {
                rl.question('Enable Debug? [Y/N]', (value) => {
                    if(value.toLowerCase() === "y") {
                        rl.close();
                        debugMode = true;
                        // start in DEBUG mode
                        ob_init(debugMode);
                    } else 
                    if(value.toLowerCase() === "n") {
                        rl.close();
                        // start in NORMAL mode
                        ob_init(debugMode);
                    } else {
                        // retry question
                        q_debug();
                    }
                });
            })();
        } else 
        if(value.trim().toLowerCase() === "n") {
            process.exit();
        } else {
            // retry question
            q_init();
        }
    });
})();


function ob_init(debug) {
    process.stdout.write('\033c');

    var start = new Date();
    var startTime = `${start.getDate()}-${start.getMonth()+1}-${start.getFullYear()}_at_${('0'+start.getHours()).slice(-2)}.${('0'+start.getMinutes()).slice(-2)}.${('0'+start.getSeconds()).slice(-2)}`;

    log('spawning child process', 'debug');
    const optibot = spawn('node', ['index.js', debug], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc']
    });

    var logger = fs.createWriteStream('./logs/'+startTime+'.log');
    logger.write('////////////////////////////////////////////////////////////////////////////////\n');
    logger.write('// '+start+'\n');
    logger.write('////////////////////////////////////////////////////////////////////////////////\n');
    logger.write('\n');
    logger.write('[  TIMESTAMP  |  LABEL  |  MESSAGE  ]\n');

    optibot.stdout.on('data', (data) => {
        console.log('data:'+data.toString('utf8'));
        //log(data, null, logger);
    });
    
    optibot.stderr.on('data', (data) => {
        log(data, 'fatal', logger);
    });

    optibot.on('message', (data) => {
        if(data.content) {
            log(data.content, data.level, logger);
        }
    });
    
    optibot.on('exit', (code) => {
        log(`Process ended with exit code "${code}"`, 'warn', logger);

        if(code === 0) {
            // shutdown
            log('OptiBot is now shutting down at user request. Goodbye!', 'warn', logger);
            setTimeout(function() {
                endLog(code);
                setTimeout(function() {
                    process.exit();
                }, 1000);
            }, 500);
        } else
        if(code === 1) {
            // error, restart
            log('OptiBot seems to have crashed. Restarting...', 'fatal', logger);
            if(debug) {
                setTimeout(function() {
                    endLog(code);
                    ob_init(debug);
                }, 10000);
            } else {
                setTimeout(function() {
                    endLog(code);
                    ob_init(debug);
                }, 500);
            }
        } else
        if(code === 2) {
            // restart
            log('OptiBot is now restarting at user request.', 'warn', logger);
            setTimeout(function() {
                endLog(code);
                ob_init(debug);
            }, 500);
        } else
        if(code === 3) {
            // shutdown, restart after one hour
            log('OptiBot is now going to sleep for one hour.', 'warn', logger);
            setTimeout(function () {
                endLog(code);
                ob_init(debug);
            }, 3600000)
        } else
        if(code === 10) {
            // scheduled restart
            log('OptiBot is now undergoing scheduled restart.', 'warn', logger);
            setTimeout(function() {
                endLog(code);
                ob_init(debug);
            }, 500);
        }

        function endLog(endType) {
            logger.end();
            if(endType === 1) {
                fs.rename('./logs/'+startTime+'.log', './logs/'+startTime+'_CRASH.log', (err) => {
                    if(err) throw err;
                });
            }
        }
    });
}

function log(m, lvl, logger) {

    let lvlFilter = new String(lvl).toLowerCase();
    if(lvlFilter === 'debug' && !debugMode) return;

    let now = new Date();
    let timestamp = ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2) + ':' + ('0' + now.getSeconds()).slice(-2);
    var priority, textCol;
    switch(lvlFilter) {
        case 'debug':
            priority = 'DEBUG';
            textCol = '\x1b[96m';
            break;
        case 'warn':
            priority = 'WARN ';
            textCol = '\x1b[93m';
            break;
        case 'error':
            priority = 'ERROR';
            textCol = '\x1b[91m';
            break;
        case 'fatal':
            priority = 'FATAL';
            textCol = '\x1b[101m\x1b[97m';
            break;
        default:
            priority = 'INFO ';
            textCol = '';
    }

    let conMsg = timestamp + '   ' + textCol + priority + '\x1b[0m   ' + textCol + m + '\x1b[0m';
    let logMsg = timestamp + '   ' + priority + '   ' + m + '\n';

    console.log(conMsg);
    if(logger) logger.write(logMsg);
}



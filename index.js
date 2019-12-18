/**
 * OptiBot NX - Main Program
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Written by Kyle Edwards <wingedasterisk@gmail.com>, December 2019
 */

if(!process.send) {
    throw new Error(`Cannot run standalone. Please use the "init.bat" file.`);
}


const fs = require(`fs`);
const callerId = require('caller-id');
const OptiBot = require(`./core/optibot.js`);

const bot = new OptiBot();

const log = (message, level, lineNum) => {
    let cid = callerId.getData();
    let path = (cid.evalFlag) ? 'eval()' : cid.filePath;
    let filename = path.substring(path.lastIndexOf('\\')+1);
    let line = cid.lineNumber;

    process.send({
        type: 'log',
        message: message,
        level: level,
        misc: filename+`:`+((lineNum) ? lineNum : line) 
    });
}

bot.login(bot.keys.discord).then(() => {
    process.title = `Loading...`;
    log('Successfully connected to Discord API.', 'info');
});
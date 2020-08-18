const fs = require('fs');
var start = new Date();
var startup_date = `${start.getDate()}-${start.getMonth()+1}-${start.getFullYear()}_at_${start.getHours()}.${start.getMinutes()}.${start.getSeconds()}`;
var log_start = `//////////////////////////////////////////////////////////////////////
${start}
//////////////////////////////////////////////////////////////////////

[  TIMESTAMP  |  LABEL  |  MESSAGE  ]\n`;


exports.Logger = function (options) {
  // todo: automatically create directory if it does not exist
  var logStream = fs.createWriteStream(options.directory+'/'+startup_date+'.log');
  logStream.write(log_start);
  this.w = function (string, level) {
    var msg = string;
    if (level === 'trace' && options.logLevel < 6) {return;}
    else if (level === 'debug' && options.logLevel < 5) {return;}
    else if ((['debug','warn','error','fatal'].indexOf(level) === -1) && (options.logLevel < 4)) {return;}
    else if (level === 'warn' && options.logLevel < 3) {return;}
    else if (level === 'error' && options.logLevel < 2) {return;}
    else if (level === 'fatal' && options.logLevel < 1) {return;}

    if(string instanceof Error){
      msg = string.stack;
    } /*else
    if (string instanceof JSON){
      msg = JSON.stringify(string);
    }*/


    let now = new Date();
    let timestamp = ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2) + ':' + ('0' + now.getSeconds()).slice(-2);
    let lvl;
    let lvlTextModify = '';
    switch (level) {
      case 'trace':
        lvl = 'TRACE';
        lvlTextModify = '\x1b[96m';
        break;
      case 'debug':
        lvl = 'DEBUG';
        lvlTextModify = '\x1b[96m';
        break;
      case 'warn':
        lvl = 'WARN ';
        lvlTextModify = '\x1b[93m';
        break;
      case 'error':
        lvl = 'ERROR';
        lvlTextModify = '\x1b[91m';
        break;
      case 'fatal':
        lvl = 'FATAL';
        lvlTextModify = '\x1b[101m\x1b[97m';
        break;
      default:
        lvl = 'INFO ';
    }

    let spacer = '   ';
    //let msg = string.replace(/\n/g, '\n                   ');

    console.log(timestamp + spacer + lvlTextModify + lvl + '\x1b[0m' + spacer + lvlTextModify + msg + '\x1b[0m');
    logStream.write(timestamp + spacer + lvl + spacer + msg + '\n');
  }
}

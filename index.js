/**
 * Vector Bot - Boot Manager
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 */

const child = require(`child_process`);
const readline = require(`readline`);
const fs = require(`fs`);
const util = require(`util`);
const AZip = require(`adm-zip`);
const chalk = require(`chalk`);
const pkg = require(`./package.json`);

process.title = `Vector ${pkg.version}`;

const env = {
  mode: 0,
  log: {
    /**
     * 0 = DEBUG
     * 1 = INFO+
     */
    level: 1,
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
      const now = new Date().getHours();
      if (now !== env.autostart.hour) {
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
};

const log = (m, lvl, file) => {
  const now = new Date();
  const t_hour = now.getUTCHours().toString().padStart(2, `0`);
  const t_min = now.getUTCMinutes().toString().padStart(2, `0`);
  const t_sec = now.getUTCSeconds().toString().padStart(2, `0`);
  const t_ms = now.getUTCMilliseconds().toString().padStart(3, `0`);
  const entry = {
    timestamp: {
      content: `${t_hour}:${t_min}:${t_sec}.${t_ms}`,
      color: chalk.white
    },
    file: {
      content: `NOFILE`,
      color: chalk.yellow
    },
    level: {
      content: `DEBUG`,
      color: chalk.magenta
    },
    message: {
      content: m,
      color: chalk.white
    }
  };

  if (typeof lvl === `string`) {
    if ([`fatal`, `error`, `warn`, `info`].includes(lvl.toLowerCase())) {
      entry.level.content = lvl.toUpperCase();
    }
    
    switch(lvl.toLowerCase()) {
      case `fatal`: 
        entry.level.color = chalk.inverse.bgRedBright;
        entry.message.color = chalk.redBright;
        break;
      case `error`: 
        entry.level.color = chalk.red;
        entry.message.color = chalk.red;
        break;
      case `warn`:
        entry.level.color = chalk.yellowBright;
        entry.message.color = chalk.yellowBright;
        break;
      case `info`:
        entry.level.color = chalk.white;
        entry.message.color = chalk.whiteBright;
        break;
      default:
        if (env.log.level < 1) return;
    }
  }

  if (typeof m !== `string`) {
    entry.message.color = chalk.yellowBright;
    if (m instanceof Error) {
      entry.message.content = m.stack;
    } else if (Buffer.isBuffer(m)) {
      entry.message.content = m.toString();
    } else {
      try {
        entry.message.content = util.inspect(m, { getters: true, showHidden: true });
      }
      catch (e) {
        try {
          entry.message.content = m.toString();
        }
        catch (e2) {
          log(`failed interp of log entry`, `error`);
        }
      }
    }
  }

  if (file != null) {
    entry.file.content = file;
  } else {
    const trace = new Error().stack;
    const match = trace.split(`\n`)[2].match(/(?<=at\s|\()([^(]*):(\d+):(\d+)\)?$/);

    if (match != null && match.length >= 4) {
      const fileName = match[1].replace(process.cwd(), `.`).replace(/\\/g, `/`);
      const line = match[2];
      const column = match[3];

      entry.file.content = `${fileName}:${line}:${column}`;
    }
  }

  const plain1 = `[${entry.timestamp.content}] [${entry.file.content}] [${entry.level.content}] : `;
  const plain2 = entry.message.content.replace(/\n/g, `\n${(` `.repeat(plain1.length))}`) + `\n`;

  const terminal1 = [
    chalk.white(`[${entry.timestamp.color(entry.timestamp.content)}]`),
    entry.file.color(`[${entry.file.content}]`),
    entry.level.color(`[${entry.level.content}]`),
    `: `
  ].join(` `);
  const terminal2 = entry.message.color(entry.message.content.replace(/\n/g, `\n${(` `.repeat(plain1.length))}`));

  console.log(terminal1 + terminal2);
  if (env.log.stream) env.log.stream.write(plain1 + plain2);
};

// check and setup required directories and files

const required = [
  `./assets`,
  `./assets/img`,
  `./cfg`,
  `./cfg/config.json`,
  `./cfg/keys.json`,
  `./modules`,
  `./modules/cmd`,
  `./modules/core`,
  `./modules/core/app.js`
];

const makeDirs = [
  `./archive`,
  `./archive/logs`,
  `./archive/data`,
  `./data`,
  `./logs`
];

const makeFiles = [
  `./data/profiles.db`,
  `./data/guilds.db`
];

for (const item of required) {
  if (!fs.existsSync(item)) throw new Error(`Missing file or directory: ${item}`);
}

for (const item of makeDirs) {
  if (!fs.existsSync(item)) {
    fs.mkdirSync(item);
  }
}

for (const item of makeFiles) {
  if (!fs.existsSync(item)) {
    fs.writeFileSync(item, ``);
  }
}

if (typeof require(`./cfg/keys.json`).discord !== `string`) {
  throw new Error(`./cfg/keys.json - Missing Discord API token.`);
}

(function setup() {
  (function q1() {
    console.clear();

    if (process.argv.includes(`--skipsetup`)) {
      env.mode = parseInt(process.argv.indexOf(`--skipsetup`) + 1);
      return preinit();
    } 

    env.rl.question(`START VECTOR [Y/N]\n`, (res) => {
      if (res.trim().toLowerCase() === `y`) {
        q2();
      } else if (res.trim().toLowerCase() === `n`) {
        process.exit();
      } else {
        q1();
      }
    });
  })();

  function q2() {
    console.clear();

    console.log([
      `MODE 0 - FULL FEATURE SET, CLOSED ACCESS | "CODE MODE"`,
      `MODE 1 - LIMITED FEATURE SET, PUBLIC ACCESS | "LITE MODE"`,
      `MODE 2 - FULL FEATURE SET, PUBLIC ACCESS | NORMAL OPERATION`,
      ``
    ].join(`\n`));

    env.rl.question(`SET OPERATING MODE [0-2]\n`, (res) => {
      const mode = parseInt(res);
  
      if (isNaN(mode) || mode < 0 || mode > 2) {
        q2();
      } else {
        env.mode = mode;
        if (mode === 0) env.log.level = 0;
  
        env.rl.close();
        preinit();
      }
    });
  }
})();

function preinit() {
  console.clear();

  process.title = `Vector ${pkg.version} | Spawning Process...`;

  env.log.filename = new Date().toUTCString().replace(/[/\\?%*:|"<>]/g, `.`);
  env.log.stream = fs.createWriteStream(`./logs/${env.log.filename}.log`);

  if (env.autostart.rph > 5 && env.mode != 0) {
    log(`Pre-Init: Unusually high client reset count: ${env.autostart.rph}`, `warn`);
    if (env.autostart.rph > 50) {
      log(`Pre-Init: Potential boot loop detected, shutting down for safety.`, `warn`);
      return exit(19, true, `FATAL`);
    }
  }

  log(`Pre-Init: Backing up user profiles...`, `info`);
  const pzip = new AZip();
  pzip.addLocalFile(`./data/profiles.db`);

  pzip.writeZip(`./archive/data/profiles_before_${env.log.filename}.zip`, (err) => {
    if (err) throw err;

    log(`Pre-Init: User profiles successfully archived.`, `info`);

    log(`Pre-Init: Checking log archive status...`, `info`);

    const logs = fs.readdirSync(`./logs`);

    const zipData = {};

    for (const file of logs) {
      if (!file.endsWith(`.log`)) continue;
      const creation = new Date(Math.min(fs.statSync(`./logs/${file}`).mtime.getTime(), Date.parse(file.substring(0, file.lastIndexOf(`GMT`) + 3).replace(/\./g, `:`))));

      if (creation.getTime() - new Date().getTime() < (1000 * 60 * 60 * 24 * 30)) continue; // skip if file is less than a month old

      const target = `${creation.getUTCMonth()}_${creation.getUTCFullYear()}`;

      if (Object.keys(zipData[target]).length != 0) {
        zipData[target].files.push(file);
      } else {
        zipData[target] = {
          files: [file],
          name: `${creation.toLocaleString(`default`, { month: `long`, year: `numeric` })}`
        };
      }
    }

    const keys = Object.keys(zipData);

    if (keys.length === 0) {
      log(`Pre-Init: No logs need to be archived.`, `info`);

      init();
    } else {
      log(`Pre-Init: Preparing to write ${keys.length} ZIP archive(s)...`, `info`);

      let archived = 0;
      let i = 0;
      (function nextZip() {
        if (i >= keys.length) {
          log(`Pre-Init: Successfully archived ${archived} log files.`, `info`);
          return init();
        }

        const data = zipData[keys[i]];
        const path = `./archive/logs/${data.name}.zip`;
        const zip = (fs.existsSync(path)) ? new AZip(path) : new AZip();

        for (const file of data.files) {
          archived++;
          zip.addLocalFile(`./logs/${file}`);
          fs.unlinkSync(`./logs/${file}`);
        }

        zip.writeZip(path, (err2) => {
          if (err2) log(err2.stack, `error`);

          i++;
          nextZip();
        });
      })();
    }
  });
}

function init() {
  log(`Launching Vector...`, `info`);

  const bot = child.spawn(`node`, [`modules/core/app.js`, env.mode, env.log.filename], {
    stdio: [`pipe`, `pipe`, `pipe`, `ipc`]
  });

  let chunks_out = [];
  bot.stdout.on(`data`, (data) => {
    chunks_out = chunks_out.concat(data);
    log(data, undefined);
  });
  bot.stdout.on(`end`, () => {
    const content = Buffer.concat(chunks_out).toString();
    if (content.length > 0) log(content, undefined);
    chunks_out = [];
  });

  let chunks_err = [];
  bot.stderr.on(`data`, (data) => {
    chunks_err = chunks_err.concat(data);
    log(data, `fatal`);
  });
  bot.stderr.on(`end`, () => {
    const content = Buffer.concat(chunks_err).toString();
    if (content.length > 0) log(content, `fatal`);
    chunks_err = [];
  });

  bot.on(`message`, (data) => {
    if (data == null || data.constructor !== Object || data.t == null) {
      return log(util.inspect(data)); // to the debugeon with you
    }

    switch (data.t) {
      case `APP_LOG`:
        log(data.c.message, data.c.level, data.c.file);
        break;
      case `APP_READY`:
        log(`Bot ready`);
        if (env.cr.logData != null) {
          // send crash data
          bot.send({ 
            t: `BM_CRASHLOG`,
            c: env.cr.logData
          }, (err) => {
            if (err) return log(`Failed to send crashlog data: ` + err.stack, `error`);

            // once finished, clear crash data so it's not sent again during next scheduled restart.
            env.cr.logData = null;
          });
        }

        if (env.r.guild !== null) {
          // send restart data
          bot.send({
            t: `BM_RESTART`,
            c: env.r 
          }, (err) => {
            if (err) return log(`Failed to send restart data: ` + err.stack, `error`);
              
            env.r.guild = null;
            env.r.channel = null;
            env.r.message = null;
            env.r.author = null;
          });
        }
        break;
      case `APP_RESTART`:
        env.r.guild = data.c.guild;
        env.r.channel = data.c.channel;
        env.r.message = data.c.message;
        env.r.author = data.c.author;
        break;
      default:
        log(util.inspect(data)); // to the debugeon with you
    }
  });

  bot.on(`exit`, (code) => {
    log(`Child process ended with exit code ${code}`, `info`);

    if ([18, 1].includes(code)) {
      env.r.guild = null;
      env.r.channel = null;
      env.r.message = null;
      env.r.author = null;
    }

    const opts = {
      exit: true,
      note: null,
      timeout: 500,
      postLog: false
    };

    switch(code) {
      case 0: 
        log(`Vector is now shutting down at user request.`, `info`);
        break;
      case 1: 
        log(`Vector seems to have crashed. Restarting...`, `info`);
        opts.exit = false;
        opts.note = `CRASH`;
        opts.postLog = true;
        if (env.mode === 0) opts.timeout = 5000;
        break;
      case 2: 
        log(`Bash Error.`, `fatal`);
        break;
      case 3: 
        log(`Internal JavaScript parse error.`, `fatal`);
        break;
      case 4: 
        log(`Internal JavaScript Evaluation Failure.`, `fatal`);
        break;
      case 5: 
        log(`Fatal Error.`, `fatal`);
        break;
      case 6: 
        log(`Non-function Internal Exception Handler.`, `fatal`);
        break;
      case 7: 
        log(`Internal Exception Handler Run-Time Failure.`, `fatal`);
        break;
      case 8: 
        log(`Uncaught exception.`, `fatal`);
        break;
      case 9: 
        log(`Invalid Launch Argument(s).`, `fatal`);
        break;
      case 10: 
        log(`Internal JavaScript Run-Time Failure.`, `fatal`);
        break;
      case 12: 
        log(`Invalid Debug Argument(s).`, `fatal`);
        break;
      case 16: 
        log(`Vector is now restarting at user request...`, `info`);
        opts.exit = false;
        break;
      case 17: 
        if (env.mode === 0) {
          log(`Vector cannot be updated in mode 0. Restarting...`, `info`);
          opts.exit = false;
        } else {
          log(`Vector is now being updated...`, `info`);
          return update();
        }
        break;
      case 18:
        log(`Vector is now undergoing scheduled restart.`, `info`);
        opts.exit = false;
        break;
      case 19:
        log(`Vector is shutting down automatically.`, `fatal`);
        opts.exit = false;
        opts.note = `FATAL`;
        break;
    }

    if (code > 128) log(`Signal exit code ${code - 128}.`, `fatal`);

    setTimeout(() => {
      exit(code, opts.exit, opts.note, opts.postLog);
    }, opts.timeout);
  });
}

function exit(code, stop, note, postLog) {
  env.autostart.rph++;
  env.log.stream.end();

  setTimeout(() => {
    let logDir = `./logs/${env.log.filename}.log`;

    if (note != null) {
      const newLogDir = `./logs/${env.log.filename}_${note}.log`;
      fs.renameSync(logDir, newLogDir);
      logDir = newLogDir;
    }

    if (postLog) env.cr.logData = fs.readFileSync(logDir, `utf8`);
    
    if (stop) {
      process.exit(code);
    } else {
      preinit();
    }
  }, 500);
}

function update() {
  env.log.stream.end();

  child.execSync(`git fetch --all`);
  child.execSync(`git reset --hard origin/master`);
  child.execSync(`npm install`);

  setTimeout(() => {
    child.execSync(`npm start -- --skipsetup ${env.mode}`);

    /* // i know this looks like a fucking mess of commands and switches but trust me it NEEDS to be structured precisely like this to work.
    // fuck windows batch
    child.spawn('cmd', ['/C', 'start', '""', 'cmd', '/C', 'init.bat', '--skipsetup', env.mode], {
      detached: true,
      stdio: 'ignore',
      cwd: __dirname
    }).unref();

    process.exit(3); */
  }, 500);
}
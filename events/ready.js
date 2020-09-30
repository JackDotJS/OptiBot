const cid = require('caller-id');
const util = require('util');
const ob = require('../modules/core/OptiBot.js');
const path = require('path');

const log = (message, level, file, line) => {
  const call = cid.getData();
  if (!file) file = (call.evalFlag) ? 'eval()' : call.filePath.substring(call.filePath.lastIndexOf('\\') + 1);
  if (!line) line = call.lineNumber;

  try {
    process.send({
      type: 'log',
      message: message,
      level: level,
      misc: `${file}:${line}`
    });
  }
  catch (e) {
    try {
      process.send({
        type: 'log',
        message: util.inspect(message),
        level: level,
        misc: `${file}:${line}`
      });
    }
    catch (e2) {
      log(e);
      log(e2);
    }
  }


};

module.exports = (bot) => {
  log(ob.Memory);
  if (bot.pause) {
    log('Successfully connected to Discord API.', 'info');

    const botLoadAssets = function () {
      ob.OBUtil.setWindowTitle('Loading Assets...');

      ob.Memory.core.root.drive = path.parse(__dirname).root;
      ob.Memory.core.root.dir = __dirname;
      ob.Memory.core.root.folder = path.parse(__dirname).base;

      ob.Assets.load().then((time) => {
        const now = new Date();
        const width = 64; //inner width of box
        function centerText(text, totalWidth) {
          text = text.substring(0, totalWidth - 8);

          const leftMargin = Math.floor((totalWidth - (text.length)) / 2);
          const rightMargin = Math.ceil((totalWidth - (text.length)) / 2);

          return '│' + (' '.repeat(leftMargin)) + text + (' '.repeat(rightMargin)) + '│';
        }

        let splash = ob.Memory.assets.splash[~~(Math.random() * ob.Memory.assets.splash.length)];

        if (splash.indexOf('\n') > -1) {
          splash = splash.substring(splash.lastIndexOf('\n') + 1).substring(0, width);
        }

        log(splash, 'debug');

        log(`╭${'─'.repeat(width)}╮`, 'info');
        log(centerText('  ', width), 'info');
        log(centerText(`OptiBot ${bot.version}`, width), 'info');
        log(centerText('(c) Kyle Edwards <wingedasterisk@gmail.com>, 2020', width), 'info');
        log(centerText('  ', width), 'info');
        log(centerText(splash, width), 'info');
        log(centerText('  ', width), 'info');
        log(centerText(`Finished initialization in ${process.uptime().toFixed(3)} seconds.`, width), 'info');
        log(centerText(`Assets loaded in ${time / 1000} seconds.`, width), 'info');
        log(centerText('  ', width), 'info');
        log(`╰${'─'.repeat(width)}╯`, 'info');

        new ob.LogEntry({ time: now, console: false })
          .setColor(bot.cfg.embed.default)
          .setIcon(ob.Assets.getEmoji('ICO_info').url)
          .setThumbnail(bot.user.displayAvatarURL({ format: 'png' }))
          .setTitle('OptiBot Initialized', 'OptiBot Initalization Time Report')
          .setHeader(`Version: ${bot.version}`)
          .setDescription(`Boot Time: ${process.uptime().toFixed(3)} second(s)`)
          .addSection('Next Scheduled Restart', bot.exitTime)
          .addSection('The following message was brought to you by Math.random()®', {
            data: `\`\`\`${splash}\`\`\``,
            raw: splash
          })
          .submit('misc');

        process.send({
          type: 'ready'
        });

        bot.setBotStatus(1);
        ob.OBUtil.setWindowTitle(null);
      }).catch(err => {
        ob.OBUtil.err(err);
        bot.exit(1);
      });

      if (ob.Memory.core.bootFunc) delete ob.Memory.core.bootFunc;
    };

    if (!bot.mainGuild.available) {
      ob.OBUtil.setWindowTitle('Waiting for primary guild...');
      log('Primary guild unavailable.\nAssets will be loaded once the guild is available again.', 'warn');
      ob.Memory.core.bootFunc = botLoadAssets();
    } else {
      botLoadAssets();
    }
  } else {
    bot.setBotStatus(1);
    ob.OBUtil.setWindowTitle(null);
  }
};
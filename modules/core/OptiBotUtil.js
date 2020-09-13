const Memory = require('./OptiBotMemory.js');

module.exports = {
  setWindowTitle: require('./OptiBotUtil/setWindowTitle'),
  parseInput: require('./OptiBotUtil/parseInput'),
  getAuthlvl: require('./OptiBotUtil/getAuthLevel'),
  missingArgs: require('./OptiBotUtil/missingArgs'),
  getProfile: require('./OptiBotUtil/getProfile'),
  updateProfile: require('./OptiBotUtil/updateProfile'),
  parseTarget: require('./OptiBotUtil/parseTarget'),
  confirm: require('./OptiBotUtil/confirm'),
  err: require('./OptiBotUtil/err'),
  parseTime: require('./OptiBotUtil/parseTime'),
  afterSend: require('./OptiBotUtil/afterSend'),
  unmuter: require('./OptiBotUtil/unmuter')
};

module.exports = class OptiBotUtilities {
  constructor() {
    throw new Error('Why are you doing this? (Cannot instantiate this class.)');
  }

  /**
     * end my fucking life
     * 
     * @param {String} str text to uwuify
     */
  static uwu(str) {
    const bot = Memory.core.client;
    const log = bot.log;

    const words = str.split(' ');
    let newStr = '';
    /* eslint-disable-next-line no-useless-escape */
    const url = /\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/gi;

    const replacements = [
      {
        match: ['you'],
        replace: ['you', 'u', 'yu', 'yew']
      },
      {
        match: ['your'],
        replace: ['your', 'ur', 'yur', 'yer']
      },
      {
        match: ['stuff'],
        replace: ['stuff', 'stuffz', 'stuffs']
      },
      {
        match: ['lol', 'lel', 'lul', 'xd'],
        replace: ['lol', 'xD', 'xDDD', 'lol xDD', 'lol XD UwU']
      },
      {
        match: [':)', 'c:', 'ouo', ':3'],
        replace: [':3', 'UwU', 'OwO']
      },
      {
        match: [':(', ':C', 'T-T'],
        replace: ['QwQ']
      },
      {
        match: ['what', 'wut'],
        replace: ['what', 'wat']
      },
      {
        match: ['over'],
        replace: ['ova', 'ovuh', 'ovoh']
      },
    ];

    const exceptions = [
      'your',
      'ur',
      'or',
      'over'
    ];

    const exclamation = (match) => {
      // procedural exclamation/question mark generator
      // because why the fuck not

      const minLength = Math.max(match.length, 3); // original marks, 3 chars absolute minimum
      const maxLength = Math.min(match.length + 6, 12); // original marks + 6, 12 chars absolute maximum
      const length = ~~(Math.random() * (maxLength - minLength + 1) + minLength);

      let weight = 0; // weight of exclamation points. max is 1.0
      if (match.indexOf('!') > -1 && match.indexOf('?') === -1) {
        weight = 1;
      } else if (match.indexOf('?') > -1 && match.indexOf('!') === -1) {
        weight = 0.25;
      } else {
        weight = (match.split('!').length - 1 / match.length);
      }

      let ex = '';
      for (let i = 0; i < length; i++) {
        if (Math.random() > weight) {
          ex += (Math.random() < (weight / 4)) ? '1' : '!';
        } else {
          ex += '?';
        }
      }

      return ex;
    };

    for (let i = 0; i < words.length; i++) {
      let word = words[i];

      if (word.match(url) === null) {
        if (exceptions.indexOf(word) === -1) {
          word = word.replace(/[rl]/g, 'w')
            .replace(/[RL]/g, 'W')
            .replace(/n([aeiou])(?=\S)/g, 'ny$1')
            .replace(/N([aeiou])(?=\S)/g, 'Ny$1')
            .replace(/N([AEIOU])(?=\S)/g, 'Ny$1')
            .replace(/ove/g, 'uv')
            .replace(/OVE/g, 'UV')
            .replace(/[!?]+$/g, exclamation);
        }

        for (let i2 = 0; i2 < replacements.length; i2++) {
          const r = replacements[i2];
          for (let i3 = 0; i3 < replacements.length; i3++) {
            if (word.toLowerCase() === r.match[i3]) {
              word = r.replace[~~(Math.random() * r.replace.length)];
            }
          }
        }

        log(word);
        newStr += word + ' ';
      }
    }

    const face = ['OwO', 'UwU', '', ''];

    return `${newStr}${face[~~(Math.random() * face.length)]}`;
  }

  static verifyDonator(member) {
    const bot = Memory.core.client;
    const log = bot.log;

    return new Promise((resolve, reject) => {
      log(`${member.user.tag} (${member.user.id}) joined OptiFine Donator server!`, 'info');

      function grantRole() {
        member.roles.add(bot.cfg.roles.donatorServer, 'Verified Donator via OptiFine Server.').then(() => {
          log(`${member.user.tag} (${member.user.id}) has been successfully verified as a donator.`, 'info');
          resolve();
        }).catch(err => {
          log(`Error occurred while verifying ${member.user.tag} (${member.user.id}) as a donator.`, 'error');
          reject(err);
        });
      }

      function kick() {
        member.kick('Unverified Donator.').then(() => {
          log(`Kicked ${member.user.tag} (${member.user.id}) for not being a verified donator.`, 'info');
          resolve();
        }).catch(err => {
          log(`Error occurred while kicking ${member.user.tag} (${member.user.id}) from donator server.`, 'error');
          reject(err);
        });
      }

      bot.mainGuild.members.fetch(member.user.id).then((ofm) => {
        if (ofm.roles.cache.has(bot.cfg.roles.donator)) {
          if (!member.roles.cache.has(bot.cfg.roles.donatorServer)) {
            grantRole();
          } else {
            resolve();
          }
        } else {
          kick();
        }
      }).catch(err => {
        if (err.message.match(/invalid or uncached|unknown member|unknown user/i) != null) {
          kick();
        } else {
          log(`Error occurred while verifying ${member.user.tag} (${member.user.id}) as a donator.`, 'error');
          reject(err);
        }
      });
    });
  }

  static calculatePoints(date, total) {
    const bot = Memory.core.client;
    const log = bot.log;

    const daysSince = Math.round((Date.now() - date) / (1000 * 60 * 60 * 24));

    log(`days since: ${daysSince}`);

    if (daysSince > bot.cfg.points.decayDelay) {
      const decay = total - (bot.cfg.points.dailyDecay * (daysSince - bot.cfg.points.decayDelay));
      const minimum = (bot.cfg.points.minPercentDecay / 100) * total;

      log(`decay: ${decay}`);
      log(`minimum: ${minimum}`);

      return Math.max(decay, minimum);
    }

    return total;
  }
};
const Memory = require('../core/memory.js');
/**
     * end my fucking life
     *
     * @param {String} str text to uwuify
     */
module.exports = (str) => {
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
};
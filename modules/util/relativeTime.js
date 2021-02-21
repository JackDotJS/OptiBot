module.exports = (input) => {
  let time = input;
  const now = new Date().getTime();
  let difference = null;
  let length = null;
  let measurement = null;

  if (input.constructor !== Date) {
    time = new Date(input).getTime();
  } else {
    time = time.getTime(); // I USED THE TIME TO GET THE TIME
  }

  if (isNaN(time)) throw new Error(`Invalid date.`);

  difference = Math.abs(time - now);

  const m = [
    {
      d: [`a`, `year`], // article determiner, time measurement
      m: (1000 * 60 * 60 * 24 * 365), // measurement in milliseconds
      u: null // point at which to use next highest measurement. null = none
    },
    {
      d: [`a`, `month`],
      m: (1000 * 60 * 60 * 24 * 30.44),
      u: 11.5
    },
    {
      d: [`a`, `week`],
      m: (1000 * 60 * 60 * 24 * 7),
      u: 4
    },
    {
      d: [`a`, `day`],
      m: (1000 * 60 * 60 * 24),
      u: null
    },
    {
      d: [`an`, `hour`],
      m: (1000 * 60 * 60),
      u: 23
    },
    {
      d: [`a`, `minute`],
      m: (1000 * 60),
      u: 55
    },
    {
      d: [`a`, `second`],
      m: 1000,
      u: null
    }
  ];

  for (let i = 0; i < m.length; i++) {
    let measure = m[i];

    if (difference >= measure.m) {
      if (measure.u != null && (difference / measure.m) > measure.u) {
        measure = m[i-1];
      }

      length = difference / measure.m;
      measurement = measure.d;
      break;
    }
  }

  if (length == null || measurement == null) {
    if (time > now) {
      return 'right now';
    } else {
      return 'just now';
    }
  }

  const final = [];
  const rounded = Math.round(length);

  if (Number.isInteger(length)) {
    final.push('exactly');
  } else {
    final.push('about');
  }

  if (rounded === 1 && !Number.isInteger(length)) {
    final.push(measurement[0]);
  } else {
    final.push(rounded);
  }

  final.push(measurement[1]+((rounded > 1) ? 's' : ''));

  if (time > now) {
    final.unshift('in');
  } else {
    final.push('ago');
  }

  return final.join(' ');
};
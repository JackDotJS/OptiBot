module.exports = (input) => {
    const result = {
        valid: false,
        string: '1 hour',
        ms: 1000 * 60 * 60
    }

    if(typeof input !== 'string' || input.length === 0) {
        return result;
    }

    let split = input.split(/(?<=\d)(?=\D)/g);
    let num = parseInt(split[0]);
    let measure = (split[1]) ? split[1].toLowerCase() : 'h';
    let tm = `hour`;

    if (isNaN(num)) {
        return result;
    }

    result.valid = true;

    if(measure === 's') {
        tm = `second`;
        result.ms = 1000 * num;
    } else
    if(measure === 'm') {
        tm = `minute`;
        result.ms = 1000 * 60 * num;
    } else
    if(measure === 'd') {
        tm = `day`;
        result.ms = 1000 * 60 * 60 * 24 * num;
    } else
    if(measure === 'w') {
        tm = `week`;
        result.ms = 1000 * 60 * 60 * 24 * 7 * num;
    } else {
        tm = `hour`;
        result.ms = 1000 * 60 * 60 * num;
    }

    result.string = `${num} ${tm}${(num !== 1) ? `s` : ``}`;
    result.split = split;

    return result;
}
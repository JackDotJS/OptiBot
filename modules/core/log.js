module.exports = (message, level) => {
  let file;

  const trace = new Error().stack;
  const match = trace.split(`\n`)[2].match(/(?<=at\s|\()([^(]*):(\d+):(\d+)\)?$/);

  if (match != null && match.length >= 4) {
    const fileName = match[1].replace(process.cwd(), `.`).replace(/\\/g, `/`);
    const line = match[2];
    const column = match[3];

    file = `${fileName}:${line}:${column}`;
  }

  process.send({
    t: `APP_LOG`,
    c: { message, level, file }
  });
};
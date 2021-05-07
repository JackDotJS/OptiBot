const memory = require(`../core/memory.js`);


module.exports = (text, gcfg) => {
  //const bot = memory.core.client;
  console.log('gcfg', gcfg);

  if (typeof text !== `string`) text = new String(text);
  const input = text.trim().split(`\n`, 1)[0]; // first line of the message
  const data = {
    valid: input.match(new RegExp(`^(\\${gcfg.commands.prefixes.join(`|\\`)})(?![^a-zA-Z0-9])[a-zA-Z0-9]+(?=\\s|$)`)), // checks if the input starts with the command prefix, immediately followed by valid characters.
    cmd: input.toLowerCase().split(` `)[0].substr(1),
    args: input.split(` `).slice(1).filter((e) => e.length !== 0)
  };

  if (input.match(/^(\$)(?![^0-9])[0-9]+(?=\s|$)/)) {
    // fixes "$[numbers]" resulting in false command inputs
    data.valid = null;
  }

  return data;
};
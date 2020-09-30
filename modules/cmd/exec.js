/* eslint-disable no-unused-vars */
// That is disabled so that eval can access them without requiring them in the eval statement itself
const path = require('path');
const timeago = require('timeago.js');
const util = require('util');
const fileType = require('file-type');
const request = require('request');
const djs = require('discord.js');
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  aliases: ['eval'],
  short_desc: 'Evaluate JavaScript code.',
  args: '<code> [--verbose]',
  authlvl: 5,
  flags: ['DM_OPTIONAL', 'MOD_CHANNEL_ONLY', 'STRICT', 'HIDDEN', 'DELETE_ON_MISUSE', 'LITE'],
  run: null
};

metadata.run = async (m, args, data) => {
  try {
    let verboseMode = false;

    if (m.content.endsWith('--verbose')) {
      m.content = m.content.split('--verbose')[0].trim();
      verboseMode = true;
    }

    const code = m.content.substring(`${bot.prefix}${path.parse(__filename).name} `.length);
    const execStart = new Date().getTime();
    let output = eval(code);
    // Resolves the promise if the output is a promise
    if (output instanceof Promise || (Boolean(output) && typeof output.then === 'function' && typeof output.catch === 'function')) output = await output;
    const execEnd = new Date().getTime();

    const raw = `${output}`;
    const inspect = `${util.inspect(output, { depth: 0 })}`;
    const info = [
      `Execution Time: ${(execEnd - execStart).toLocaleString()}ms (${(execEnd - execStart) / 1000} seconds)`,
      `Typeof: ${typeof output}`,
    ];
    let result = [];
    let contents = [];

    if (output != null) {
      info.push(`Constructor: ${output.constructor.name}`);

      if (Array.isArray(output)) {
        const itemTypes = [];

        for (const item of output) {
          if (item === null) {
            itemTypes.push('null');
          } else if (item === undefined) {
            itemTypes.push('undefined');
          } else {
            itemTypes.push(`${item.constructor.name}`);
          }
        }

        info.push(
          `Array Length: ${output.length}`,
          `Array Item Types: ${[...new Set(itemTypes)].join(', ')}`,
        );
      } else if (output.constructor === Object) {
        const keys = Object.keys(output);

        const itemTypes = [];

        for (let i = 0; i < keys.length; i++) {
          const value = output[keys[i]];

          if (value === null) {
            itemTypes.push('null');
          } else if (value === undefined) {
            itemTypes.push('undefined');
          } else {
            itemTypes.push(`${value.constructor.name}`);
          }
        }

        info.push(
          `Object Keys: ${keys.length}`,
          `Object Value Types: ${[...new Set(itemTypes)].join(', ')}`
        );
      }
    }

    // eslint-disable-next-line no-inner-declarations
    function compileContents() {
      if (verboseMode) {
        contents.push(
          'Result Information:',
          `\`\`\`yaml\n${info.join('\n')} \`\`\``
        );
      }

      contents.push(
        ...result
      );
      contents = contents.join('\n');
    }

    if (Buffer.isBuffer(output)) {
      const ft = fileType(output);
      if (ft !== null && ft !== undefined) {
        result = [
          'File Output:'
        ];
        info.push(
          `File Size: ${output.length.toLocaleString()} bytes`,
          `File Extension: ${ft.ext}`,
          `File MIME Type: ${ft.mime}`
        );

        compileContents();
        m.channel.stopTyping(true);
        m.channel.send(contents, { files: [new djs.MessageAttachment(output, 'output.' + ft.ext)] });
      } else {
        defaultRes();
      }
    } else {
      defaultRes();
    }


    // eslint-disable-next-line no-inner-declarations
    function defaultRes() {
      if(verboseMode) {
        if (raw === inspect) {
          result.push(
            'Output:',
            `\`\`\`javascript\n${djs.Util.escapeCodeBlock(inspect)} \`\`\``
          );
          info.push(
            `Output Text Length: ${raw.length.toLocaleString()} characters`
          );
        } else {
          result.push(
            'Raw Output:',
            `\`\`\`${djs.Util.escapeCodeBlock(raw)} \`\`\``,
            'Inspected Output:',
            `\`\`\`javascript\n${djs.Util.escapeCodeBlock(inspect)} \`\`\``
          );
          info.push(
            `Raw Output Text Length: ${raw.length.toLocaleString()} characters`,
            `Inspected Output Text Length: ${inspect.length.toLocaleString()} characters`
          );
        }
      } else {
        result.push(`\`\`\`js\n${djs.Util.escapeCodeBlock(inspect)}\n\`\`\``);
      }
      

      compileContents();

      if (contents.length > 2000) {
        const oldlength = contents.length;
        contents = [
          '////////////////////////////////////////////////////////////////',
          '// Input',
          '////////////////////////////////////////////////////////////////',
          '',
          code,
          '',
          '',
          '////////////////////////////////////////////////////////////////',
          '// Result Information',
          '////////////////////////////////////////////////////////////////',
          '',
          info.join('\n'),
          '',
          '',
        ];

        if (raw === inspect) {
          contents = contents.concat([
            '////////////////////////////////////////////////////////////////',
            '// Output',
            '////////////////////////////////////////////////////////////////',
            '',
            raw
          ]).join('\n');
        } else {
          contents = contents.concat([
            '////////////////////////////////////////////////////////////////',
            '// Raw Output',
            '////////////////////////////////////////////////////////////////',
            '',
            raw,
            '',
            '',
            '////////////////////////////////////////////////////////////////',
            '// Inspected Output',
            '////////////////////////////////////////////////////////////////',
            '',
            inspect
          ]).join('\n');
        }

        m.channel.stopTyping(true);
        m.channel.send([
          'Result Information:',
          `\`\`\`yaml\n${info.join('\n')}\`\`\``,
          `Output too long! (${(oldlength - 2000).toLocaleString()} characters over message limit)`,
          'See attached file for output:'
        ].join('\n'), { files: [new djs.MessageAttachment(Buffer.from(contents), 'output.txt')] });
      } else {
        m.channel.stopTyping(true);
        m.channel.send(contents);
      }
    }
  }
  catch (err) {
    m.channel.stopTyping(true);
    m.channel.send(`\`\`\`diff\n-${err.stack || err}\`\`\``);
  }
};

module.exports = new Command(metadata);
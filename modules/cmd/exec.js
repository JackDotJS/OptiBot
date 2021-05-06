/* eslint-disable no-unused-vars */
// That is disabled so that eval can access them without requiring them in the eval statement itself
const path = require(`path`);
const util = require(`util`);
const fileType = require(`file-type`);
const fetch = require(`node-fetch`);
const djs = require(`discord.js`);
const { Command, memory, RecordEntry, LogEntry, Assets } = require(`../core/modules.js`);

const bot = memory.core.client;
const log = bot.log;

const metadata = {
  name: path.parse(__filename).name,
  aliases: [`eval`],
  description: {
    short: `Evaluate JavaScript code.`,
    long: [
      `Executes any given JavaScript code. `,
      ``,
      `Note that this command includes an \`opts\` variable, which can be freely modified to adjust the given output of this command. This variable currently has two properties:`,
      `**opts.verbose** - Allows display of detailed result information.`,
      `**opts.depth** - Sets depth of \`util.inspect()\`.`,
      ``,
      `The default values for these properties are specified in \`config_debug.json\` at \`config.dev.exec\``
    ].join(`\n`)
  },
  args: `<code>`,
  dm: true,
  flags: [ `STAFF_CHANNEL_ONLY`, `STRICT`, `HIDDEN`, `DELETE_ON_MISUSE`, `PERMS_REQUIRED`, `LITE` ],
  run: null
};

metadata.run = async (m, args, data) => {
  try {
    const opts = {
      verbose: true,
      depth: 2,
    };

    if (bot.cfg.dev && bot.cfg.dev.exec) {
      opts.verbose = bot.cfg.dev.exec.verbose;
      opts.depth = bot.cfg.dev.exec.inspectionDepth;
    }

    const code = m.content.substring(`${bot.prefix}${path.parse(__filename).name} `.length);

    const execStart = new Date().getTime();
    let result = eval(code);

    if (result instanceof Promise || (Boolean(result) && typeof result.then === `function` && typeof result.catch === `function`)) {
      result = await result;
    }

    const execEnd = new Date().getTime();

    const raw = `${result}`;
    const inspect = `${util.inspect(result, { depth: opts.depth })}`;

    // verbose output
    const vOutput = [ 
      (() => {
        const diff = execEnd - execStart;

        if (diff === 0) return `Execution Time: Instant`;
        return `Execution Time: ${(diff).toLocaleString()}ms (${(diff) / 1000} seconds)`;
      })(),
      `Typeof: ${typeof result}`,
    ];

    // basic output
    const bOutput = []; 

    const compileContents = () => {
      const contents = [];

      if (opts.verbose) {
        contents.push(
          `Result Information:`,
          `\`\`\`yaml\n${vOutput.join(`\n`)} \`\`\``
        );
      }

      contents.push(
        ...bOutput
      );

      return contents.join(`\n`);
    };

    const printResult = () => {
      if(opts.verbose) {
        if (raw === inspect) {
          vOutput.push(
            `Output Text Length: ${raw.length.toLocaleString()} characters`
          );

          bOutput.push(
            `Output:`,
            `\`\`\`javascript\n${djs.Util.escapeCodeBlock(inspect)} \`\`\``
          );
        } else {
          vOutput.push(
            `Raw Output Text Length: ${raw.length.toLocaleString()} characters`,
            `Inspected Output Text Length: ${inspect.length.toLocaleString()} characters`
          );

          bOutput.push(
            `Raw Output:`,
            `\`\`\`${djs.Util.escapeCodeBlock(raw)} \`\`\``,
            `Inspected Output:`,
            `\`\`\`javascript\n${djs.Util.escapeCodeBlock(inspect)} \`\`\``
          );
        }
      } else {
        bOutput.push(`\`\`\`js\n${djs.Util.escapeCodeBlock(inspect)}\n\`\`\``);
      }

      const contents = compileContents();

      if (contents.length > 2000) {
        const file = [
          `////////////////////////////////////////////////////////////////`,
          `// Input`,
          `////////////////////////////////////////////////////////////////`,
          ``,
          code,
          ``,
          ``,
          `////////////////////////////////////////////////////////////////`,
          `// Result Information`,
          `////////////////////////////////////////////////////////////////`,
          ``,
          vOutput.join(`\n`),
          ``,
          ``,
        ];

        if (raw === inspect) {
          file.push(
            `////////////////////////////////////////////////////////////////`,
            `// Output`,
            `////////////////////////////////////////////////////////////////`,
            ``,
            raw
          );
        } else {
          file.push(
            `////////////////////////////////////////////////////////////////`,
            `// Raw Output`,
            `////////////////////////////////////////////////////////////////`,
            ``,
            raw,
            ``,
            ``,
            `////////////////////////////////////////////////////////////////`,
            `// Inspected Output`,
            `////////////////////////////////////////////////////////////////`,
            ``,
            inspect
          );
        }

        const newOutput = [];

        if (opts.verbose) {
          newOutput.push(
            `Result Information:`,
            `\`\`\`yaml\n${vOutput.join(`\n`)} \`\`\``
          );
        }

        newOutput.push(
          `Output too long! (${(contents.length - 2000).toLocaleString()} characters over message limit)`,
          `See attached file for output:`
        );

        bot.send(m, newOutput.join(`\n`), { files: [new djs.MessageAttachment(Buffer.from(file.join(`\n`)), `output.txt`)] });
      } else {
        bot.send(m, contents);
      }
    };

    if (result != null) {
      vOutput.push(`Constructor: ${result.constructor.name}`);

      if (opts.verbose && Array.isArray(result)) {
        const itemTypes = [];

        for (const item of result) {
          if (item === null) {
            itemTypes.push(`null`);
          } else if (item === undefined) {
            itemTypes.push(`undefined`);
          } else {
            itemTypes.push(`${item.constructor.name}`);
          }
        }

        vOutput.push(
          `Array Length: ${result.length}`,
          `Array Item Types: ${[...new Set(itemTypes)].join(`, `)}`,
        );
      }
      
      if (opts.verbose && result.constructor === Object) {
        const keys = Object.keys(result);

        vOutput.push(
          `Object Key Count: ${keys.length}`
        );

        if (keys.length > 0) {
          const itemTypes = [];

          for (let i = 0; i < keys.length; i++) {
            const value = result[keys[i]];

            if (value === null) {
              itemTypes.push(`null`);
            } else if (value === undefined) {
              itemTypes.push(`undefined`);
            } else {
              itemTypes.push(`${value.constructor.name}`);
            }
          }

          vOutput.push(
            `Object Keys: ${keys.join(`, `)}`,
            `Object Value Types: ${[...new Set(itemTypes)].join(`, `)}`
          );
        }
      }

      if (Buffer.isBuffer(result)) {
        const ft = fileType(result);
        if (ft !== null && ft !== undefined) {
          bOutput.push(`File Output:`);

          vOutput.push(
            `File Size: ${result.length.toLocaleString()} bytes`,
            `File Extension: ${ft.ext}`,
            `File MIME Type: ${ft.mime}`
          );
  
          return bot.send(m, compileContents(), { files: [new djs.MessageAttachment(result, `output.` + ft.ext)] });
        }
      }
    }

    printResult();
  }
  catch (err) {
    bot.send(m, `\`\`\`diff\n-${err.stack || err}\`\`\``);
  }
};

module.exports = new Command(metadata);
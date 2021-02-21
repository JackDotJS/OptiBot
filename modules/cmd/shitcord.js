const path = require(`path`);
const djs = require(`discord.js`);
const { Command, memory } = require(`../core/optibot.js`);

const bot = memory.core.client;

const metadata = {
  name: path.parse(__filename).name,
  aliases: [`poop`, `shit`],
  short_desc: `You know what this does.`,
  authlvl: 4,
  flags: [`DM_OPTIONAL`, `NO_TYPER`],
  run: null
};

metadata.run = m => bot.send({ files: [ new djs.MessageAttachment(path.resolve(`./assets/img/IMG_shitcord.png`), `shitcord.png`) ] });

module.exports = new Command(metadata);
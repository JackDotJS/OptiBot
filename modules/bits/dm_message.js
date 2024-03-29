const djs = require(`discord.js`);
const { OptiBit, memory } = require(`../core/modules.js`);

const bot = memory.core.client;

const metadata = {
  name: `Direct Message Default Response`,
  description: `Description.`,
  image: `IMG_args`,
  priority: 0,
  concurrent: false,
  authlvl: -1,
  flags: [`DM_ONLY`, `HIDDEN`],
  validator: null,
  executable: null
};

metadata.validator = () => true;

metadata.executable = m => {
  const embed = new djs.MessageEmbed()
    .setColor(bot.cfg.colors.default)
    //.setAuthor(`Hi there!`, Assets.getEmoji('ICO_info').url)
    .setTitle(`Hi there!`)
    .setDescription(`For a list of commands, type \`${bot.prefix}list\`. If you've donated and you'd like to receive your donator role, type \`${bot.prefix}help dr\` for instructions.`);

  m.channel.send({ embed }).catch(bot.util.err);
};

module.exports = new OptiBit(metadata);
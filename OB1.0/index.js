// Dependencies
const discord = require('discord.js');
const request = require('request');
const jimp = require('jimp');

// Local files
const cfg = require('./app/config.json');

// Initialize
const bot = new discord.Client({
  autoReconnect: true
});
console.log("Connecting to websocket...");
bot.login(cfg.api.discord);

// Application Start
bot.on('ready', () => {
  console.warn("Logged into Discord API as "+bot.user.username+"#"+bot.user.discriminator+" with token: "+cfg.api.discord);
  console.log("OptiBot v1.0.0 - Ready to work! \nCreated by Kyle Edwards, 2018 \nCurrently connected to "+bot.guilds.size+" active servers.");

  bot.user.setActivity("!help", {type: 'LISTENING'});
  checkStatus();
});

bot.on('messageDelete', m => {
  var time = m.createdAt;
  timestamp = ('0' + (time.getMonth()+1)).slice(-2) + '-' + ('0' + time.getDate()).slice(-2) + '-' + time.getFullYear() + ' at ' + ('0' + time.getHours()).slice(-2) + ':' + ('0' + time.getMinutes()).slice(-2) + ':' + ('0' + time.getSeconds()).slice(-2);
  bot.guilds.get('467130551556636692').channels.get(cfg.channels.log).send({embed: new discord.RichEmbed()
    .setColor(cfg.embeds.default)
    .setTitle(`**MESSAGE DELETION LOG**`)
    .addField(`Posted by ${m.author.username}#${m.author.discriminator} on ${timestamp}`, m.content)
    .setTimestamp()
    .setFooter('OptiBot Log', bot.user.avatarURL)
  })
});

bot.on('message', m => {
  // Stop task if this message was posted by the system or another bot.
  if(m.author.system || m.author.bot) return;
  if(m.channel.type === 'dm') {
    m.channel.send("Please use the OptiFine discord server to use this bot! \nhttps://discord.gg/tKxWtyf");
    return;
  }

  // Check message for references to GitHub issues/pull requests.
  if(m.content.indexOf("#") !== -1){
    // make request to GitHub API
    console.log('requesting data from GitHub API: https://api.github.com/search/issues?q=repo:sp614x/optifine')
    request({url: 'https://api.github.com/search/issues?q=repo:sp614x/optifine', headers: {'User-Agent': 'optibot'}}, (err, res, data) => {
      // convert data to readable JSON
      var dataJSON = JSON.parse(data);
      var issue_count;
      // convert user message to an array, filter to only the '#XXXX' entries, and remove any that are impossible to reference. (#0, #20000000, etc)
      var issueList = m.content.trim().replace(/\n/g, " ").split(" ").filter(number => {
        return number.indexOf('#') === 0
      }).filter(limit => {
        var issueNumber = parseInt(limit.substr(1));
        if (issueNumber < dataJSON.total_count && issueNumber > 0) return true;
      });
      // add hyperlinks to mentioned issues in message
      function addIssueLinks(cb){
        var issueLinks = "";
        for (var issue in issueList){
          let newLink = "https://github.com/sp614x/optifine/issues/"+issueList[issue].toString().substr(1)+"\n";
          // add links to message, check if they've already been added
          if(issueLinks.indexOf(newLink) === -1){
            console.log("added link");
            issueLinks += newLink;
          }
          // check if
          if((issueLinks.split("\n").length === cfg.gh_refs.limit+1) && (parseInt(issue)+1 < issueList.length)){
            console.log("too many links, stopping");
            issueLinks += "Some issues were omitted to prevent spam.";
          }
          if((parseInt(issue)+1 === issueList.length) || ((issueLinks.split("\n").length === cfg.gh_refs.limit+1) && (parseInt(issue)+1 < issueList.length))) {
            cb(issueLinks);
            break;
          }
        }
      }
      addIssueLinks((issueLinks) => {
        if(issueLinks !== ""){
          console.log("sending message");
          m.channel.send(issueLinks);
        }
      });
    });
  }

  // Stop task if message does not start with the command trigger.
  if(!m.content.trim().startsWith(cfg.trigger)) return;

  // Modify message to be usable by code.
  let input = m.content.trim().split("\n", 1)[0];
  let cmd = input.toLowerCase().split(" ")[0].substr(1);
  let args = input.split(" ").slice(1);

  // BEGIN COMMAND HANDLER

  if(cmd === "ping"){
    m.reply("Pong. \nAverage "+bot.ping+"ms response time.");
  } else
  if(cmd === "doc") {
    var message = "https://github.com/sp614x/optifine/blob/master/OptiFineDoc/doc/";

    if(!args[0]){
      m.channel.send("https://github.com/sp614x/optifine/tree/master/OptiFineDoc/doc");
      return;
    }

    function docBasic() {
      if(args[0] === "background" || args[0] === "panorama" || args[0] === "bg" || args[0] === "background.properties"){
        message += "background.properties";
        docLine();
      } else
      if(args[0] === "bettergrass" || args[0] === "grass" || args[0] === "bettergrass.properties"){
        message += "bettergrass.properties";
        docLine();
      } else
      if(args[0] === "biome_palettes" || args[0] === "palettes" || args[0] === "biome_colormaps" || args[0] === "biome_palettes.txt"){
        message += "biome_palettes.txt";
        docLine();
      } else
      if(args[0] === "biome_palettes_grid" || args[0] === "palettes_grid" || args[0] === "grid" || args[0] === "biome_palettes_grid.txt"){
        message += "biome_palettes_grid.txt";
        docLine();
      } else
      if(args[0] === "block" || args[0] === "custom_blocks" || args[0] === "block.properties"){
        message += "block.properties";
        docLine();
      } else
      if(args[0] === "cem_animation" || args[0] === "cem_animation.txt"){
        message += "cem_animation.txt";
        docLine();
      } else
      if(args[0] === "cem_model" || args[0] === "cem" || args[0] === "cem_model.txt"){
        message += "cem_model.txt";
        docLine();
      } else
      if(args[0] === "cem_part" || args[0] === "cem_part.txt"){
        message += "cem_part.txt";
        docLine();
      } else
      if(args[0] === "cit" || args[0] === "custom_items" || args[0] === "cit.properties"){
        message += "cit.properties";
        docLine();
      } else
      if(args[0] === "cit_single" || args[0] === "custom_items_single" || args[0] === "cit_single.properties"){
        message += "cit_single.properties";
        docLine();
      } else
      if(args[0] === "color" || args[0] === "custom_colors" || args[0] === "colors" || args[0] === "color.properties"){
        message += "color.properties";
        docLine();
      } else
      if(args[0] === "colormap" || args[0] === "colormaps" || args[0] === "custom_colormaps" || args[0] === "colormap.properties"){
        message += "colormap.properties";
        docLine();
      } else
      if(args[0] === "ctm" || args[0] === "connected_textures" || args[0] === "connected_textures_mod" || args[0] === "ctm.properties"){
        message += "ctm.properties";
        docLine();
      } else
      if(args[0] === "custom_animations" || args[0] === "animations" || args[0] === "custom_animations.txt"){
        message += "custom_animations.txt";
        docLine();
      } else
      if(args[0] === "custom_guis" || args[0] === "guis" || args[0] === "custom_guis.properties"){
        message += "custom_guis.properties";
        docLine();
      } else
      if(args[0] === "custom_lightmaps" || args[0] === "lightmaps" || args[0] === "custom_lightmaps.txt"){
        message += "custom_lightmaps.txt";
        docLine();
      } else
      if(args[0] === "dynamic_lights" || args[0] === "dynamic_lights.properties"){
        message += "dynamic_lights.properties";
        docLine();
      } else
      if(args[0] === "emissive" || args[0] === "emissive_textures" || args[0] === "emissive.properties"){
        message += "emissive.properties";
        docLine();
      } else
      if(args[0] === "hd_fonts" || args[0] === "hd_font" || args[0] === "hd_fonts.txt"){
        message += "hd_fonts.txt";
        docLine();
      } else
      if(args[0] === "loading" || args[0] === "loading_screens" || args[0] === "custom_loading_screens" || args[0] === "loading.properties"){
        message += "loading.properties";
        docLine();
      } else
      if(args[0] === "natural" || args[0] === "natural_textures" || args[0] === "natural_texture" || args[0] === "natural.properties"){
        message += "natural.properties";
        docLine();
      } else
      if(args[0] === "properties_files" || args[0] === "properties" || args[0] === "properties_files.txt"){
        message += "properties_files.txt";
        docLine();
      } else
      if(args[0] === "random_entities" || args[0] === "random_mobs" || args[0] === "random_entities.properties"){
        message += "random_entities.properties";
        docLine();
      } else
      if(args[0] === "shaders" || args[0] === "shaders1" || args[0] === "shaders.txt"){
        message += "shaders.txt";
        docLine();
      } else
      if(args[0] === "shaders_properties" || args[0] === "shaders2" || args[0] === "shaders.properties"){
        message += "shaders.properties";
        docLine();
      } else
      if(args[0] === "sky" || args[0] === "custom_sky" || args[0] === "sky.properties"){
        message += "sky.properties";
        docLine();
      } else
      if(args[0] === "system_properties" || args[0] === "launch_options" || args[0] === "system_properties.txt"){
        message += "system_properties.txt";
        docLine();
      } else {
        m.reply("Invalid documentation. You can find valid docs here: \nhttps://github.com/sp614x/optifine/tree/master/OptiFineDoc/doc")
      }
    }

    function docLine() {
      if(args[1]){
        if(!isNaN(parseInt(args[1]))) {
          message += "#L"+args[1];
          finalMessage();
        }
      } else {
        finalMessage();
      }
    }

    function finalMessage () {
      m.channel.send(message);
    }

    docBasic();
  } else
  if(cmd === "donate"){
    m.reply("You can support OptiFine's development here: https://optifine.net/donate \nThank you for your consideration!")
  } else
  if(cmd === "cape") {
    // Check if message includes arguments
    if(!args.length) {
      m.reply("Please specify the Minecraft username of the cape owner. (Case-sensitive)");
    } else {
      request({url: 'https://optifine.net/capes/'+args[0]+'.png', encoding: null}, (err, res, data) => {
        if(err) {
          console.log('HTTPS GET Request failed: \n'+e);
          m.channel.send('An error occured while processing that request. If this continues, please contact an administrator.')
        } else
        // Does it exist?...
        if(res.statusCode === 200) {
          // ...Yes.
          jimp.read(data, (err, image) => {
            if(err){
              console.log(err)
              m.channel.send("An error occurred while doing that. \n```" + err + "```")
            } else {
              image.resize(256, jimp.AUTO, jimp.RESIZE_NEAREST_NEIGHBOR)
              image.getBuffer(jimp.AUTO, (err, imgFinal) => {
                m.channel.send("Cape for player `"+args[0]+"`", new discord.Attachment(imgFinal, args[0]+".png"));
              });
            }
          });
        } else
        if(res.statusCode === 404) {
          // ...No.
          m.reply("That user doesn't have a cape! ...Or they don't exist.");
        } else {
          // ...Not sure. Got some other response we weren't expecting.
          m.reply("An error occurred while communicating with the OptiFine servers. Please try again in 5 minutes.");
          checkStatus();
        }
      });
    }
  } else
  if(cmd === "stop" && m.author.id === "181214529340833792"){
    bot.destroy();
  } else
  if(cmd === "status"){
    websiteStatus((result) => {
      var msg = "Server responded with status code "+result+"\n";
      if(result === 200){
        bot.user.setStatus('online');
        console.log("Status set to ONLINE.");
        msg += "https://optifine.net/home is online and operational.";
      } else
      if(result === 404){
        bot.user.setStatus('dnd');
        console.log("Status set to DO NOT DISTURB.");
        msg += "https://optifine.net/home appears to be offline. Try again in 5-10 minutes.";
      } else {
        bot.user.setStatus('idle');
        console.log("Status set to IDLE.");
      }
      m.reply(msg);
    });
  } else
  if(cmd === "help"){
    m.channel.send({embed: new discord.RichEmbed()
      .setTitle('OptiBot Help')
      .setColor(cfg.embeds.default)
      .setThumbnail('https://drive.google.com/uc?export=download&id=1H7_6FRkgJ6bRkV4KnF3OMFPi9M4ASWKQ')
      .addField('Commands', "`!doc [feature] [line]` to reference documentation.")
      .addField('_ _', "`!donate` for donation information.")
      .addField('_ _', "`!cape <playername>` displays donator capes. Note that player names are case-sensitive.")
      .addField('_ _', "`!status` checks the status of the website.")
      .addField('_ _', "`!ping` checks average websocket response time.")
      .addField('_ _', "`!help` displays this dialog.")
      .addField('_ _', "`!about` tells you about OptiBot.")
      .addBlankField()
      .addField('Other neat tricks', "You can reference an issue from the OptiFine GitHub by typing `#<number>` anywhere in your message. This can be circumvented by adding a backwards slash `\\` immediately before the number sign `#`. Note that issue references are limited to 3 per message to prevent spam.")
      .addField('_ _', "The bot automatically checks the website status approximately every 30 minutes. The result will change the bots online status accordingly.")
      .setFooter('OptiBot • !help', bot.user.avatarURL)});
  } else
  if(cmd === "about"){
    m.channel.send({embed: new discord.RichEmbed()
      .setTitle('About OptiBot')
      .setColor(cfg.embeds.default)
      .addField('_ _', "OptiBot was created by jackasterisk for the official OptiFine Discord server.")
      .addField("_ _", "Special thanks to 3XH6R for helping with bugtesting 🐞")
      .setFooter('OptiBot • !about', bot.user.avatarURL)});
  }
});

bot.on('disconnect', event => {
  console.log("Disconnected from websocket. Event code "+event.code);
});

bot.on('reconnecting', () => {
  console.log('Attempting to reconnect to websocket...');
});


// Global functions
function websiteStatus(result) {
  request('https://optifine.net/home', (err, res, body) => {
    if(err){
      console.log('HTTPS GET Request failed: \n'+err);
      result('error');
    } else {
      console.log("Checking status of https://optifine.net/home, statusCode:", res.statusCode);
      result(res.statusCode);
    }
  });
}

function checkStatus() {
  websiteStatus((result) => {
    if(result === 200){
      bot.user.setStatus('online');
      console.log("Status set to ONLINE.");
    } else
    if(result === 404){
      bot.user.setStatus('dnd');
      console.log("Status set to DO NOT DISTURB.");
    } else {
      bot.user.setStatus('idle');
      console.log("Status set to IDLE.");
    }
  });
};

bot.setInterval(function(){checkStatus()}, 1800000);

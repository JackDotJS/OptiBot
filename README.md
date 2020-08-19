<div align="center">
    <h1>OptiBot</h1>
    <h3>Official Discord bot for OptiFine.</h3>
    <a href="https://discord.gg/3mMpcwW">https://discord.gg/OptiFine</a>
</div>

## Prerequisites
- [Node.js 12.12.0 or later](https://nodejs.org/en/)
- All file extensions enabled in your file browser of choice.
- Your own Discord bot token for testing.
- Three of your own Discord servers for testing. (I know... sorry. Will try to make the bot usable on a single server in the future. See [#200](https://github.com/Team-OptiFine/OptiBot/issues/200))

---

## Discord Bot Setup

### 1. Head to [Discord's developer website](https://discord.com/developers/applications/) and create an application.
You can give it any name and icon you want, doesn't matter.

### 2. In the side panel on the left, click on the "Bot" tab and then click "Add Bot"
You can change the username if you want. Again, doesn't matter. Do note that the username in this panel is the one that will actually display to users in Discord.

### 4. Invite the bot to a test server of your choice.
[You may find this web tool immensely useful for this step.](https://discordapi.com/permissions.html)

### 3. You're done! ...Mostly.
Before closing the page, make sure you know how to get back here.

---

## Discord Server Setup

[TODO]

---

## Fork/Environment Setup

### 1. Make a fork of the repository.
Please DON'T push updates directly to the master branch. **Always use pull requests!!!**

### 2. Clone the forked repository to your own device.
I recommend using [GitHub Desktop](https://desktop.github.com/) since it's just *infinitely* easier. 
[Here's an official guide.](https://docs.github.com/en/desktop/contributing-and-collaborating-using-github-desktop/cloning-and-forking-repositories-from-github-desktop)

### 3. Open a command prompt and navigate to the folder containing the repository files.
Simply start `cmd.exe` and run this command:
```
cd "C:/YOUR/DIRECTORY"
```

### 4. Run the command `npm install` and wait for it to finish.
This could take several minutes. This will install the additional dependencies OptiBot requires. 
Once finished, you can safely close the command prompt.

### 5. Navigate to the `./cfg` folder with your file browser.

### 6. Make a copy of the file `keys.json.EDITTHIS` and rename it to `keys.json`.

### 7. From the "Bot" tab of your Discord application, copy and paste it into the `discord` property of `keys.json`.
It should look like this:
```json
{
    "discord": "YOUR_TOKEN_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

### 8. You're pretty much done. Run `init.bat`, and the bot will create the additional folders and files required for operation.
If something is missing, it should tell you. If you have any problems, just message me on Discord.

<div align="center">
<h1>OptiBot: Project NX</h1>
<h3>Official Discord bot for OptiFine.</h3>
<a href="https://discord.gg/3mMpcwW">https://discord.gg/3mMpcwW</a>
</div>

## Requirements
- Node.js 12.12.0 or later

## Environment Setup
1. Download the repository and extract the files to the directory of your choice.
2. Open a command prompt and navigate to the folder containing the repository files.
3. Run the command `npm install` and wait for it to finish. This will install the required dependencies. Once finished, you can close the command prompt.
4. **Make sure you have file extensions enabled before proceeding.** Navigate to the `./cfg` folder and rename the file `keys.json.EDITTHIS` to `keys.json`.
5. Before OptiBot can actually run on Discord, you will need a Discord API token. [You can get one here.](https://discordapp.com/developers/applications/) Create a new application, and then create a bot user for that application.
    - **Important:** If you want to test embed-based logging, you will need to create a second application with its own bot user.
6. Copy the token from the "Bot" tab of your Discord application, and paste it into the `discord` property of `keys.json`.
    - If you're gonna be using embed-based logging, paste the second bot token into the `log` property just below.
7. You're pretty much done. Run `init.bat`, and the bot will create the additional folders and files required for operation. If something is missing, it should tell you.
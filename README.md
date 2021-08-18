# Role Bot
Discord role bot.

# Table Of Contents
- [Overview](#overview)
- [Development](#development)
- [Configuration](#configuration)

# Overview
Typescript Discord bot which assigns roles to users.

# Development
## Docker Compose
A Docker container is provided with NodeJS and Yarn installed. Docker and Docker Compose must be installed.

To run and develop the bot:

1. Start the Docker Compose stack:
   ```shell
   docker-compose up -d
   ```

## Manual Steps
NodeJS and Yarn must be installed.

To run and develop the bot:

1. Install dependencies:
   ```shell
   yarn install
   ```
2. Source environment variables
   ```shell
   source ./.env
   ```
3. Start development watch serer:
   ```shell
   yarn watch
   ```

# Configuration
Environment variables are used to provide all configuration values. See the `Config` class field documentation comments in [`config.ts`](./src/config.ts) for names of associated environment variables and their purposes.

The `.env` file is expected to have configuration values. This file is ignored by Git as some values are secret. 

1. Copy `.env-example` to `.env` and set your own values
2. Never commit the `.env` file

## Discord
The chat bot requires the Discord API.

### Discord API Application
To authenticate with the Discord API you must create a Discord API Application:

1. Navigate to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Navigate to the Bot page and add a bot
4. Find values for configuration:  
   - `ROLE_BOT_DISCORD_CLIENT_ID`: Go to your Discord application's General Information page, use the "APPLICATION ID" value  
   - `ROLE_BOT_DISCORD_API_TOKEN`: Go to your Discord application's Bot page, use the "TOKEN" value  
  
### Discord Guild IDs
The `ROLE_BOT_DISCORD_GUILD_IDS` environment variable specifies for which Discord servers the bot will install and respond to commands.

The environment variable value is a list of server nicknames, and their guild IDs. The server nickname is just a name this chat bot will use to internally to refer to a Discord server. 

List items are in the format `<nickname>=<guild ID>`. They are separated by commas.

> For example a value of:
> 
> ```
> games=xyz,school=123
> ```
> 
> Represents a list with 2 items:
> 
> | Nickname | Guild ID |
> | -------- | -------- |
> | games    | xyz      |
> | school   | 123      |

To find a Discord server's guild ID:

1. Enable developer mode in your Discord:  
   1.1. Open your Discord  
   1.2. Go to settings  
   1.3. In the Advanced tab enable the Developer mode option  
2. Retrieve a Discord server's guild ID:  
   2.1. View your server list on the left-hand side of the Discord client  
   2.2. Right click on the server for which you want to retrieve the ID  
   2.3. At the very bottom of the right-click menu select Copy ID, use this value  

# Role Bot
Discord role bot.

# Table Of Contents
- [Overview](#overview)
- [Development](#development)
- [Configuration](#configuration)

# Overview
Golang Discord bot which assigns roles to users.

# Development
## Docker Compose
A Docker container is provided with Golang installed. Docker and Docker Compose must be installed.

To run and develop the bot:

1. Setup bot configuration by following the [Configuration section](#configuration) steps
2. Start the Docker Compose stack:
   ```shell
   docker-compose up -d --build
   ```

## Manual Steps
NodeJS and Yarn must be installed.

To run and develop the bot:

1. Install dependencies:
   ```shell
   yarn install
   ```
2. Setup bot configuration by following the [Configuration section](#configuration) steps
3. Source environment variables
   ```shell
   source ./.env
   ```
4. Setup the Postgres database:
   ```shell
   yarn migrate
   ```
5. Generate types from the Postgres database:
   ```shell
   yarn pg-types
   ```
6. Start development watch server:
   ```shell
   yarn watch
   ```
   
 The `./scripts/dev-entrypoint.sh` automates most of this process.

# Configuration
Environment variables are used to provide all configuration values.

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

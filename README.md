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
2. Start development watch serer:
   ```shell
   yarn dev
   ```

# Configuration
Provided by environment variables. See [`config.ts`](./src/config.ts) documentation comments for names of associated environment variables.

Copy `.env-example` to `.env` and set your own values.

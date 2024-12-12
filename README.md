# Development
1. Install dependencies:
   ```
   pip install -e `.[dev]'
   ```
2. Go to the [Discord developer portal](https://discord.com/developers/applications/), click on your app > Bot and get your bot token
3. Configure via env vars: Make a copy of `.env.example` named `.env`, set your own values (Dotenv will load the `.env` file when the bot runs)
4. Start the bot:
   ```
   python ./src/role_bot/main.py
   ```

Notes:

- Modify `pyproject.toml` to specify dependencies: `project.dependencies` and `project.optional-dependencies`

## Commands

Admin:

- [x] `/create-role-list`
- [ ] `/role-list`
  - [ ] `/edit-roles`
  - [ ] `/edit-details`

User:


# Operations
## One Time / Rarely Run Setup Tasks
At the beginning of a deployment some commands need to be run to set up the environment:

- **Sync commands:**
  Sync the commands to the Discord server:
  ```
  ./src/role_bot/main.py sync-commands
  ```

  This needs to be re-run once a new command is added to the bot.  

  If a command is removed from the bot, it needs to be cleared from the Discord server:
  ```
  ./src/role_bot/main.py clear-commands
  ```
  Provide the `--global` option if you need to clear global commands (Usually bot commands are added to a guild not globally so this usually isn't needed).
- **DB migrate:**
   > **Warning:** This is a risky operation  
   > **TODO:** Implement a more robust migration system with Alembic

   Migrate the database to the latest schema:
   ```
   ./src/role_bot/main.py dev-db-migrate
   ```

## Periodic Tasks
The bot needs some commands to be run periodically:

- **Sync roles:**
  Sync Discord roles into the database:
  ```
  ./src/role_bot/main.py sync-roles
  ```

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
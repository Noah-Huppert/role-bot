import argparse
import logging

import discord
import sqlalchemy.schema

from role_bot.config import cfg
from role_bot.db import engine, db_session

logger = logging.getLogger(__name__)

target_guild = discord.Object(cfg.guild_id)
"""Object which only indicates the ID of a guild"""

class NewRoleListModal(
    discord.ui.Modal,
    title="New Role List",
):
    name = discord.ui.TextInput(
        label="Name",
        placeholder="Games",
    )

    description = discord.ui.TextInput(
        label="Description",
        placeholder="Select the games you play",
        style=discord.TextStyle.long,
    )

    async def on_submit(self, interaction: discord.Interaction):
        with db_session as s:
            s.add(RoleList(
                name=self.name.value,
                description=self.description.value,
            ))
            s.commit()

        embed = discord.Embed(
            title=self.name.value,
            description=self.description.value,
            color=discord.Color.blue(),
            footer="Role List",
        )
        await interaction.response.send_message(embed=embed)

class AppClient(discord.Client):
    def __init__(self, *args, **kwargs):
        intents = discord.Intents.default()
        #intents.message_content = True

        super().__init__(*args, intents=intents, **kwargs)

        self.tree = discord.app_commands.CommandTree(self)
        self.tree.command(
            name='create-role-list',
            guilds=[target_guild],
        )(self.interaction_create_role_list)

    async def on_ready(self):
        logger.info("Logged in as %s", self.user)

    async def setup_hook(self):
        await self.tree.sync(guild=target_guild)
        logger.info("Synced commands to guild %s", target_guild)


    async def interaction_create_role_list(self, interaction: discord.Interaction):
        await interaction.response.send_modal(NewRoleListModal())


def main():
    parser = argparse.ArgumentParser(description="Role Bot")
    subparsers = parser.add_subparsers(dest="command", required=False)

    bot_parser = subparsers.add_parser("bot", help="Run the bot")
    migrate_parser = subparsers.add_parser("migrate", help="Run migrations")

    args = parser.parse_args()

    if args.command is None or args.command == "bot":
        client = AppClient()

        logger.info("Starting bot")

        client.run(cfg.discord_token.get_secret_value())

        logger.info("Bot shut down")
    else:
        logger.info("Running migrations")

        metadata = sqlalchemy.schema.MetaData()
        metadata.create_all(engine)

        logger.info("Migrations successful")


if __name__ == '__main__':
    main()
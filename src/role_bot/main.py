import discord

import logging

from role_bot.config import cfg

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



client = AppClient()
logger.info("Starting bot")
client.run(cfg.discord_token.get_secret_value())
logger.info("Bot shut down")
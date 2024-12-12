from typing import Awaitable, Callable, Optional, Set, TypedDict
import asyncio
from datetime import datetime
import os
import logging

import discord

from role_bot.bot.errors import interaction_error_handler
from role_bot.bot.modals import EditRoleListDetailsModal, NewRoleListModal
from role_bot.bot.services import RoleListService
from role_bot.bot.views import EditRoleListRoleView, RoleListSelectView, ViewRoleListView
from role_bot.db import engine, db_session
from role_bot.models import DiscordRole, RoleList
from role_bot.bot.constants import CMD_VIEW_ROLE_LIST, CMD_CREATE_ROLE_LIST, CMD_EDIT_ROLE_LIST_ROLES, CMD_EDIT_ROLE_LIST_DETAILS

logger = logging.getLogger(__name__)

class DiscordRoleShouldHaveBeenAddedError(Exception):
    """Raised when a Discord role should have been added but wasn't."""
    def __init__(self, discord_role_id: int):
        super().__init__(f"Discord role {discord_role_id} should have been added but wasn't, this is a bug")

class AppClientCtxMgr:
    """Context manager for the bot."""
    _app_client: "AppClient"

    def __init__(self, **kwargs):
        """Initialize.

        :param kwargs: Keyword arguments to pass to :class:`AppClient`.
        """
        self._app_client = AppClient(**kwargs)

    async def __aenter__(self):
        """Enter the context manager."""
        return self._app_client

    async def __aexit__(self, exc_type, exc_value, traceback):
        await self._app_client.close()

class AppClient(discord.Client):
    """Bot."""
    _role_list_svc: RoleListService

    _target_guild: Optional[discord.Guild]
    target_guild_id: int
    _target_guild_id_obj: discord.Object

    _ready_event: asyncio.Event
    _event_loop_start_requested: bool = False

    def __init__(self, *args, target_guild_id: int, **kwargs):
        """Initialize.
        
        :param target_guild_id: ID of the Discord guild for which this bot will serve
        """
        intents = discord.Intents.default()

        super().__init__(*args, intents=intents, **kwargs)

        self._role_list_svc = RoleListService()

        self._target_guild = None
        self.target_guild_id = target_guild_id
        self._target_guild_id_obj = discord.Object(id=self.target_guild_id)

        self._ready_event = asyncio.Event()

        # Setup slash command handlers
        self.tree = self._define_cmd_tree()
        
    @classmethod
    def ctx_mgr(cls, **kwargs):
        """Create a context manager for the Discord client.
        
        :param kwargs: Keyword arguments to pass to :class:`AppClient`.
        """
        return AppClientCtxMgr(**kwargs)
    
    def _define_cmd_tree(self) -> discord.app_commands.CommandTree:
        """Define the command tree."""
        tree = discord.app_commands.CommandTree(self)
        @tree.command(
            name=CMD_VIEW_ROLE_LIST,
            description="View and edit a role list",
            guilds=[self._target_guild_id_obj],
        )
        async def view_role_list(interaction: discord.Interaction):
            return await self.interaction_view_role_list(interaction)
        
        @tree.command(
            name=CMD_CREATE_ROLE_LIST,
            description="Create a new role list",
            guilds=[self._target_guild_id_obj],
        )
        async def create_role_list(interaction: discord.Interaction):
            return await self.interaction_create_role_list(interaction)
        
        @tree.command(
            name=CMD_EDIT_ROLE_LIST_ROLES,
            description="Edit roles in a role list",
            guilds=[self._target_guild_id_obj],
        )
        async def edit_roles(interaction: discord.Interaction):
            return await self.interaction_edit_roles(interaction)
        
        @tree.command(
            name=CMD_EDIT_ROLE_LIST_DETAILS,
            description="Edit role list details",
            guilds=[self._target_guild_id_obj],
        )
        async def edit_role_list_details(interaction: discord.Interaction):
            return await self.interaction_edit_role_list_details(interaction)
        
        return tree
    async def start(self, *args, **kwargs):
        """Overriden start() to set the event loop start requested flag."""
        self._event_loop_start_requested = True
        return await super().start(*args, **kwargs)
    
    async def run(self, *args, **kwargs):
        """Overriden run() to set the event loop start requested flag."""
        self._event_loop_start_requested = True
        return super().run(*args, **kwargs)

    async def get_target_guild(self) -> discord.Guild:
        """Lazy loads the target guild.
        
        Because it cannot be retrieved until the the client is ready.
        """
        if self._target_guild is None:
            self._target_guild = await self.fetch_guild(self.target_guild_id)
        
        return self._target_guild

    async def on_ready(self):
        """Run when the bot is done setting up."""
        logger.info("AppClient ready and logged in as %s", self.user)

        self._ready_event.set()

    async def wait_until_ready(self):
        """Wait until the bot is ready. Only returns if the Discord client event loop is running.
        
        This means the method won't return unless self.start() is called. However this method will block where it is called. See `asyncio.create_task()` to run in a non-blocking way.

        :raises RuntimeError: If the event loop was not started.
        """
        if not self._event_loop_start_requested:
            raise RuntimeError("Event loop was not started so this method would block indefinitely")

        return await self._ready_event.wait()

    #async def setup_hook(self):
    #    """Run when bot is starting up, ensures commands are registered properly in the target guild."""
    #    pass

    class SyncRolesResult(TypedDict):
        """Results of :meth:`sync_roles`."""
        discord_role_ids: Set[int]
        added_discord_role_ids: Set[int]
        rm_discord_role_ids: Set[int]
        renamed_discord_role_ids: Set[int]

    async def sync_roles(self) -> SyncRolesResult:
        """Ensure only roles which exist in the target guild exist in the database as :class:`DiscordRole`."""
        with db_session as sess:
            # Load roles IDs for DB
            db_discord_role_ids = {
                discord_role.discord_role_id
                for discord_role in sess.query(DiscordRole.discord_role_id).where(DiscordRole.guild_id == self.target_guild_id).all()
            }
            
            # Load roles IDs from Discord right now
            discord_roles_by_ids = {
                discord_role.id: discord_role
                for discord_role in list((await self.get_target_guild()).roles)
            }
            """Use this list as a list of 'all discord guild roles' from now on, as it is a snapshot and makes the code more robust if roles change during the sync process."""

            guild_discord_role_ids = {
                discord_role.id
                for discord_role in discord_roles_by_ids.values()
            }

            # Determine which roles to remove or add
            missing_db_discord_role_ids: Set[int] = guild_discord_role_ids.difference(db_discord_role_ids)
            to_rm_discord_role_ids: Set[int] = db_discord_role_ids.difference(guild_discord_role_ids)

            # Add roles
            for discord_role_id in missing_db_discord_role_ids:
                sess.add(DiscordRole(
                    name=discord_roles_by_ids[discord_role_id].name,
                    guild_id=self.target_guild_id,
                    discord_role_id=discord_role_id,
                    last_synced=datetime.now(),
                ))

            # Remove roles
            if len(to_rm_discord_role_ids) > 0:
                sess.query(DiscordRole).filter(DiscordRole.discord_role_id.in_((list(to_rm_discord_role_ids),))).delete()

            # Check names are correct
            renamed_discord_role_ids = set()
            for discord_role_id, discord_role in discord_roles_by_ids.items():
                db_discord_role = sess.query(DiscordRole).where(
                    DiscordRole.discord_role_id == discord_role_id,
                ).one_or_none()
                if db_discord_role is None:
                    raise DiscordRoleShouldHaveBeenAddedError(discord_role_id)


                if db_discord_role.name != discord_role.name:
                    db_discord_role.name = discord_role.name
                    renamed_discord_role_ids.add(discord_role_id)
                
                db_discord_role.last_synced = datetime.now()


            sess.commit()

            return {
                'discord_role_ids': set(discord_roles_by_ids.keys()),
                'added_discord_role_ids': missing_db_discord_role_ids,
                'rm_discord_role_ids': to_rm_discord_role_ids,
                'renamed_discord_role_ids': renamed_discord_role_ids,
            }
    
    async def sync_commands(self):
        """Sync commands to the target guild."""
        logger.info("Syncing commands to guild %s", self.target_guild_id)

        # Add commands
        synced = await self.tree.sync(guild=self._target_guild_id_obj)

        logger.info("Synced commands to guild %s: %s", self.target_guild_id, ", ".join([f"/{cmd.name}" for cmd in synced]))

    async def clear_commands(self, clear_global: bool = False):
        """Clear all commands in the target guild."""
        self.tree.clear_commands(guild=self._target_guild_id_obj if not clear_global else None)
        await self.tree.sync(guild=self._target_guild_id_obj if not clear_global else None)

        logger.info("Cleared commands, AppClient instance won't handle any commands afterwards")
        
    async def _send_select_role_list_view(self, interaction: discord.Interaction, on_select: Callable[[discord.Interaction, RoleList], Awaitable[None]]):
        """Send the select role list view with proper handling if no role lists exist."""
        # Only send selection view if there are role lists
        role_lists = self._role_list_svc.list_all()
        if len(role_lists) > 0:
            # If role lists, ask which role list to edit
            await interaction.response.send_message(
                "Select role list to edit",
                view=RoleListSelectView(
                    on_select=on_select,
                    role_lists=role_lists,
                ),
            )
        else:
            # If no role lists then say how to make one
            await interaction.response.send_message(f"No role lists, use `/{CMD_CREATE_ROLE_LIST}` to create one")

    @interaction_error_handler
    async def interaction_view_role_list(self, interaction: discord.Interaction):
        """View and edit role list."""
        async def on_role_list_select(select_interaction: discord.Interaction, role_list: RoleList):
            """When role is selected show overview and edit ui."""
            await ViewRoleListView(
                role_list_svc=self._role_list_svc,
                role_list=role_list,
            ).send_message(select_interaction)

        await self._send_select_role_list_view(interaction=interaction, on_select=on_role_list_select)

    @interaction_error_handler
    async def interaction_create_role_list(self, interaction: discord.Interaction):
        """Create role list slash command handler."""
        await interaction.response.send_modal(NewRoleListModal(
            role_list_svc=self._role_list_svc,
        ))

    @interaction_error_handler
    async def interaction_edit_roles(self, interaction: discord.Interaction):
        """Edit roles slash command handler."""
        async def on_role_list_select(select_interaction: discord.Interaction, role_list: RoleList):
            """When a role list is selected show the edit roles view for that role list"""
            view = EditRoleListRoleView(
                    role_list_svc=self._role_list_svc,
                    role_list=role_list,
                )
            await view.prepare()
            await select_interaction.response.send_message(
                content=f"Edit '{role_list.name}' role list roles",
                view=view,
            )
        
        await self._send_select_role_list_view(interaction=interaction, on_select=on_role_list_select)

    @interaction_error_handler
    async def interaction_edit_role_list_details(self, interaction: discord.Interaction):
        """Edit role list details slash command handler."""
        async def on_role_list_select(select_interaction: discord.Interaction, role_list: RoleList):
            """When a role list is selected show the edit role list details modal for that role list"""
            modal = EditRoleListDetailsModal(
                role_list_svc=self._role_list_svc,
                role_list=role_list,
            )
            await modal.prepare()
            await select_interaction.response.send_modal(modal)
        
        await self._send_select_role_list_view(interaction=interaction, on_select=on_role_list_select)

    async def ensure_custom_emojis(self, guild_id: int):
        """Ensure custom emojis exist in the specified guild for each image in 'images/custom-emojis'."""
        guild = self.get_guild(guild_id)
        if not guild:
            print(f"Guild with ID {guild_id} not found.")
            return

        # List all image files in the directory
        emoji_dir = 'images/custom-emojis'
        emoji_files = [f for f in os.listdir(emoji_dir) if os.path.isfile(os.path.join(emoji_dir, f))]

        # Get existing emojis in the guild
        existing_emojis = {emoji.name: emoji for emoji in guild.emojis}

        for emoji_file in emoji_files:
            emoji_name, _ = os.path.splitext(emoji_file)
            if emoji_name not in existing_emojis:
                # Read the image file
                with open(os.path.join(emoji_dir, emoji_file), 'rb') as image:
                    image_data = image.read()

                # Create the emoji
                await guild.create_custom_emoji(name=emoji_name, image=image_data)
                logger.info(f"Created emoji: {emoji_name}")
            else:
                logger.info(f"Emoji {emoji_name} already exists.")
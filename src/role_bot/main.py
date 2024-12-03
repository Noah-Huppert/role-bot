#!/usr/bin/env python3
import asyncio
from typing import Generic, Optional, Callable, Dict, Awaitable, List, Set, Tuple, TypeVar, TypedDict
import argparse
import logging
from datetime import datetime
import math

import discord
from discord.ext import commands
import sqlalchemy

from role_bot.config import cfg
from role_bot.db import engine, db_session
from role_bot.models import DiscordRole, RoleList, RoleListRole, Base

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DISCORD_OPTIONS_MAX = 25
"""The maximum number of options Discord allows in a select row."""

DEFAULT_PAGE_SIZE = DISCORD_OPTIONS_MAX
"""The page size used when not specified."""

class RoleListService:
    """Business logic for role lists."""

    def create(
        self,
        name: str,
        guild_id: int,
        description: str,
    ) -> RoleList:
        """Create a role list."""
        with db_session as sess:
            role_list = RoleList(
                guild_id=guild_id,
                name=name,
                description=description,
            )
            sess.add(role_list)

            sess.commit()

            return role_list
        
    def list_paged(self, page: int, page_size=DEFAULT_PAGE_SIZE) -> List[RoleList]:
        """Get all role lists in pages."""
        with db_session as sess:
            return list(sess.query(RoleList)
                .order_by(sqlalchemy.func.regexp_replace(RoleList.name, r'[^a-zA-Z0-9]', ''))
                .limit(page_size)
                .offset(page * page_size)
                .all())
        
    def list_all(self) -> List[RoleList]:
        """List all role lists."""
        with db_session as sess:
            return list(sess.query(RoleList)
                .order_by(sqlalchemy.func.regexp_replace(RoleList.name, r'[^a-zA-Z0-9]', ''))
                .all())
        
    def rm_discord_roles(
        self,
        role_list: RoleList,
        remove_discord_role_ids: Set[int],
    ):
        """Remove roles to role list.
        
        :return: Removed discord role IDs
        """
        with db_session as sess:
            sess.add(role_list)

            in_role_list_discord_role_ids = {
                role_list_role.discord_role_id
                for role_list_role in role_list.roles
            }

            # Remove roles
            to_rm_discord_role_ids = in_role_list_discord_role_ids.intersection(remove_discord_role_ids)

            role_list_roles_by_discord_role_id = {
                role_list_role.discord_role_id: role_list_role
                for role_list_role in role_list.roles
            }
            
            for discord_role_id in to_rm_discord_role_ids:
                role_list.roles.remove(role_list_roles_by_discord_role_id[discord_role_id])

            sess.commit()

            return to_rm_discord_role_ids
        
    def add_discord_roles(
        self,
        role_list: RoleList,
        add_discord_role_ids: Set[int],
    ):
        """Add Discord roles to role list.
        
        :return: List of added Discord role IDs
        """
        with db_session as sess:
            sess.add(role_list)

            in_role_list_discord_role_ids = {
                role_list_role.discord_role_id
                for role_list_role in role_list.roles
            }

            # Add roles
            to_add_discord_role_ids = add_discord_role_ids.difference(in_role_list_discord_role_ids)

            for discord_role_id in to_add_discord_role_ids:
                role_list.roles.append(RoleListRole(
                    discord_role_id=discord_role_id,
                ))

            sess.commit()

            return to_add_discord_role_ids
        

PageResultT = TypeVar('PageResultT')
class LoadPageFnResult(TypedDict, Generic[PageResultT]):
    """Result of :ref:`PaginatedSelectLoadPageFn`.
    
    :ivar options: The options for the page
    :ivar results: The raw data form of the page
    :ivar total: The total number of options
    :ivar page_total: The total number of options in the page
    """
    options: List[discord.SelectOption]
    results: List[PageResultT]
    total: int
    page_total: int

class PageFnResult(LoadPageFnResult):
    """Result of :ref:`PaginatedSelect.page`.
    
    :ivar has_prev_page: If a previous page is available
    :ivar has_next_page: If a next page is available
    """
    page: int
    page_size: int
    hav_prev_page: bool
    has_next_page: bool

PaginatedSelectLoadPageFn = Callable[[PageFnResult], LoadPageFnResult]
"""Called when a specific page of options is requested.

:param page: The page number to load
:param page_size: The number of options to load
:return: The options for that page, must return more than 0 options
"""

PaginaedSelectOnNewPage = Callable[[int, int], Awaitable[None]]
"""Called when a new page is loaded."""

class PaginatedSelect(discord.ui.Select):
    """Select menu with hook to paginate options."""

    _load_page: PaginatedSelectLoadPageFn
    _page_size: int
    _on_new_page: Optional[PaginaedSelectOnNewPage]

    def __init__(
        self,
        load_page: PaginatedSelectLoadPageFn,
        on_new_page: Optional[PaginaedSelectOnNewPage] = None,
        page_size=DEFAULT_PAGE_SIZE,
        **kwargs,
    ):
        super().__init__(
            max_values=1,
            options=[discord.SelectOption(label="Loading...", value="loading")],
            **kwargs
        )

        self._load_page = load_page
        self._page_size = page_size
        self._on_new_page = on_new_page

    async def page(self, page: int) -> PageFnResult:
        """Load a specific page of options.
        
        :raise ValueError if load page returns no options
        """
        # Load values
        res = await self._load_page(page=page, page_size=self._page_size)
        if len(res['options']) == 0:
            raise ValueError("Cannot return 0 options from load page callback")

        # Set options
        self.options = res['options']
        self.max_values = min(self._page_size, res['page_total'])
        
        # Call handler
        return_val = {
            **res,
            'page': page,
            'page_size': self._page_size,
            'has_prev_page': page > 0,
            'has_next_page': res['total'] > (page + 1) * self._page_size,
        }
        if self._on_new_page is not None:
            await self._on_new_page(return_val)

        return return_val

class NewRoleListModal(
    discord.ui.Modal,
    title="New Role List",
):
    """Create a new Role List."""
    _role_list_svc: RoleListService

    def __init__(self, role_list_svc: RoleListService):
        super().__init__()

        self._role_list_svc = role_list_svc

        self.name = discord.ui.TextInput(
            label="Name",
            placeholder="Games",
        )
        self.add_item(self.name)

        self.description = discord.ui.TextInput(
            label="Description",
            placeholder="Select the games you play",
            style=discord.TextStyle.long,
        )
        self.add_item(self.description)

    async def on_submit(self, interaction: discord.Interaction):
        with db_session as sess:
            role_list = self._role_list_svc.create(
                guild_id=interaction.guild_id,
                name=self.name.value,
                description=self.description.value,
            )

            sess.add(role_list)

            embed = discord.Embed(
                title="Created Role List",
                description=f"""
    **Name:** {role_list.name}  
    **Description:** {role_list.description}""",
                color=discord.Color.blue(),
            )
            await interaction.response.send_message(embed=embed)

OnSelectRoleCallback = Callable[[discord.Interaction, RoleList], Awaitable[None]]
class RoleListSelectView(discord.ui.View):
    """Present menu to select a role list."""

    _role_lists: Dict[int, RoleList]
    _on_select_callback: OnSelectRoleCallback

    def __init__(
        self,
        on_select: OnSelectRoleCallback,
        role_lists: List[RoleList],
    ):
        """Initialize.
        
        :param on_select: Called when a role list is selected, arguments are (select interaction, role list)
        :raises ValueError: If role_lists is empty
        """
        super().__init__()
        self._on_select_callback = on_select

        if len(role_lists) == 0:
            raise ValueError("Cannot provide empty list of role lists")
        
        self._role_lists = {
            one_role_list.id: one_role_list
            for one_role_list in role_lists
        }
        
        self.select = discord.ui.Select(
            placeholder="Select role list",
            options=[
                discord.SelectOption(
                    label=one_role_list.name,
                    value=str(one_role_list.id),
                    description=one_role_list.description,
                )
                for one_role_list in role_lists
            ],
            min_values=1,
            max_values=1,
        )
        self.select.callback = self.on_select
        self.add_item(self.select)

    async def on_select(self, interaction: discord.Interaction):
        """Run when a role list is selected."""
        await self._on_select_callback(interaction, self._role_lists[int(self.select.values[0])])

class EditRoleListRoleView(discord.ui.View):
    """Add or remove RoleListRoles from a RoleList."""
    _role_list_svc: RoleListService
    _role_list: RoleList
    _prev_selected: Set[int]
    _page_discord_roles_by_id: Dict[int, DiscordRole]
    _page_num: int

    def __init__(
        self,
        role_list_svc: RoleListService,
        role_list: RoleList,
    ):
        """Initialize. Call :ref:`prepare` after initialization to load initial data."""
        super().__init__()

        self._role_list_svc = role_list_svc
        self._role_list = role_list

        self._prev_selected = set()
        self._page_discord_roles_by_id = {}

        self._page_num = 0

        # Setup role select
        self.roles_select = PaginatedSelect(
            placeholder="Roles",
            min_values=0,
            load_page=self.load_roles_page,
            on_new_page=self.on_new_roles_page,
        )
        self.roles_select.callback = self.on_roles_select
        self.add_item(self.roles_select)

        # Add pagination buttons
        self.prev_button = discord.ui.Button(
            emoji="⬅️",
            style=discord.ButtonStyle.primary,
        )
        self.prev_button.callback = self.on_prev_button
        self.add_item(self.prev_button)

        self.page_indicator = discord.ui.Button(
            label="Loading...",
            disabled=True,
            style=discord.ButtonStyle.secondary,
        )
        self.add_item(self.page_indicator)

        self.next_button = discord.ui.Button(
            emoji="➡️",
            style=discord.ButtonStyle.primary,
        )
        self.next_button.callback = self.on_next_button
        self.add_item(self.next_button)

    async def prepare(self):
        """Load initial data into view."""
        self.roles_select.options = (await self.roles_select.page(self._page_num))['options']

    async def load_roles_page(self, page: int, page_size: int) -> LoadPageFnResult[DiscordRole]:
        """Load a page of roles."""
        print("load_roles_page")
        with db_session as sess:
            sess.add(self._role_list)
            base_qs = sess.query(
                DiscordRole,
                #*DiscordRole.__table__.columns,
                RoleListRole,
                #*RoleListRole.__table__.columns,
            ).outerjoin(
                RoleListRole,
                DiscordRole.discord_role_id == RoleListRole.discord_role_id,
            ).where(
                DiscordRole.guild_id == self._role_list.guild_id, # to be safe
            )
            page_res = base_qs.limit(page_size).offset(page * page_size).all()

            options = [
                discord.SelectOption(
                    label=discord_role.name,
                    value=str(discord_role.discord_role_id),
                    default=role_list_role is not None,
                )
                for discord_role, role_list_role, in page_res
            ]
            self._prev_selected = len(list(map(lambda tup: tup[1] is not None, page_res)))

            total = base_qs.count()

            return {
                'options': options,
                'results': page_res,
                'total': total,
                'page_total': len(options),
            }
    
    async def on_new_roles_page(self, page_res: PageFnResult):
        """When a new page is loaded."""
        print("on_new_roles_page", page_res)
        self._page_discord_roles_by_id = {
            discord_role.discord_role_id: discord_role
            for discord_role, role_list_role in page_res['results']
        }

        # Show or hide pagination buttons
        self.prev_button.disabled = not page_res['has_prev_page']
        self.next_button.disabled = not page_res['has_next_page']

        # Update page indicator
        total_pages = math.ceil(page_res['total'] / page_res['page_size'])
        self.page_indicator.label = f"{page_res['page'] + 1} / {total_pages}"

        # Get currently selected roles
        def get_role_discord_id(option: discord.SelectOption) -> int:
            return int(option.value)
        
        page_discord_ids = map(get_role_discord_id, page_res['options'])
        
        def is_selected(discord_role_id: int) -> bool:
            return discord_role_id in page_res['options']
        
        selected_discord_ids = filter(is_selected, page_discord_ids)

        # Store currently selected as previous
        self._prev_selected = set(selected_discord_ids)

    async def on_roles_select(self, interaction: discord.Interaction):
        """Run when a change to role selections are made."""
        selected_discord_role_ids = {
            int(id)
            for id in self.roles_select.values
        }
        
        add_discord_ids = selected_discord_role_ids.difference(self._prev_selected)
        rm_discord_ids = self._prev_selected.difference(selected_discord_role_ids)

        added_discord_role_ids = self._role_list_svc.add_discord_roles(
            role_list=self._role_list,
            add_discord_role_ids=add_discord_ids,
        )
        already_added_discord_role_ids = add_discord_ids.difference(added_discord_role_ids)

        rmed_discord_role_ids = self._role_list_svc.rm_discord_roles(
            role_list=self._role_list,
            remove_discord_role_ids=rm_discord_ids,
        )
        already_rmed_discord_role_ids = rm_discord_ids.difference(rmed_discord_role_ids)

        add_role_names_by_id = {
            # Added
            **{
                discord_role_id: f"- {self._page_discord_roles_by_id[discord_role_id].name}"
                for discord_role_id in added_discord_role_ids
            },

            # Already added
            **{
                discord_role_id: f"- {self._page_discord_roles_by_id[discord_role_id].name} (Already added)"
                for discord_role_id in already_added_discord_role_ids
            },
        }

        rm_role_names_by_ids = {
            # Removed
            **{
                discord_role_id: f"- {self._page_discord_roles_by_id[discord_role_id].name}"
                for discord_role_id in rmed_discord_role_ids
            },

            # Already removed
            **{
                discord_role_id: f"- {self._page_discord_roles_by_id[discord_role_id].name} (Already removed)"
                for discord_role_id in already_rmed_discord_role_ids
            },
        }
        
        msg_parts = []
        if len(add_role_names_by_id) > 0:
            msg_parts.append(f"Added roles:\n{'\n'.join(add_role_names_by_id.values())}")
        if len(rm_role_names_by_ids) > 0:
            msg_parts.append(f"Removed roles:\n{'\n'.join(rm_role_names_by_ids.values())}")
        
        await interaction.response.send_message(content="\n".join(msg_parts))

    async def on_prev_button(self, interaction: discord.Interaction):
        """Run when the previous button is clicked."""
        self._page_num -= 1
        await self.roles_select.page(page=self._page_num)
        await interaction.response.send_message(view=self)

    async def on_next_button(self, interaction: discord.Interaction):
        """Run when the next button is clicked."""
        self._page_num += 1
        await self.roles_select.page(page=self._page_num)
        await interaction.response.send_message(view=self)

CMD_CREATE_ROLE_LIST = "create-role-list"
"""Name of create role list slash command."""

CMD_EDIT_ROLE_LIST_ROLES = "edit-roles"
"""Name of edit role list roles slash command."""

class RoleManagementCog(commands.Cog):
    """Cog for managing role lists and role assignments."""
    
    def __init__(self, bot: discord.Client):
        self.bot = bot
        self._role_list_svc = RoleListService()
        self.target_guild_id = bot.target_guild_id
        self._target_guild = None
        self._ready_event = asyncio.Event()

    async def get_target_guild(self) -> discord.Guild:
        """Lazy loads the target guild."""
        if self._target_guild is None:
            self._target_guild = await self.bot.fetch_guild(self.target_guild_id)
        return self._target_guild

    @discord.app_commands.command(
        name=CMD_CREATE_ROLE_LIST,
        description="Create a new role list"
    )
    async def create_role_list(self, interaction: discord.Interaction):
        """Create role list slash command handler."""
        await interaction.response.send_modal(NewRoleListModal(
            role_list_svc=self._role_list_svc,
        ))

    @discord.app_commands.command(
        name=CMD_EDIT_ROLE_LIST_ROLES,
        description="Edit roles in a role list"
    )
    async def edit_roles(self, interaction: discord.Interaction):
        """Edit roles slash command handler."""
        async def on_role_list_select(select_interaction: discord.Interaction, role_list: RoleList):
            view = EditRoleListRoleView(
                role_list_svc=self._role_list_svc,
                role_list=role_list,
            )
            await view.prepare()
            await select_interaction.response.send_message(
                content=f"Edit '{role_list.name}' role list roles",
                view=view,
            )
        
        role_lists = self._role_list_svc.list_all()
        if len(role_lists) > 0:
            await interaction.response.send_message(
                "Select role list to edit",
                view=RoleListSelectView(
                    on_select=on_role_list_select,
                    role_lists=role_lists,
                ),
            )
        else:
            await interaction.response.send_message(f"No role lists, use `/{CMD_CREATE_ROLE_LIST}` to create one")

    class SyncRolesResult(TypedDict):
        """Result of syncing roles between Discord and database."""
        discord_role_ids: Set[int]
        """All Discord role IDs in the guild."""
        added_discord_role_ids: Set[int]
        """Discord role IDs that were added to the database."""
        rm_discord_role_ids: Set[int]
        """Discord role IDs that were removed from the database."""
        renamed_discord_role_ids: Set[int]
        """Discord role IDs that had their names updated."""

    async def sync_roles(self) -> SyncRolesResult:
        """Ensure only roles which exist in the target guild exist in the database."""
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


                if db_discord_role.name != discord_role.name:
                    db_discord_role.name = discord_role.name
                    renamed_discord_role_ids.add(discord_role_id)
                
                db_discord_role.last_synced = datetime.now()


            sess.commit()

            return {
                'discord_role_ids': discord_roles_by_ids.keys(),
                'added_discord_role_ids': missing_db_discord_role_ids,
                'rm_discord_role_ids': to_rm_discord_role_ids,
                'renamed_discord_role_ids': renamed_discord_role_ids,
            }

# Modify AppClient to use the cog
class AppClient(discord.Client):
    def __init__(self, *args, target_guild_id: int, **kwargs):
        intents = discord.Intents.default()
        super().__init__(*args, intents=intents, **kwargs)
        self.target_guild_id = target_guild_id
        self._target_guild_id_obj = discord.Object(id=self.target_guild_id)
        self.tree = discord.app_commands.CommandTree(self)

    async def setup_hook(self):
        """Setup the cog and sync commands."""
        await self.add_cog(RoleManagementCog(self))
        await self.tree.sync(guild=self._target_guild_id_obj)
        logger.info("Synced commands to guild %s", self.target_guild_id)

async def main():
    parser = argparse.ArgumentParser(description="Role Bot")
    subparsers = parser.add_subparsers(dest="command", required=False)

    bot_parser = subparsers.add_parser("bot", help="Run the bot")
    migrate_parser = subparsers.add_parser("migrate", help="Run migrations")
    sync_roles_parser = subparsers.add_parser("sync-roles", help="Sync Discord roles")

    args = parser.parse_args()

    if args.command is None or args.command == "bot":
        # Bot
        client = AppClient(
            target_guild_id=cfg.guild_id,
        )

        logger.info("Starting bot")

        await client.start(cfg.discord_token.get_secret_value())

        logger.info("Bot shut down")
    elif args.command == "migrate":
        # Migrate
        logger.info("Running migrations")

        Base.metadata.create_all(engine)

        logger.info("Migrations successful")
    elif args.command == "sync-roles":
        # Sync roles
        logger.info("Syncing roles")

        client = AppClient(
            target_guild_id=cfg.guild_id,
        )
        await client.login(cfg.discord_token.get_secret_value())
        logger.info("Logged in to Discord")

        res = await client.sync_roles()
        logger.info("Synced roles in guild %s (Added %d, Removed %d, Renamed %d)", cfg.guild_id, len(res['added_discord_role_ids']), len(res['rm_discord_role_ids']), len(res['renamed_discord_role_ids']))


if __name__ == '__main__':
    logger.info("Main")
    asyncio.run(main())
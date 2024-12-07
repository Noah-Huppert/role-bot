#!/usr/bin/env python3
import asyncio
import sys
from typing import Generic, Optional, Callable, Dict, Awaitable, List, Set, Tuple, TypeVar, TypedDict
import argparse
import logging
from datetime import datetime
import math

import discord
import sqlalchemy
import sqlalchemy.orm

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

            sess.query(RoleListRole).filter(
                RoleListRole.role_list_id == role_list.id,
                RoleListRole.discord_role_id.in_(to_rm_discord_role_ids),
            ).delete()

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
        
    def list_all_role_list_roles(self, role_list: RoleList) -> List[RoleListRole]:
        """List all roles in a role list.
        
        :param role_list: The role list to get roles from
        :return: List of role list roles
        """
        with db_session as sess:
            return sess.query(RoleListRole).where(RoleListRole.role_list_id == role_list.id).options(sqlalchemy.orm.joinedload(RoleListRole.role_list))
        
    def update_details(self, role_list: RoleList, name: str, description: str):
        """Update role list details.

        :param role_list: The role list to update
        :param name: The new name for the role list
        :param description: The new description for the role list
        """
        with db_session as sess:
            sess.add(role_list)
            role_list.name = name
            role_list.description = description
            sess.commit()
            
        
def make_role_list_details_summary_embed(role_list: RoleList) -> discord.Embed:
    """Construct an embed that summarizes the details of a role list.
    
    :param role_list: The role list to summarize
    :return: The embed
    """
    return discord.Embed(
        title="Created Role List",
        description=f"""
**Name:** {role_list.name}  
**Description:** {role_list.description}""",
        color=discord.Color.blue(),
    )

def make_role_list_roles_summary_embed(role_list: RoleList, roles: List[RoleListRole]) -> discord.Embed:
    """Construct an embed that summarizes the roles in a role list.
    
    :param role_list: The role list to summarize
    :param roles: The roles in the role list
    :return: The embed
    """
    return discord.Embed(
        title=role_list.name,
        description=f"📝 {role_list.description}\n\n🎭 **Available Roles**\n" + "\n".join([
            f"✨ {one_role.discord_role.name}" for one_role in roles
        ]),
        color=discord.Color.blue(),
    )
        

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

class PageFnResult(LoadPageFnResult[PageResultT]):
    """Result of :ref:`PaginatedSelect.page`.
    
    :ivar has_prev_page: If a previous page is available
    :ivar has_next_page: If a next page is available
    """
    page: int
    page_size: int
    hav_prev_page: bool
    has_next_page: bool

PaginatedSelectLoadPageFn = Callable[[PageFnResult], Awaitable[LoadPageFnResult[PageResultT]]]
"""Called when a specific page of options is requested.

:param page: The page number to load
:param page_size: The number of options to load
:return: The options for that page, must return more than 0 options
"""

PaginaedSelectOnNewPage = Callable[[int, int], Awaitable[None]]
"""Called when a new page is loaded."""

class PaginatedSelect(discord.ui.Select, Generic[PageResultT]):
    """Select menu with hook to paginate options."""

    _load_page: PaginatedSelectLoadPageFn[PageResultT]
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
    
class ViewRoleListView(discord.ui.View):
    _role_list_svc: RoleListService
    _role_list: RoleList

    def __init__(self, role_list_svc: RoleListService, role_list: RoleList):
        super().__init__()
        self._role_list_svc = role_list_svc
        self._role_list = role_list

    async def send_message(self, interaction: discord.Interaction):
        roles = self._role_list_svc.list_all_role_list_roles(role_list=self._role_list)
        
        await interaction.response.send_message(
            embed=make_role_list_roles_summary_embed(
                role_list=self._role_list,
                roles=roles,
            ),
            view=self,
        )

    @discord.ui.button(label="Edit Roles", style=discord.ButtonStyle.primary)
    async def on_edit_roles_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Handle edit roles button click by sending edit role list roles view."""
        view = EditRoleListRoleView(
            role_list_svc=self._role_list_svc,
            role_list=self._role_list,
        )
        await view.prepare()
        await view.send_message(interaction)

    @discord.ui.button(label="Edit Details", style=discord.ButtonStyle.primary)
    async def on_edit_details_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Handle edit details button click by sending edit role list details modal."""
        modal = EditRoleListDetailsModal(
            role_list_svc=self._role_list_svc,
            role_list=self._role_list,
        )
        await modal.prepare()
        await interaction.response.send_modal(modal)

class RoleListDetailsModal(
    discord.ui.Modal,
):
    """Modal to which creates a role list or updates a role list's details."""
    _role_list_svc: RoleListService
    _role_list: Optional[RoleList]

    def __init__(
        self,
        title: str,
        role_list_svc: RoleListService,
        role_list: Optional[RoleList] = None
    ):
        """Initialize.
        
        :param title: The title of the modal
        :param role_list_svc: Used to modify role list details
        :param role_list: If provided the modal's purpose will be to edit the details of this role, if not provided creates a new role list
        """
        super().__init__(title=title)

        self._role_list_svc = role_list_svc
        self._role_list = role_list

        self.name = discord.ui.TextInput(
            label="Name",
            placeholder="Games",
            default=self._role_list.name if self._role_list is not None else None,
        )
        self.add_item(self.name)

        self.description = discord.ui.TextInput(
            label="Description",
            placeholder="Select the games you play",
            style=discord.TextStyle.long,
            default=self._role_list.description if self._role_list is not None else None,
        )
        self.add_item(self.description)

    async def prepare(self):
        """Prepare the modal for use. Only required if editing an existing role list."""
        if self._role_list is not None:
            self.name.default = self._role_list.name
            self.description.default = self._role_list.description 
    
    async def on_submit(self, interaction: discord.Interaction):
        """Run when the modal is submitted. Upsert role list."""
        with db_session as sess:
            if self._role_list is None:
                # Create new role list
                self._role_list = self._role_list_svc.create(
                    guild_id=interaction.guild_id,
                    name=self.name.value,
                    description=self.description.value,
                )

                await interaction.response.send_message("Created new role list")
            else:
                # Update existing role list
                self._role_list_svc.update_details(
                    role_list=self._role_list,
                    name=self.name.value,
                    description=self.description.value,
                )

            sess.add(self._role_list)
            sess.commit()

class NewRoleListModal(RoleListDetailsModal):
    """Create a new Role List."""

    def __init__(self, role_list_svc: RoleListService):
        super().__init__(title="New Role List", role_list_svc=role_list_svc, role_list=None)

class EditRoleListDetailsModal(RoleListDetailsModal):
    """Edit Role List details"""

    def __init__(
        self,
        role_list_svc: RoleListService,
        role_list: Optional[RoleList] = None
    ):
        super().__init__(title="Edit Role List Details", role_list_svc=role_list_svc, role_list=role_list)


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
    _page_discord_roles_by_id: Dict[int, DiscordRole]
    _page_num: int

    _last_selection: List[str]
    """The previous selection of roles, used to diff changes.
    
    Only include options which are selected in this list (pre-filter by option.default before adding).
    """

    def __init__(
        self,
        role_list_svc: RoleListService,
        role_list: RoleList,
    ):
        """Initialize. Call :ref:`prepare` after initialization to load initial data."""
        super().__init__()

        self._role_list_svc = role_list_svc
        self._role_list = role_list

        self._page_discord_roles_by_id = {}

        self._page_num = 0

        # Setup role select
        self.roles_select = PaginatedSelect[DiscordRole](
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

    async def send_message(self, interaction: discord.Interaction):
        """Send message with view."""
        await interaction.response.send_message(
            view=self,
        )

    async def load_roles_page(self, page: int, page_size: int) -> LoadPageFnResult[DiscordRole]:
        """Load a page of roles."""
        with db_session as sess:
            sess.add(self._role_list)
            base_qs = sess.query(
                DiscordRole,
                RoleListRole,
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

            total = base_qs.count()

            return {
                'options': options,
                'results': page_res,
                'total': total,
                'page_total': len(options),
            }
    
    async def on_new_roles_page(self, page_res: PageFnResult):
        """When a new page is loaded."""
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

        # Track last selection so we can diff changes
        self._last_selection = [ str(opt.value) for opt in page_res['options'] if opt.default ]

    async def on_roles_select(self, interaction: discord.Interaction):
        """Run when a change to role selections are made."""
        # Determine which roles were selected or deselected
        initially_selected_discord_role_ids = {
            int(option)
            for option in self._last_selection
        }
        selected_discord_role_ids = {
            int(id)
            for id in self.roles_select.values
        }
        
        add_discord_ids = selected_discord_role_ids.difference(initially_selected_discord_role_ids)
        rm_discord_ids = initially_selected_discord_role_ids.difference(selected_discord_role_ids)

        # Record this selection so we can diff next time
        self._last_selection = self.roles_select.values

        # Modify role list roles
        added_discord_role_ids = self._role_list_svc.add_discord_roles(
            role_list=self._role_list,
            add_discord_role_ids=add_discord_ids,
        )

        rmed_discord_role_ids = self._role_list_svc.rm_discord_roles(
            role_list=self._role_list,
            remove_discord_role_ids=rm_discord_ids,
        )

        # Send message about changes
        add_role_names_by_id = {
            discord_role_id: f"- {self._page_discord_roles_by_id[discord_role_id].name}"
            for discord_role_id in added_discord_role_ids
        }

        rm_role_names_by_ids = {
            discord_role_id: f"- {self._page_discord_roles_by_id[discord_role_id].name}"
            for discord_role_id in rmed_discord_role_ids
        }
        
        msg_parts = []
        if len(add_role_names_by_id) > 0:
            msg_parts.append(f"Added roles on page {self._page_num + 1}:\n{'\n'.join(add_role_names_by_id.values())}")
        if len(rm_role_names_by_ids) > 0:
            msg_parts.append(f"Removed roles on page {self._page_num + 1}:\n{'\n'.join(rm_role_names_by_ids.values())}")

        if len(msg_parts) == 0:
            msg_parts.append(f"No changes made to page {self._page_num + 1}")
        
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

CMD_VIEW_ROLE_LIST = "role-list"
"""Overview and edit buttons."""

CMD_CREATE_ROLE_LIST = "create-role-list"
"""Name of create role list slash command."""

CMD_EDIT_ROLE_LIST_ROLES = "edit-roles"
"""Name of edit role list roles slash command."""

CMD_EDIT_ROLE_LIST_DETAILS = "edit-details"
"""Name of edit role list details slash command."""

class AppClient(discord.Client):
    """Bot.
    
    If not using :meth:`run` to serve bot interactions then you must call :meth:`wait_until_ready` before any methods.
    """
    _role_list_svc: RoleListService

    _target_guild: discord.Guild
    target_guild_id: int
    _target_guild_id_obj: discord.Object

    _ready_event: asyncio.Event

    _do_sync_cmds: bool

    def __init__(self, *args, target_guild_id: int, do_sync_cmds: Optional[bool] = None, **kwargs):
        """Initialize.
        
        :param target_guild_id: ID of the Discord guild for which this bot will serve
        """
        intents = discord.Intents.default()
        #intents.message_content = True

        super().__init__(*args, intents=intents, **kwargs)

        self._role_list_svc = RoleListService()

        self._target_guild = None
        self.target_guild_id = target_guild_id
        self._target_guild_id_obj = discord.Object(id=self.target_guild_id)

        self._do_sync_cmds = do_sync_cmds if do_sync_cmds is not None else False

        self.tree = discord.app_commands.CommandTree(self)
        self.tree.command(
            name=CMD_VIEW_ROLE_LIST,
            description="View and edit a role list",
            guilds=[self._target_guild_id_obj],
        )(self.interaction_view_role_list)
        self.tree.command(
            name=CMD_CREATE_ROLE_LIST,
            description="Create a new role list",
            guilds=[self._target_guild_id_obj],
        )(self.interaction_create_role_list)
        self.tree.command(
            name=CMD_EDIT_ROLE_LIST_ROLES,
            description="Edit roles in a role list",
            guilds=[self._target_guild_id_obj],
        )(self.interaction_edit_roles)
        self.tree.command(
            name=CMD_EDIT_ROLE_LIST_DETAILS,
            description="Edit role list details",
        )(self.interaction_edit_role_list_details)

        self._ready_event = asyncio.Event()

    async def get_target_guild(self) -> discord.Guild:
        """Lazy loads the target guild.
        
        Because it cannot be retrieved until the the client is ready.
        """
        if self._target_guild is None:
            self._target_guild = await self.fetch_guild(self.target_guild_id)
        
        return self._target_guild

    async def on_ready(self):
        """Run when the bot is done setting up."""
        logger.info("Logged in as %s", self.user)

        self.target_guild = await self.fetch_guild(self.target_guild_id)

        self._ready_event.set()

    async def wait_until_ready(self):
        """Wait until the bot is ready."""
        return await self._ready_event.wait()

    async def setup_hook(self):
        """Run when bot is starting up, ensures commands are registered properly in the target guild."""
        if self._do_sync_cmds:
            # Clean all commands (rm all our app's commands in this guild)
            #await self.tree.sync(guild=self._target_guild_id_obj)
            #self.tree.clear_commands(guild=self._target_guild_id_obj) 

            logger.info("Syncing commands to guild %s", self.target_guild_id)

            # Add commands
            await self.tree.sync(guild=self._target_guild_id_obj)

            logger.info("Synced commands to guild %s", self.target_guild_id)
        else:
            logger.info("Not syncing commands! If they changed your app won't work")

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

    async def interaction_view_role_list(self, interaction: discord.Interaction):
        """View and edit role list."""
        async def on_role_list_select(select_interaction: discord.Interaction, role_list: RoleList):
            """When role is selected show overview and edit ui."""
            await ViewRoleListView(
                role_list_svc=self._role_list_svc,
                role_list=role_list,
            ).send_message(select_interaction)

        await self._send_select_role_list_view(on_role_list_select)

    async def interaction_create_role_list(self, interaction: discord.Interaction):
        """Create role list slash command handler."""
        await interaction.response.send_modal(NewRoleListModal(
            role_list_svc=self._role_list_svc,
        ))

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
        
        await self._send_select_role_list_view(on_role_list_select)

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
        
        await self._send_select_role_list_view(on_role_list_select)


async def main():
    parser = argparse.ArgumentParser(description="Role Bot")
    subparsers = parser.add_subparsers(dest="command", required=False)

    bot_parser = subparsers.add_parser("bot", help="Run the bot")
    migrate_parser = subparsers.add_parser("migrate", help="Run migrations")
    sync_roles_parser = subparsers.add_parser("sync-roles", help="Sync Discord roles")
    sync_commands_parser = subparsers.add_parser( 'sync-commands', help="Do not sync command definitions wiht Discord guilds. This saves time but if you change the definitions and don't sync then commands might not behave as they should.")

    # Add bot as default command if not specified in argv, so that subparser is run
    sys_argv = sys.argv[1:]
    if len(sys_argv) == 0:
        logger.info("No command specified, defaulting to 'bot'")
        sys_argv.append("bot")

    args = parser.parse_args(sys_argv)

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
    elif args.command == "sync-commands":
        # Sync commands
        logger.info("Syncing commands")

        client = AppClient(
            target_guild_id=cfg.guild_id,
            do_sync_cmds=True,
        )
        await client.login(cfg.discord_token.get_secret_value())
        logger.info("Logged in to Discord")

        await client.wait_until_ready()
        
        # Properly close the connection
        await client.close()
        logger.info("Done syncing commands, you can exit now")
        


if __name__ == '__main__':
    logger.info("Main")
    asyncio.run(main())
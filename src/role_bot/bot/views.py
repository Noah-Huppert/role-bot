 
import math
from typing import Awaitable, Callable, Dict, List
import discord

from role_bot.bot.components import LoadPageFnResult, PageFnResult, PaginatedSelect
from role_bot.bot.modals import EditRoleListDetailsModal
from role_bot.bot.services import RoleListService
from role_bot.models import DiscordRole, RoleList, RoleListRole
from role_bot.db import engine, db_session


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



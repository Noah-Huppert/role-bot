from typing import Optional

import discord
from role_bot.bot.services import RoleListService
from role_bot.models import RoleList
from role_bot.db import engine, db_session


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
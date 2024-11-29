#!/usr/bin/env python3
from typing import Optional, Callable, Dict, Awaitable, List, Set, Tuple
import argparse
import logging

import discord
import sqlalchemy.schema

from role_bot.config import cfg
from role_bot.db import engine, db_session
from role_bot.models import RoleList, RoleListRole, Base

logger = logging.getLogger(__name__)

class RoleListService:
    """Business logic for role lists."""

    def create(
        self,
        name: str,
        description: str,
    ) -> RoleList:
        """Create a role list."""
        with db_session as sess:
            role_list = RoleList(
                name=name,
                description=description,
            )
            sess.add(role_list)

            sess.commit()

            return role_list
        
    def list_all(self) -> List[RoleList]:
        """Get all role lists."""
        with db_session as sess:
            return list(sess.query(RoleList).all())
        
    def edit_discord_roles(
        self,
        role_list: RoleList,
        add_discord_role_ids: Set[int],
        remove_discord_role_ids: Set[int],
    ):
        """Add and remove roles to role list.
        
        :return: Tuple of (added discord role IDs, removed discord role IDs)
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

            # Remove roles
            to_rm_discord_role_ids = in_role_list_discord_role_ids.intersection(remove_discord_role_ids)

            role_list_roles_by_discord_role_id = {
                role_list_role.discord_role_id: role_list_role
                for role_list_role in role_list.roles
            }
            
            for discord_role_id in to_rm_discord_role_ids:
                role_list.roles.remove(role_list_roles_by_discord_role_id[discord_role_id])

            sess.commit()

            return (to_add_discord_role_ids, to_rm_discord_role_ids,)

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
        role_list = await self._role_list_svc.create(
            name=self.name.value,
            description=self.description.value,
        )

        embed = discord.Embed(
            title="Created Role List",
            description=f"""
**Name:** {role_list.name}  
**Description:** {role_list.description}""",
            color=discord.Color.blue(),
        )
        await interaction.response.send_message(embed=embed)

class RoleListSelectView(discord.ui.View):
    """Present menu to select a role list."""

    _on_select_callback: Callable[[id], Awaitable[None]]

    def __init__(
        self,
        on_select: Callable[[id], Awaitable[None]],
        role_lists: List[RoleList],
    ):
        """Initialize.
        
        :param on_select: Called when a role list is selected, argument is role list ID
        :raises ValueError: If role_lists is empty
        """
        super().__init__()
        self._on_select_callback = on_select

        if len(role_lists) == 0:
            raise ValueError("Cannot provide empty list of role lists")
        
        self.select = discord.ui.Select(
            placeholder="Select role list",
            options=[
                discord.SelectOption(
                    label=role_list.name,
                    value=int(role_list.id),
                )
                for role_list in role_lists
            ],
            min_values=1,
            max_values=1,
        )
        self.select.callback = self.on_select
        self.add_item(self.select)

    async def on_select(self, interaction: discord.Interaction):
        """Run when a role list is selected."""
        await self._on_select_callback(int(self.select.values[0]))

class EditRoleListRoleView(discord.ui.View):
    """Add or remove RoleListRoles from a RoleList."""
    _role_list_svc: RoleListService
    _role_list: RoleList

    @classmethod
    async def create(
        cls,
        role_list_svc: RoleListService,
        role_list: RoleList,
        target_guild: discord.Guild,
    ) -> "EditRoleListRoleView":
        """Load data required to create the view."""
        roles_by_id = {
            str(discord_role.id): discord_role
            for discord_role in target_guild.roles
        }
        guild_role_ids = set(map(lambda discord_role: discord_role.id, roles_by_id.values()))

        with db_session as sess:
            sess.add(role_list)

            added_role_ids = set(map(lambda role_list_role: role_list_role.role_id, role_list.roles))
            unadded_role_ids = guild_role_ids.difference(added_role_ids)

            return cls(
                role_list_svc=role_list_svc,
                role_list=role_list,
                roles_to_add=[
                    roles_by_id[discord_role_id]
                    for discord_role_id in unadded_role_ids
                ],
                roles_to_remove=[
                    roles_by_id[discord_role_id]
                    for discord_role_id in added_role_ids
                ],
            )

    def __init__(
        self,
        role_list_svc: RoleListService,
        role_list: RoleList,
        roles_to_add: List[discord.Role],
        roles_to_remove: List[discord.Role],
    ):
        super().__init__()

        self._role_list_svc = role_list_svc
        self._role_list = role_list

        self.add_roles_select = discord.ui.Select(
            placeholder="Add roles",
            options=[
                discord.SelectOption(
                    label=discord_role.name,
                    value=str(discord_role.id),
                )
                for discord_role in roles_to_add
            ],
            min_values=0,
            max_values=min(len(roles_to_add), 25),
        )
        self.add_item(self.add_roles_select)

        self.remove_roles_select = discord.ui.Select(
            placeholder="Remove roles",
            options=[
                discord.SelectOption(
                    label=discord_role.name,
                    value=str(discord_role.id),
                )
                for discord_role in roles_to_remove
            ],
            min_values=0,
            max_values=min(len(roles_to_remove), 25),
        )
        self.add_item(self.remove_roles_select)

    @discord.ui.button(label="Edit Role List")
    async def on_edit_role_list(self, interaction: discord.Interaction):
        to_add, to_rm = self._role_list_svc.edit_discord_roles(
            role_list=self._role_list,
            add_discord_role_ids={
                int(id)
                for id in self.add_roles_select.values
            },
            remove_discord_role_ids={
                int(id)
                for id in self.remove_roles_select.values
            },
        )

        interaction.response.send_message(
            f"Added {len(to_add)} role(s) and removed {len(to_rm)} role(s)",
        )

class AppClient(discord.Client):
    _role_list_svc: RoleListService

    _target_guild: discord.Guild
    target_guild_id: int
    _target_guild_id_obj: discord.Object

    def __init__(self, *args, target_guild_id: int, **kwargs):
        intents = discord.Intents.default()
        #intents.message_content = True

        super().__init__(*args, intents=intents, **kwargs)

        self._role_list_svc = RoleListService()

        self._target_guild = None
        self.target_guild_id = target_guild_id
        self._target_guild_id_obj = discord.Object(id=self.target_guild_id)

        self.tree = discord.app_commands.CommandTree(self)
        self.tree.command(
            name='create-role-list',
            guilds=[self._target_guild_id_obj],
        )(self.interaction_create_role_list)
        self.tree.command(
            name='edit-roles',
            guilds=[self._target_guild_id_obj],
        )(self.interaction_edit_roles)

    async def get_target_guild(self) -> discord.Guild:
        if self._target_guild is None:
            self._target_guild = await self.fetch_guild(self.target_guild_id)
        
        return self._target_guild

    async def on_ready(self):
        logger.info("Logged in as %s", self.user)

        self.target_guild = await self.fetch_guild(self.target_guild_id)

    async def setup_hook(self):
        await self.tree.sync(guild=self._target_guild_id_obj)
        logger.info("Synced commands to guild %s", self.target_guild_id)

    async def interaction_create_role_list(self, interaction: discord.Interaction):
        await interaction.response.send_modal(NewRoleListModal(
            role_list_svc=self._role_list_svc,
        ))

    async def interaction_edit_roles(self, interaction: discord.Interaction):
        async def on_select(role_list: RoleList):
            await interaction.response.edit_message(
                content="Edit role list roles",
                view=EditRoleListRoleView.create(
                    role_list_svc=self._role_list_svc,
                    role_list=role_list,
                    target_guild=await self.get_target_guild(),
                ),
            )
        
        await interaction.response.send_message(
            "Select role list to edit",
            view=RoleListSelectView(
                on_select=on_select,
                role_lists=self._role_list_svc.list_all(),
            ),
        )


def main():
    parser = argparse.ArgumentParser(description="Role Bot")
    subparsers = parser.add_subparsers(dest="command", required=False)

    bot_parser = subparsers.add_parser("bot", help="Run the bot")
    migrate_parser = subparsers.add_parser("migrate", help="Run migrations")

    args = parser.parse_args()

    if args.command is None or args.command == "bot":
        client = AppClient(
            target_guild_id=cfg.guild_id,
        )

        logger.info("Starting bot")

        client.run(cfg.discord_token.get_secret_value())

        logger.info("Bot shut down")
    else:
        logger.info("Running migrations")

        Base.metadata.create_all(engine)

        logger.info("Migrations successful")


if __name__ == '__main__':
    main()
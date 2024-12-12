from typing import List, Set, Tuple, TypedDict

import sqlalchemy
from role_bot.db import engine, db_session
from role_bot.models import DiscordRole, RoleList, RoleListRole

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
        
    class DiscordRoleWithRoleListRole(TypedDict):
        """A Discord role with its role list role."""
        discord_role: DiscordRole
        """The Discord role."""

        role_list_role: RoleListRole
        """The role list role join table row."""

    class GuildDiscordRolesPage(TypedDict):
        data: List['RoleListService.DiscordRoleWithRoleListRole']
        total_count: int
        
    def list_paged_guild_discord_roles(self, guild_id: int, page: int, page_size=DEFAULT_PAGE_SIZE) -> GuildDiscordRolesPage:

        """List roles in a guild with role list join table info. Paginated."""
        with db_session as sess:
            all_qs = sess.query(
                    DiscordRole,
                    RoleListRole,
                ).outerjoin(
                    RoleListRole,
                    DiscordRole.discord_role_id == RoleListRole.discord_role_id,
                ).where(
                    DiscordRole.guild_id == guild_id, # to be safe
                ).order_by(DiscordRole.name);
            
            total_count = all_qs.count()
            
            return {
                'data': [
                    {
                        'discord_role': row[0],
                        'role_list_role': row[1],
                    }
                    for row in all_qs.limit(page_size).offset(page * page_size).all()
                ],
                'total_count': total_count,
            }
        
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
            return list(sess.query(RoleListRole).where(RoleListRole.role_list_id == role_list.id).options(sqlalchemy.orm.joinedload(RoleListRole.role_list)).all())
        
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
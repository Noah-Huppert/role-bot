

from typing import List, Optional
import discord

from role_bot.models import RoleList, RoleListRole
from role_bot.bot.constants import CMD_EDIT_ROLE_LIST_ROLES


def make_role_list_details_summary_embed(role_list: RoleList, title: str,description_prefix: Optional[str] = None) -> discord.Embed:
    """Construct an embed that summarizes the details of a role list.
    
    :param role_list: The role list to summarize
    :return: The embed
    """
    return discord.Embed(
        title=title,
        description=f"""{description_prefix or ''}
**{role_list.name}**  
{role_list.description}""",
        color=discord.Color.blue(),
    )

def make_role_list_roles_summary_embed(role_list: RoleList, roles: List[RoleListRole]) -> discord.Embed:
    """Construct an embed that summarizes the roles in a role list.
    
    :param role_list: The role list to summarize
    :param roles: The roles in the role list
    :return: The embed
    """
    roles_list_lines = [f"- {one_role.discord_role.name}" for one_role in roles]
    if len(roles_list_lines) == 0:
        roles_list_lines = ["_No roles_", f"Click 'Edit Roles' or use `/{CMD_EDIT_ROLE_LIST_ROLES}` to add roles"]
    return discord.Embed(
        title=role_list.name,
        description=f"📝 {role_list.description}\n\n🎭 **Available Roles**\n" + "\n".join(roles_list_lines),
        color=discord.Color.blue(),
    )
from sqlalchemy.orm import Mapped, mapped_column, DeclarativeBase, relationship
from sqlalchemy import ForeignKey, BigInteger, TIMESTAMP, UniqueConstraint

from datetime import datetime

class Base(DeclarativeBase):
    """Base class for all models."""
    pass

class RoleList(Base):
    """Collection of roles users can select.
    
    :ivar id: Primary key
    :ivar guild_id: ID of Discord server
    :ivar name: User friendly name of role list
    :ivar description: Overview of theme or purpose
    :ivar roles: Lazy loaded list of roles in list
    """
    __tablename__ = 'role_list'
    
    id: Mapped[int] = mapped_column(primary_key=True)
    guild_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    name: Mapped[str] = mapped_column(nullable=False)
    description: Mapped[str] = mapped_column(nullable=False)
    
    roles: Mapped[list['RoleListRole']] = relationship('RoleListRole', back_populates='role_list')

class DiscordRole(Base):
    """Synced state of Discord roles in a server.
    
    These are synced periodically. The :attr:`discord_role_id` is the actual ID of the role in Discord, and can be used to join. The :attr:`id` field is an internal primary key. Be careful to select with :attr:`guild_id` to avoid data leakage.

    Constraints
    ===========
    * Unique on :attr:`guild_id` and :attr:`discord_role_id`

    :ivar id: Primary key, not ID of role in Discord
    :ivar name: Name of role in Discord
    :ivar guild_id: ID of Discord server
    :ivar discord_role_id: ID of role in Discord
    :ivar last_synced: Last time this role was synced into this system
    """
    __tablename__ = 'discord_role'

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(nullable=False)
    guild_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    discord_role_id: Mapped[int] = mapped_column(BigInteger, nullable=False, unique=True)
    last_synced: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False)

    role_list_roles: Mapped[list['RoleListRole']] = relationship('RoleListRole', back_populates='discord_role')

    __table_args__ = (UniqueConstraint('guild_id', 'discord_role_id'),)

class RoleListRole(Base):
    """Association of a Discord role to a role list.
    
    :ivar id: Primary key
    :ivar role_list_id: ID of role list the role will belong to
    :ivar discord_role_id: ID of role in Discord (See :attr:`DiscordRole.discord_role_id`)
    :ivar role_list: Lazy loaded role list the role belongs to
    :ivar discord_role: Lazy loaded Discord role
    """
    __tablename__ = 'role_list_role'
    
    id: Mapped[int] = mapped_column(primary_key=True)
    role_list_id: Mapped[int] = mapped_column(ForeignKey('role_list.id'), nullable=False)
    discord_role_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey('discord_role.discord_role_id'),
        nullable=False,
    )
    
    role_list: Mapped['RoleList'] = relationship('RoleList', back_populates='roles')
    discord_role: Mapped['DiscordRole'] = relationship('DiscordRole', back_populates='role_list_roles')
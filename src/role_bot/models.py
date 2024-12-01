from sqlalchemy.orm import Mapped, mapped_column, DeclarativeBase, relationship
from sqlalchemy import ForeignKey, BigInteger

class Base(DeclarativeBase):
    pass

class RoleList(Base):
    __tablename__ = 'role_list'
    
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(nullable=False)
    description: Mapped[str] = mapped_column(nullable=False)
    
    roles: Mapped[list['RoleListRole']] = relationship('RoleListRole', back_populates='role_list')

class RoleListRole(Base):
    __tablename__ = 'role_list_role'
    
    id: Mapped[int] = mapped_column(primary_key=True)
    role_list_id: Mapped[int] = mapped_column(ForeignKey('role_list.id'), nullable=False)
    discord_role_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    
    role_list: Mapped['RoleList'] = relationship('RoleList', back_populates='roles')
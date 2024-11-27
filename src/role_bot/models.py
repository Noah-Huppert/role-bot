from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship, DeclarativeBase
from sqlalchemy.orm import registry

class RoleList(DeclarativeBase):
    __tablename__ = 'role_list'
    
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=False)
    
    roles = relationship('RoleListRole', back_populates='role_list')

class RoleListRole(DeclarativeBase):
    __tablename__ = 'role_list_role'
    
    id = Column(Integer, primary_key=True)
    role_list_id = Column(Integer, ForeignKey('role_list.id'), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    
    role_list = relationship('RoleList', back_populates='roles')
    mapper_registry = registry()

    mapper_registry.map_imperatively(RoleList, RoleList.__table__)
    mapper_registry.map_imperatively(RoleListRole, RoleListRole.__table__)
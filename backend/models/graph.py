from uuid import uuid4

from sqlalchemy import (
    Boolean,
    Column,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
)
from sqlalchemy.orm import relationship

from backend.database import Base


class Site(Base):
    __tablename__ = "sites"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    name = Column(String, nullable=False)
    role = Column(String, default="spoke")  # hub | spoke
    wan_type = Column(String, default="mpls_aviat")  # mpls_aviat | sdwan
    observable_boundary = Column(String, nullable=True)
    canvas_x = Column(Float, default=0.0)
    canvas_y = Column(Float, default=0.0)
    canvas_w = Column(Float, default=400.0)
    canvas_h = Column(Float, default=300.0)

    nodes = relationship(
        "NetworkNode", back_populates="site", cascade="all, delete-orphan"
    )


class NetworkNode(Base):
    __tablename__ = "nodes"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    site_id = Column(String, ForeignKey("sites.id"), nullable=True)
    label = Column(String, nullable=False)
    # core_internal | core_external | aviat_ctr | sdwan_cpe | access_switch
    node_type = Column(String, nullable=False)
    vendor = Column(String, default="Cisco")
    management_ip = Column(String, nullable=True)
    role = Column(String, nullable=True)
    zone = Column(String, nullable=True)
    observable = Column(Boolean, default=True)
    wan_facing = Column(Boolean, default=False)
    signal_dbm = Column(Float, nullable=True)
    port_count = Column(Integer, nullable=True)
    meta = Column(JSON, default=dict)
    position_x = Column(Float, default=0.0)
    position_y = Column(Float, default=0.0)

    site = relationship("Site", back_populates="nodes")

    source_edges = relationship(
        "NetworkEdge",
        foreign_keys="[NetworkEdge.source_id]",
        back_populates="source_node",
        cascade="all, delete-orphan",
    )
    target_edges = relationship(
        "NetworkEdge",
        foreign_keys="[NetworkEdge.target_id]",
        back_populates="target_node",
        cascade="all, delete-orphan",
    )


class NetworkEdge(Base):
    __tablename__ = "edges"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    source_id = Column(String, ForeignKey("nodes.id"), nullable=False)
    target_id = Column(String, ForeignKey("nodes.id"), nullable=False)
    edge_type = Column(String, default="fiber")  # fiber | mpls | sdwan
    vrf = Column(String, nullable=True)
    capacity_mbps = Column(Float, nullable=True)
    meta = Column(JSON, default=dict)

    source_node = relationship(
        "NetworkNode",
        foreign_keys=[source_id],
        back_populates="source_edges",
    )
    target_node = relationship(
        "NetworkNode",
        foreign_keys=[target_id],
        back_populates="target_edges",
    )

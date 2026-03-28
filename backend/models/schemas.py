from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Site schemas
# ---------------------------------------------------------------------------


class SiteSchema(BaseModel):
    id: str = Field(default="")
    name: str
    role: str = "spoke"
    wan_type: str = "mpls_aviat"
    observable_boundary: Optional[str] = None
    canvas_x: float = 0.0
    canvas_y: float = 0.0
    canvas_w: float = 400.0
    canvas_h: float = 300.0

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# NetworkNode schemas
# ---------------------------------------------------------------------------


class NetworkNodeSchema(BaseModel):
    id: str = Field(default="")
    site_id: Optional[str] = None
    label: str
    node_type: str
    vendor: str = "Cisco"
    management_ip: Optional[str] = None
    role: Optional[str] = None
    zone: Optional[str] = None
    observable: bool = True
    wan_facing: bool = False
    signal_dbm: Optional[float] = None
    port_count: Optional[int] = None
    meta: Dict[str, Any] = Field(default_factory=dict)
    position_x: float = 0.0
    position_y: float = 0.0

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# NetworkEdge schemas
# ---------------------------------------------------------------------------


class NetworkEdgeSchema(BaseModel):
    id: str = Field(default="")
    source_id: str
    target_id: str
    edge_type: str = "fiber"
    vrf: Optional[str] = None
    capacity_mbps: Optional[float] = None
    meta: Dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Topology graph (compound)
# ---------------------------------------------------------------------------


class TopologyGraphSchema(BaseModel):
    sites: List[SiteSchema] = Field(default_factory=list)
    nodes: List[NetworkNodeSchema] = Field(default_factory=list)
    edges: List[NetworkEdgeSchema] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Alert schemas
# ---------------------------------------------------------------------------


class AlertSchema(BaseModel):
    id: str = Field(default="")
    analysis_id: str = Field(default="")
    severity: str
    node: Optional[str] = None
    site: Optional[str] = None
    description: str
    impact: Optional[str] = None
    metric: Optional[str] = None
    threshold: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# LogEntry schemas
# ---------------------------------------------------------------------------


class LogEntrySchema(BaseModel):
    id: str = Field(default="")
    analysis_id: str = Field(default="")
    agent: str
    level: str = "info"
    message: str
    tool_call: Optional[Any] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Analysis schemas
# ---------------------------------------------------------------------------


class AnalysisSchema(BaseModel):
    id: str
    created_at: datetime
    status: str
    summary: Optional[str] = None
    alert_count: int = 0
    raw_result: Optional[Any] = None
    alerts: List[AlertSchema] = Field(default_factory=list)
    log_entries: List[LogEntrySchema] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Chat schemas
# ---------------------------------------------------------------------------


class ChatMessageSchema(BaseModel):
    role: str  # user | assistant
    content: str


class ChatRequestSchema(BaseModel):
    message: str
    session_id: Optional[str] = None  # If provided, continues an existing session


class ChatResponseSchema(BaseModel):
    role: str = "assistant"
    content: str
    session_id: str  # Always returned — use this for follow-up messages


# ---------------------------------------------------------------------------
# Analysis run response
# ---------------------------------------------------------------------------


class RunAnalysisResponseSchema(BaseModel):
    analysis_id: str
    status: str

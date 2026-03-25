"""
Tests for Pydantic schemas — pure Python, no external services needed.
"""

import pytest
from datetime import datetime

from backend.models.schemas import (
    SiteSchema,
    NetworkNodeSchema,
    NetworkEdgeSchema,
    TopologyGraphSchema,
    AlertSchema,
    LogEntrySchema,
    AnalysisSchema,
    ChatRequestSchema,
    ChatResponseSchema,
    RunAnalysisResponseSchema,
)


class TestSiteSchema:
    def test_valid_site(self):
        s = SiteSchema(name="HQ", role="hub", wan_type="mpls_aviat")
        assert s.name == "HQ"
        assert s.role == "hub"

    def test_site_defaults(self):
        s = SiteSchema(name="SPOKE-A")
        assert s.role == "spoke"
        assert s.wan_type == "mpls_aviat"
        assert s.observable_boundary is None

    def test_site_id_defaults_to_empty_string(self):
        s = SiteSchema(name="X")
        assert s.id == ""

    def test_site_with_explicit_id(self):
        s = SiteSchema(id="hq-1", name="HQ")
        assert s.id == "hq-1"

    def test_site_observable_boundary(self):
        s = SiteSchema(name="HQ", observable_boundary="wan_gateway")
        assert s.observable_boundary == "wan_gateway"


class TestNetworkNodeSchema:
    def test_valid_node(self):
        n = NetworkNodeSchema(
            id="n1",
            site_id="s1",
            label="SW-HQ-INT-01",
            node_type="core_internal",
        )
        assert n.label == "SW-HQ-INT-01"
        assert n.vendor == "Cisco"  # default

    def test_node_observable_default_true(self):
        n = NetworkNodeSchema(site_id="s1", label="X", node_type="core_internal")
        assert n.observable is True

    def test_node_wan_facing_default_false(self):
        n = NetworkNodeSchema(site_id="s1", label="X", node_type="core_internal")
        assert n.wan_facing is False

    def test_node_meta_default_empty_dict(self):
        n = NetworkNodeSchema(site_id="s1", label="X", node_type="core_internal")
        assert n.meta == {}

    def test_node_optional_fields_default_none(self):
        n = NetworkNodeSchema(site_id="s1", label="X", node_type="core_internal")
        assert n.management_ip is None
        assert n.role is None
        assert n.zone is None
        assert n.signal_dbm is None
        assert n.port_count is None

    def test_node_position_defaults(self):
        n = NetworkNodeSchema(site_id="s1", label="X", node_type="core_internal")
        assert n.position_x == 0.0
        assert n.position_y == 0.0


class TestNetworkEdgeSchema:
    def test_valid_edge(self):
        e = NetworkEdgeSchema(source_id="n1", target_id="n2", edge_type="fiber")
        assert e.source_id == "n1"
        assert e.target_id == "n2"

    def test_edge_type_default(self):
        e = NetworkEdgeSchema(source_id="n1", target_id="n2")
        assert e.edge_type == "fiber"

    def test_edge_optional_fields(self):
        e = NetworkEdgeSchema(source_id="n1", target_id="n2")
        assert e.vrf is None
        assert e.capacity_mbps is None

    def test_edge_with_capacity(self):
        e = NetworkEdgeSchema(source_id="n1", target_id="n2", capacity_mbps=100.0)
        assert e.capacity_mbps == 100.0


class TestTopologyGraphSchema:
    def test_empty_topology(self):
        tg = TopologyGraphSchema(sites=[], nodes=[], edges=[])
        assert tg.sites == []
        assert tg.nodes == []
        assert tg.edges == []

    def test_topology_default_empty_lists(self):
        tg = TopologyGraphSchema()
        assert tg.sites == []
        assert tg.nodes == []
        assert tg.edges == []

    def test_topology_with_site(self):
        site = SiteSchema(name="HQ")
        tg = TopologyGraphSchema(sites=[site])
        assert len(tg.sites) == 1
        assert tg.sites[0].name == "HQ"

    def test_topology_with_node(self):
        node = NetworkNodeSchema(site_id="s1", label="SW-01", node_type="core_internal")
        tg = TopologyGraphSchema(nodes=[node])
        assert len(tg.nodes) == 1


class TestAlertSchema:
    def test_valid_critical_alert(self):
        a = AlertSchema(
            severity="critical",
            description="Signal below threshold",
        )
        assert a.severity == "critical"

    def test_valid_warning_alert(self):
        a = AlertSchema(severity="warning", description="High utilization")
        assert a.severity == "warning"

    def test_valid_info_alert(self):
        a = AlertSchema(severity="info", description="No redundancy")
        assert a.severity == "info"

    def test_alert_optional_fields_default_none(self):
        a = AlertSchema(severity="info", description="test")
        assert a.node is None
        assert a.site is None
        assert a.impact is None
        assert a.metric is None
        assert a.threshold is None

    def test_alert_with_all_fields(self):
        a = AlertSchema(
            id="a1",
            analysis_id="x1",
            severity="critical",
            node="CTR-HQ-01",
            site="HQ",
            description="Signal critical",
            impact="WAN cut risk",
            metric="-80dBm",
            threshold="-70dBm",
        )
        assert a.node == "CTR-HQ-01"
        assert a.site == "HQ"
        assert a.threshold == "-70dBm"

    def test_alert_id_defaults_empty(self):
        a = AlertSchema(severity="info", description="test")
        assert a.id == ""


class TestLogEntrySchema:
    def test_valid_log_entry(self):
        le = LogEntrySchema(agent="analyst", message="Starting analysis")
        assert le.agent == "analyst"
        assert le.message == "Starting analysis"

    def test_log_entry_level_default(self):
        le = LogEntrySchema(agent="metrics", message="Collecting")
        assert le.level == "info"

    def test_log_entry_created_at_auto(self):
        le = LogEntrySchema(agent="topology", message="Built context")
        assert isinstance(le.created_at, datetime)

    def test_log_entry_tool_call_optional(self):
        le = LogEntrySchema(agent="config", message="Generated CLI")
        assert le.tool_call is None


class TestAnalysisSchema:
    def test_valid_analysis(self):
        a = AnalysisSchema(
            id="abc-123",
            created_at=datetime.utcnow(),
            status="done",
        )
        assert a.id == "abc-123"
        assert a.status == "done"

    def test_analysis_defaults(self):
        a = AnalysisSchema(
            id="x",
            created_at=datetime.utcnow(),
            status="running",
        )
        assert a.alert_count == 0
        assert a.alerts == []
        assert a.log_entries == []
        assert a.summary is None
        assert a.raw_result is None


class TestChatSchemas:
    def test_chat_request_schema(self):
        req = ChatRequestSchema(message="¿Cómo está la red?")
        assert req.message == "¿Cómo está la red?"

    def test_chat_request_requires_message(self):
        with pytest.raises(Exception):  # ValidationError
            ChatRequestSchema()

    def test_chat_response_schema(self):
        resp = ChatResponseSchema(content="Todo bien.")
        assert resp.content == "Todo bien."
        assert resp.role == "assistant"

    def test_chat_response_default_role(self):
        resp = ChatResponseSchema(content="X")
        assert resp.role == "assistant"


class TestRunAnalysisResponseSchema:
    def test_valid_response(self):
        r = RunAnalysisResponseSchema(analysis_id="abc-123", status="running")
        assert r.analysis_id == "abc-123"
        assert r.status == "running"

    def test_requires_both_fields(self):
        with pytest.raises(Exception):  # ValidationError
            RunAnalysisResponseSchema(analysis_id="x")

    def test_done_status(self):
        r = RunAnalysisResponseSchema(analysis_id="x", status="done")
        assert r.status == "done"

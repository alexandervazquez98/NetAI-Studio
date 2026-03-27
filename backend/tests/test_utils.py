"""
Tests for backend utility functions.

No external services needed — all pure Python logic.
"""

import pytest
from unittest.mock import MagicMock

from backend.utils.topology_classifier import (
    classify_node_role,
    classify_site_observability,
    infer_sdwan_metrics_from_uplink,
)


class TestTopologyClassifier:
    def test_classify_core_internal(self):
        role = classify_node_role(
            "core_internal", wan_facing=False, zone="planta_interna"
        )
        assert role == "Core Internal Switch"

    def test_classify_core_external_wan_facing(self):
        role = classify_node_role(
            "core_external", wan_facing=True, zone="planta_externa"
        )
        assert "WAN" in role or "External" in role

    def test_classify_core_external_not_wan_facing(self):
        role = classify_node_role(
            "core_external", wan_facing=False, zone="planta_externa"
        )
        assert "External" in role

    def test_classify_aviat_ctr(self):
        role = classify_node_role("aviat_ctr", wan_facing=True, zone="wan")
        assert "Aviat" in role or "WAN" in role or "Gateway" in role

    def test_classify_sdwan_cpe(self):
        role = classify_node_role("sdwan_cpe", wan_facing=True, zone="wan")
        assert "SD-WAN" in role or "CPE" in role

    def test_classify_access_switch_external_zone(self):
        role = classify_node_role("access_switch", wan_facing=False, zone="external")
        assert "Access" in role and "External" in role

    def test_classify_access_switch_internal_zone(self):
        role = classify_node_role("access_switch", wan_facing=False, zone="internal")
        assert "Access Switch" in role

    def test_classify_unknown_node_type(self):
        role = classify_node_role("mystery_device", wan_facing=False, zone="unknown")
        assert "mystery_device" in role or role != ""

    def test_mpls_site_is_full_observability(self):
        ctx = classify_site_observability("mpls_aviat")
        assert ctx.get("observability") == "full"
        assert ctx.get("wan_type") == "mpls_aviat"

    def test_mpls_site_has_no_limitations(self):
        ctx = classify_site_observability("mpls_aviat")
        assert ctx.get("limitations") == []

    def test_mpls_site_accessible_protocols(self):
        ctx = classify_site_observability("mpls_aviat")
        accessible = ctx.get("accessible", [])
        assert "snmp" in accessible
        assert "ssh" in accessible

    def test_sdwan_site_is_partial_observability(self):
        ctx = classify_site_observability("sdwan")
        assert ctx.get("observability") == "partial"
        assert ctx.get("wan_type") == "sdwan"

    def test_sdwan_site_has_limitations(self):
        ctx = classify_site_observability("sdwan")
        limitations = ctx.get("limitations", [])
        assert len(limitations) > 0

    def test_sdwan_site_not_accessible_includes_tunnel(self):
        ctx = classify_site_observability("sdwan")
        not_accessible = ctx.get("not_accessible", [])
        assert "tunnel_state" in not_accessible

    def test_unknown_wan_type_returns_unknown_observability(self):
        ctx = classify_site_observability("fiber_idk")
        assert ctx.get("observability") == "unknown"

    def test_infer_sdwan_metrics_returns_dict(self):
        counters = {
            "in_octets": 1_000_000,
            "out_octets": 800_000,
            "capacity_mbps": 100.0,
            "interval_seconds": 300,
        }
        result = infer_sdwan_metrics_from_uplink(counters)
        assert isinstance(result, dict)

    def test_infer_sdwan_metrics_has_not_available_list(self):
        counters = {"in_octets": 0, "out_octets": 0}
        result = infer_sdwan_metrics_from_uplink(counters)
        assert "not_available" in result
        assert isinstance(result["not_available"], list)
        assert len(result["not_available"]) > 0

    def test_infer_sdwan_metrics_never_invents_latency(self):
        counters = {}
        result = infer_sdwan_metrics_from_uplink(counters)
        # latency_ms must NOT be present — it's in not_available, not as a value
        assert result.get("latency_ms") is None

    def test_infer_sdwan_metrics_inferred_flag(self):
        result = infer_sdwan_metrics_from_uplink({})
        assert result.get("inferred") is True

    def test_infer_sdwan_metrics_computes_in_mbps(self):
        # 1,200,000 bytes in 300s @ 8 bits = 32 Mbps
        counters = {"in_octets": 1_200_000_000, "interval_seconds": 300}
        result = infer_sdwan_metrics_from_uplink(counters)
        assert result.get("in_mbps") is not None
        assert result["in_mbps"] > 0

    def test_infer_sdwan_metrics_null_when_no_counters(self):
        result = infer_sdwan_metrics_from_uplink({})
        assert result.get("in_mbps") is None
        assert result.get("out_mbps") is None
        assert result.get("utilization_pct") is None

    def test_infer_sdwan_metrics_has_limitations(self):
        result = infer_sdwan_metrics_from_uplink({})
        assert "limitations" in result
        assert len(result["limitations"]) > 0


class TestGraphBuilder:
    """
    graph_builder.build_network_graph_json() takes SQLAlchemy model instances.
    We create lightweight MagicMock objects that mimic the model attributes.
    """

    def _make_site(self, id="s1", name="HQ", role="hub", wan_type="mpls_aviat"):
        s = MagicMock()
        s.id = id
        s.name = name
        s.role = role
        s.wan_type = wan_type
        s.observable_boundary = None
        return s

    def _make_node(
        self,
        id="n1",
        site_id="s1",
        label="SW-01",
        node_type="core_internal",
        vendor="Cisco",
        observable=True,
        wan_facing=False,
    ):
        n = MagicMock()
        n.id = id
        n.site_id = site_id
        n.label = label
        n.node_type = node_type
        n.vendor = vendor
        n.management_ip = None
        n.role = None
        n.zone = None
        n.observable = observable
        n.wan_facing = wan_facing
        n.signal_dbm = None
        n.port_count = None
        n.meta = {}
        n.position_x = 0.0
        n.position_y = 0.0
        return n

    def _make_edge(self, id="e1", source_id="n1", target_id="n2"):
        e = MagicMock()
        e.id = id
        e.source_id = source_id
        e.target_id = target_id
        e.edge_type = "fiber"
        e.vrf = None
        e.capacity_mbps = None
        e.meta = {}
        return e

    def test_build_with_empty_inputs(self):
        from backend.utils.graph_builder import build_network_graph_json

        result = build_network_graph_json(sites=[], nodes=[], edges=[])
        assert isinstance(result, dict)

    def test_build_returns_required_keys(self):
        from backend.utils.graph_builder import build_network_graph_json

        result = build_network_graph_json(sites=[], nodes=[], edges=[])
        for key in ("version", "sites", "nodes", "edges", "summary"):
            assert key in result

    def test_build_includes_summary(self):
        from backend.utils.graph_builder import build_network_graph_json

        result = build_network_graph_json(sites=[], nodes=[], edges=[])
        assert result["summary"]["total_sites"] == 0
        assert result["summary"]["total_nodes"] == 0

    def test_build_with_one_site(self):
        from backend.utils.graph_builder import build_network_graph_json

        site = self._make_site()
        result = build_network_graph_json(sites=[site], nodes=[], edges=[])
        assert result["summary"]["total_sites"] == 1
        assert len(result["sites"]) == 1

    def test_build_with_site_and_nodes(self):
        from backend.utils.graph_builder import build_network_graph_json

        site = self._make_site(id="s1")
        node1 = self._make_node(id="n1", site_id="s1", observable=True)
        node2 = self._make_node(id="n2", site_id="s1", observable=False)
        result = build_network_graph_json(sites=[site], nodes=[node1, node2], edges=[])
        assert result["summary"]["total_nodes"] == 2
        assert result["summary"]["observable_nodes"] == 1

    def test_build_counts_wan_facing_nodes(self):
        from backend.utils.graph_builder import build_network_graph_json

        site = self._make_site(id="s1")
        node1 = self._make_node(id="n1", site_id="s1", wan_facing=True)
        node2 = self._make_node(id="n2", site_id="s1", wan_facing=False)
        result = build_network_graph_json(sites=[site], nodes=[node1, node2], edges=[])
        assert result["summary"]["wan_facing_nodes"] == 1

    def test_build_with_edge(self):
        from backend.utils.graph_builder import build_network_graph_json

        site = self._make_site(id="s1")
        node1 = self._make_node(id="n1", site_id="s1")
        node2 = self._make_node(id="n2", site_id="s1")
        edge = self._make_edge(id="e1", source_id="n1", target_id="n2")
        result = build_network_graph_json(
            sites=[site], nodes=[node1, node2], edges=[edge]
        )
        assert result["summary"]["total_edges"] == 1
        assert len(result["edges"]) == 1
        assert result["edges"][0]["source"] == "n1"
        assert result["edges"][0]["target"] == "n2"


class TestJsonUtils:
    """Tests for backend.utils.json_utils.extract_json_from_llm_response."""

    def _fn(self):
        from backend.utils.json_utils import extract_json_from_llm_response
        return extract_json_from_llm_response

    def test_parses_clean_json(self):
        fn = self._fn()
        result = fn('{"summary": "ok", "alerts": [], "suggestions": []}')
        assert result["summary"] == "ok"
        assert result["alerts"] == []

    def test_strips_json_fenced_block(self):
        fn = self._fn()
        text = '```json\n{"summary": "ok", "alerts": []}\n```'
        result = fn(text)
        assert result["summary"] == "ok"

    def test_strips_plain_fenced_block(self):
        fn = self._fn()
        text = '```\n{"commands": ["no shutdown"]}\n```'
        result = fn(text)
        assert result["commands"] == ["no shutdown"]

    def test_extracts_json_from_free_text(self):
        fn = self._fn()
        text = 'Here is the analysis result: {"summary": "all good", "alerts": []} as requested.'
        result = fn(text)
        assert result["summary"] == "all good"

    def test_fallback_on_no_json(self):
        fn = self._fn()
        result = fn("No hay JSON aquí para nada.")
        assert isinstance(result, dict)
        assert "error" in result

    def test_fallback_on_empty_string(self):
        fn = self._fn()
        result = fn("")
        assert isinstance(result, dict)
        assert "error" in result

    def test_fallback_never_raises(self):
        fn = self._fn()
        # Should never raise, regardless of input
        for bad_input in ["", "   ", "Not JSON", "{broken", "null", "[]"]:
            result = fn(bad_input)
            assert isinstance(result, dict)

    def test_datetime_columns_are_timezone_aware(self):
        """Verify that model default factories produce timezone-aware datetimes."""
        from datetime import timezone
        from backend.models.schemas import LogEntrySchema

        entry = LogEntrySchema(agent="test", message="check tz")
        assert entry.created_at.tzinfo is not None
        assert entry.created_at.tzinfo == timezone.utc or entry.created_at.utcoffset() is not None

"""
Tests for MCP server tools with all HTTP calls mocked.

No real network calls or Docker services needed.
The mcp-server root is the working directory, so 'from tools.xxx import ...' works directly.
"""

import pytest
import sys
import os
from unittest.mock import AsyncMock, patch, MagicMock

# Ensure the mcp-server root is in sys.path so 'tools.*' imports resolve.
# When running from mcp-server/ this is already the case, but we add it
# explicitly to support running pytest from the repo root as well.
_mcp_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _mcp_root not in sys.path:
    sys.path.insert(0, _mcp_root)


# ── Helpers ────────────────────────────────────────────────────────────────────


def _make_http_client_mock(json_data: dict, status_code: int = 200):
    """Return a context-manager mock for httpx.AsyncClient that returns json_data."""
    mock_response = MagicMock()
    mock_response.status_code = status_code
    mock_response.json.return_value = json_data
    mock_response.raise_for_status = MagicMock()  # no-op

    mock_client_instance = AsyncMock()
    mock_client_instance.get = AsyncMock(return_value=mock_response)

    mock_client_cm = MagicMock()
    mock_client_cm.__aenter__ = AsyncMock(return_value=mock_client_instance)
    mock_client_cm.__aexit__ = AsyncMock(return_value=None)

    return mock_client_cm


# Flat graph as returned by /api/graph/export (build_network_graph_json format)
_FLAT_GRAPH = {
    "version": "1.0",
    "sites": [
        {
            "id": "HQ",
            "name": "HQ",
            "role": "hub",
            "wan_type": "mpls_aviat",
            "observable_boundary": None,
        },
        {
            "id": "SEDE-F",
            "name": "SEDE-F",
            "role": "spoke",
            "wan_type": "sdwan",
            "observable_boundary": None,
        },
    ],
    "nodes": [
        {
            "id": "SW-HQ-INT-01",
            "site_id": "HQ",
            "label": "SW-HQ-INT-01",
            "node_type": "core_internal",
            "vendor": "Cisco",
            "management_ip": "10.0.0.1",
            "observable": True,
            "wan_facing": False,
            "signal_dbm": None,
            "meta": {},
            "position": {"x": 0, "y": 0},
        },
        {
            "id": "CTR-HQ-01",
            "site_id": "HQ",
            "label": "CTR-HQ-01",
            "node_type": "aviat_ctr",
            "vendor": "Aviat",
            "management_ip": "10.0.0.2",
            "observable": True,
            "wan_facing": True,
            "signal_dbm": -80.0,
            "meta": {"wan_utilization_pct": 90.0},
            "position": {"x": 100, "y": 0},
        },
        {
            "id": "SDWAN-CPE-F",
            "site_id": "SEDE-F",
            "label": "SDWAN-CPE-F",
            "node_type": "sdwan_cpe",
            "vendor": "unknown",
            "management_ip": None,
            "observable": False,
            "wan_facing": True,
            "signal_dbm": None,
            "meta": {},
            "position": {"x": 200, "y": 0},
        },
    ],
    "edges": [],
    "summary": {
        "total_sites": 2,
        "total_nodes": 3,
        "total_edges": 0,
        "observable_nodes": 2,
        "wan_facing_nodes": 2,
    },
}


# ── get_topology_context ───────────────────────────────────────────────────────


class TestGetTopologyContext:
    @pytest.mark.asyncio
    async def test_full_summary_scope_returns_dict(self):
        from tools.topology import get_topology_context

        mock_cm = _make_http_client_mock(_FLAT_GRAPH)
        with patch("tools.topology.httpx.AsyncClient", return_value=mock_cm):
            result = await get_topology_context(scope="full_summary")
        assert isinstance(result, dict)

    @pytest.mark.asyncio
    async def test_full_summary_has_scope_key(self):
        from tools.topology import get_topology_context

        mock_cm = _make_http_client_mock(_FLAT_GRAPH)
        with patch("tools.topology.httpx.AsyncClient", return_value=mock_cm):
            result = await get_topology_context(scope="full_summary")
        assert result.get("scope") == "full_summary"

    @pytest.mark.asyncio
    async def test_full_summary_lists_sites(self):
        from tools.topology import get_topology_context

        mock_cm = _make_http_client_mock(_FLAT_GRAPH)
        with patch("tools.topology.httpx.AsyncClient", return_value=mock_cm):
            result = await get_topology_context(scope="full_summary")
        assert "sites" in result
        assert isinstance(result["sites"], list)

    @pytest.mark.asyncio
    async def test_site_scope_returns_nodes_for_site(self):
        from tools.topology import get_topology_context

        mock_cm = _make_http_client_mock(_FLAT_GRAPH)
        with patch("tools.topology.httpx.AsyncClient", return_value=mock_cm):
            result = await get_topology_context(scope="site", target="HQ")
        assert isinstance(result, dict)
        if "error" not in result:
            assert "nodes" in result

    @pytest.mark.asyncio
    async def test_site_scope_unknown_target_returns_error(self):
        from tools.topology import get_topology_context

        mock_cm = _make_http_client_mock(_FLAT_GRAPH)
        with patch("tools.topology.httpx.AsyncClient", return_value=mock_cm):
            result = await get_topology_context(
                scope="site", target="NONEXISTENT-SITE-XYZ"
            )
        assert "error" in result

    @pytest.mark.asyncio
    async def test_max_nodes_limits_output(self):
        from tools.topology import get_topology_context

        large_graph = dict(_FLAT_GRAPH)
        large_graph["sites"] = [
            {"id": "BIG", "name": "BIG", "role": "hub", "wan_type": "mpls_aviat"}
        ]
        large_graph["nodes"] = [
            {
                "id": f"NODE-{i}",
                "site_id": "BIG",
                "label": f"NODE-{i}",
                "node_type": "core_internal",
                "vendor": "Cisco",
                "wan_facing": False,
                "observable": True,
                "signal_dbm": None,
                "meta": {},
            }
            for i in range(20)
        ]

        mock_cm = _make_http_client_mock(large_graph)
        with patch("tools.topology.httpx.AsyncClient", return_value=mock_cm):
            result = await get_topology_context(scope="site", target="BIG", max_nodes=5)
        if "nodes" in result:
            assert len(result["nodes"]) <= 5

    @pytest.mark.asyncio
    async def test_backend_error_returns_error_dict(self):
        from tools.topology import get_topology_context

        mock_client_instance = AsyncMock()
        mock_client_instance.get = AsyncMock(
            side_effect=Exception("Connection refused")
        )
        mock_cm = MagicMock()
        mock_cm.__aenter__ = AsyncMock(return_value=mock_client_instance)
        mock_cm.__aexit__ = AsyncMock(return_value=None)

        with patch("tools.topology.httpx.AsyncClient", return_value=mock_cm):
            result = await get_topology_context(scope="full_summary")
        assert "error" in result


# ── get_wan_link_metrics ───────────────────────────────────────────────────────


class TestGetWanLinkMetrics:
    @pytest.mark.asyncio
    async def test_sdwan_site_returns_observable_false(self):
        from tools.metrics import get_wan_link_metrics

        mock_cm = _make_http_client_mock(_FLAT_GRAPH)
        with patch("tools.metrics.httpx.AsyncClient", return_value=mock_cm):
            result = await get_wan_link_metrics(site_id="SEDE-F")
        assert isinstance(result, dict)
        assert result.get("observable") is False

    @pytest.mark.asyncio
    async def test_sdwan_site_has_not_available_list(self):
        from tools.metrics import get_wan_link_metrics

        mock_cm = _make_http_client_mock(_FLAT_GRAPH)
        with patch("tools.metrics.httpx.AsyncClient", return_value=mock_cm):
            result = await get_wan_link_metrics(site_id="SEDE-F")
        assert "not_available" in result
        assert isinstance(result["not_available"], list)
        assert len(result["not_available"]) > 0

    @pytest.mark.asyncio
    async def test_sdwan_site_never_invents_signal_dbm(self):
        from tools.metrics import get_wan_link_metrics

        mock_cm = _make_http_client_mock(_FLAT_GRAPH)
        with patch("tools.metrics.httpx.AsyncClient", return_value=mock_cm):
            result = await get_wan_link_metrics(site_id="SEDE-F")
        metrics = result.get("metrics") or {}
        if "signal_dbm" in metrics:
            assert metrics["signal_dbm"] is None

    @pytest.mark.asyncio
    async def test_mpls_site_returns_observable_true(self):
        from tools.metrics import get_wan_link_metrics

        mock_cm = _make_http_client_mock(_FLAT_GRAPH)
        with patch("tools.metrics.httpx.AsyncClient", return_value=mock_cm):
            result = await get_wan_link_metrics(site_id="HQ")
        assert isinstance(result, dict)
        assert result.get("observable") is True

    @pytest.mark.asyncio
    async def test_nonexistent_site_returns_error(self):
        from tools.metrics import get_wan_link_metrics

        mock_cm = _make_http_client_mock(_FLAT_GRAPH)
        with patch("tools.metrics.httpx.AsyncClient", return_value=mock_cm):
            result = await get_wan_link_metrics(site_id="NONEXISTENT")
        assert "error" in result

    @pytest.mark.asyncio
    async def test_never_invents_metrics_when_unavailable(self):
        from tools.metrics import get_wan_link_metrics

        empty_graph = {
            "version": "1.0",
            "sites": [],
            "nodes": [],
            "edges": [],
            "summary": {},
        }
        mock_cm = _make_http_client_mock(empty_graph)
        with patch("tools.metrics.httpx.AsyncClient", return_value=mock_cm):
            result = await get_wan_link_metrics(site_id="NONEXISTENT")
        assert isinstance(result, dict)
        for key in ("latency_ms", "signal_dbm", "utilization_pct"):
            if key in result:
                assert result[key] is None or isinstance(result[key], (int, float))


# ── get_anomalies ──────────────────────────────────────────────────────────────


class TestGetAnomalies:
    @pytest.mark.asyncio
    async def test_returns_list(self):
        from tools.anomalies import get_anomalies

        mock_cm = _make_http_client_mock(_FLAT_GRAPH)
        with patch("tools.anomalies.httpx.AsyncClient", return_value=mock_cm):
            result = await get_anomalies(severity="all")
        assert isinstance(result, list)

    @pytest.mark.asyncio
    async def test_aviat_signal_below_threshold_produces_critical_anomaly(self):
        """CTR-HQ-01 has signal_dbm=-80 which is < -70 threshold → critical."""
        from tools.anomalies import get_anomalies

        mock_cm = _make_http_client_mock(_FLAT_GRAPH)
        with patch("tools.anomalies.httpx.AsyncClient", return_value=mock_cm):
            result = await get_anomalies(severity="all")

        critical = [a for a in result if a.get("severity") == "critical"]
        assert len(critical) >= 1

    @pytest.mark.asyncio
    async def test_anomalies_have_required_fields(self):
        from tools.anomalies import get_anomalies

        mock_cm = _make_http_client_mock(_FLAT_GRAPH)
        with patch("tools.anomalies.httpx.AsyncClient", return_value=mock_cm):
            result = await get_anomalies(severity="all")

        for anomaly in result:
            assert "severity" in anomaly
            assert anomaly["severity"] in ("critical", "warning", "info")
            assert "node" in anomaly or "error" in anomaly

    @pytest.mark.asyncio
    async def test_severity_filter_critical_only(self):
        from tools.anomalies import get_anomalies

        mock_cm = _make_http_client_mock(_FLAT_GRAPH)
        with patch("tools.anomalies.httpx.AsyncClient", return_value=mock_cm):
            result = await get_anomalies(severity="critical")
        for anomaly in result:
            assert anomaly.get("severity") == "critical"

    @pytest.mark.asyncio
    async def test_severity_filter_warning_only(self):
        from tools.anomalies import get_anomalies

        mock_cm = _make_http_client_mock(_FLAT_GRAPH)
        with patch("tools.anomalies.httpx.AsyncClient", return_value=mock_cm):
            result = await get_anomalies(severity="warning")
        for anomaly in result:
            assert anomaly.get("severity") == "warning"

    @pytest.mark.asyncio
    async def test_empty_topology_returns_empty_list(self):
        from tools.anomalies import get_anomalies

        empty_graph = {
            "version": "1.0",
            "sites": [],
            "nodes": [],
            "edges": [],
            "summary": {},
        }
        mock_cm = _make_http_client_mock(empty_graph)
        with patch("tools.anomalies.httpx.AsyncClient", return_value=mock_cm):
            result = await get_anomalies(severity="all")
        assert isinstance(result, list)
        assert len(result) == 0

    @pytest.mark.asyncio
    async def test_backend_error_returns_error_item(self):
        from tools.anomalies import get_anomalies

        mock_client_instance = AsyncMock()
        mock_client_instance.get = AsyncMock(side_effect=Exception("Timeout"))
        mock_cm = MagicMock()
        mock_cm.__aenter__ = AsyncMock(return_value=mock_client_instance)
        mock_cm.__aexit__ = AsyncMock(return_value=None)

        with patch("tools.anomalies.httpx.AsyncClient", return_value=mock_cm):
            result = await get_anomalies(severity="all")
        assert isinstance(result, list)
        assert len(result) >= 1
        assert "error" in result[0]

    @pytest.mark.asyncio
    async def test_single_aviat_node_produces_info_redundancy_warning(self):
        """MPLS site with a single Aviat CTR → info-level redundancy warning."""
        from tools.anomalies import get_anomalies

        mock_cm = _make_http_client_mock(_FLAT_GRAPH)
        with patch("tools.anomalies.httpx.AsyncClient", return_value=mock_cm):
            result = await get_anomalies(severity="all")

        info = [
            a
            for a in result
            if a.get("severity") == "info" and a.get("metric") == "wan_redundancy"
        ]
        assert len(info) >= 1


# ── push_config ────────────────────────────────────────────────────────────────


class TestPushConfig:
    @pytest.mark.asyncio
    async def test_dry_run_default_is_true(self):
        import inspect
        from tools.config import push_config

        sig = inspect.signature(push_config)
        params = sig.parameters
        assert "dry_run" in params
        assert params["dry_run"].default is True

    @pytest.mark.asyncio
    async def test_dry_run_returns_commands_not_applied(self):
        from tools.config import push_config

        result = await push_config(
            host="10.0.0.1",
            config=["interface GigabitEthernet0/1", "no shutdown"],
            dry_run=True,
        )
        assert isinstance(result, dict)
        assert result.get("dry_run") is True
        assert result.get("applied") is False

    @pytest.mark.asyncio
    async def test_dry_run_returns_provided_commands(self):
        from tools.config import push_config

        cmds = ["interface GigabitEthernet0/1", "no shutdown"]
        result = await push_config(host="10.0.0.1", config=cmds, dry_run=True)
        assert result.get("commands") == cmds

    @pytest.mark.asyncio
    async def test_empty_config_returns_early(self):
        from tools.config import push_config

        result = await push_config(host="10.0.0.1", config=[], dry_run=True)
        assert result.get("applied") is False
        assert result.get("error") is not None

    @pytest.mark.asyncio
    async def test_no_real_push_when_require_approval_enabled(self):
        """push_config with dry_run=False is blocked when REQUIRE_APPROVAL=true."""
        import tools.config as config_mod

        original = config_mod.REQUIRE_APPROVAL
        config_mod.REQUIRE_APPROVAL = True
        try:
            from tools.config import push_config

            result = await push_config(
                host="10.0.0.1",
                config=["no shutdown"],
                dry_run=False,
            )
            assert result.get("applied") is False
            assert result.get("error") is not None
            assert (
                "approval" in result.get("error", "").lower()
                or "require" in result.get("error", "").lower()
            )
        finally:
            config_mod.REQUIRE_APPROVAL = original

    @pytest.mark.asyncio
    async def test_dry_run_output_mentions_host(self):
        from tools.config import push_config

        result = await push_config(
            host="192.168.1.1",
            config=["show version"],
            dry_run=True,
        )
        output = result.get("output", "")
        assert "192.168.1.1" in output

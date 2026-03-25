"""
Tests for backend AI agents with all external dependencies mocked.

No real Anthropic API, Redis, SNMP, or Aviat API calls are made.
"""

import pytest
import inspect
from unittest.mock import AsyncMock, MagicMock, patch


class TestAnalystAgent:
    @pytest.mark.asyncio
    async def test_analyze_returns_structured_dict(
        self, mock_anthropic_response, sample_topology, sample_metrics
    ):
        with (
            patch("backend.agents.analyst_agent.anthropic") as mock_anthropic_module,
            patch(
                "backend.agents.analyst_agent.publish_message", new_callable=AsyncMock
            ),
        ):
            mock_client = MagicMock()
            mock_client.messages.create = AsyncMock(
                return_value=mock_anthropic_response
            )
            mock_anthropic_module.AsyncAnthropic.return_value = mock_client

            from backend.agents.analyst_agent import AnalystAgent

            agent = AnalystAgent()

            result = await agent.analyze(
                topology=sample_topology,
                metrics=sample_metrics,
                analysis_id="test-123",
            )

            assert isinstance(result, dict)
            assert "summary" in result
            assert "alerts" in result
            assert "suggestions" in result

    @pytest.mark.asyncio
    async def test_analyze_parses_alerts_correctly(
        self, mock_anthropic_response, sample_topology, sample_metrics
    ):
        with (
            patch("backend.agents.analyst_agent.anthropic") as mock_anthropic_module,
            patch(
                "backend.agents.analyst_agent.publish_message", new_callable=AsyncMock
            ),
        ):
            mock_client = MagicMock()
            mock_client.messages.create = AsyncMock(
                return_value=mock_anthropic_response
            )
            mock_anthropic_module.AsyncAnthropic.return_value = mock_client

            from backend.agents.analyst_agent import AnalystAgent

            agent = AnalystAgent()

            result = await agent.analyze(sample_topology, sample_metrics, "test-123")

            assert len(result["alerts"]) >= 1
            alert = result["alerts"][0]
            assert alert["severity"] in ("critical", "warning", "info")
            assert "node" in alert
            assert "site" in alert

    @pytest.mark.asyncio
    async def test_analyze_handles_malformed_json_gracefully(
        self, sample_topology, sample_metrics
    ):
        bad_response = MagicMock(
            content=[MagicMock(text="This is not valid JSON at all.")]
        )
        with (
            patch("backend.agents.analyst_agent.anthropic") as mock_anthropic_module,
            patch(
                "backend.agents.analyst_agent.publish_message", new_callable=AsyncMock
            ),
        ):
            mock_client = MagicMock()
            mock_client.messages.create = AsyncMock(return_value=bad_response)
            mock_anthropic_module.AsyncAnthropic.return_value = mock_client

            from backend.agents.analyst_agent import AnalystAgent

            agent = AnalystAgent()

            # Should not raise — _extract_json falls back to an error dict
            result = await agent.analyze(sample_topology, sample_metrics, "test-123")
            assert isinstance(result, dict)
            # Fallback always includes these keys
            assert "summary" in result
            assert "alerts" in result
            assert "suggestions" in result

    @pytest.mark.asyncio
    async def test_analyze_raises_when_no_api_key(
        self, sample_topology, sample_metrics
    ):
        with patch("backend.agents.analyst_agent.settings") as mock_settings:
            mock_settings.anthropic_api_key = ""
            from backend.agents.analyst_agent import AnalystAgent

            agent = AnalystAgent()
            with pytest.raises(RuntimeError, match="ANTHROPIC_API_KEY"):
                await agent.analyze(sample_topology, sample_metrics, "test-no-key")

    def test_extract_json_strips_markdown_fences(self):
        from backend.agents.analyst_agent import AnalystAgent

        text = '```json\n{"summary": "ok", "alerts": [], "suggestions": [], "limitations": []}\n```'
        result = AnalystAgent._extract_json(text)
        assert result["summary"] == "ok"

    def test_extract_json_parses_plain_json(self):
        from backend.agents.analyst_agent import AnalystAgent

        text = '{"summary": "test", "alerts": [], "suggestions": [], "limitations": []}'
        result = AnalystAgent._extract_json(text)
        assert isinstance(result, dict)

    def test_extract_json_fallback_on_garbage(self):
        from backend.agents.analyst_agent import AnalystAgent

        result = AnalystAgent._extract_json(
            "This is completely unstructured text with no JSON"
        )
        # Must return safe fallback dict — never raise
        assert isinstance(result, dict)
        assert "summary" in result
        assert "alerts" in result


class TestConfigAgent:
    def test_generate_config_signature_has_dry_run(self):
        from backend.agents.config_agent import ConfigAgent

        sig = inspect.signature(ConfigAgent.generate_config)
        params = sig.parameters
        assert "dry_run" in params

    def test_generate_config_dry_run_defaults_to_none_resolved_by_settings(self):
        from backend.agents.config_agent import ConfigAgent

        sig = inspect.signature(ConfigAgent.generate_config)
        # default is None — actual value resolved from settings.config_agent_dry_run_default
        assert sig.parameters["dry_run"].default is None

    @pytest.mark.asyncio
    async def test_generate_config_skips_if_no_config_change_required(self):
        from backend.agents.config_agent import ConfigAgent

        agent = ConfigAgent()
        suggestion = {
            "requires_config_change": False,
            "target": "CTR-HQ-01",
            "action": "Monitor signal level",
        }
        result = await agent.generate_config(suggestion, dry_run=True)
        assert isinstance(result, dict)
        assert result.get("applied") is False
        assert result.get("commands") == []

    @pytest.mark.asyncio
    async def test_generate_config_dry_run_returns_commands_without_applying(self):
        suggestion = {
            "requires_config_change": True,
            "target": "SW-HQ-INT-01",
            "action": "Add VLAN 100",
        }
        mock_claude_response = MagicMock(
            content=[
                MagicMock(
                    text='{"commands": ["interface GigabitEthernet0/1", "switchport access vlan 100"], "verification_commands": ["show vlan brief"], "rollback_commands": ["no vlan 100"], "warnings": [], "notes": "Test"}'
                )
            ]
        )
        with (
            patch("backend.agents.config_agent.anthropic") as mock_anthropic_module,
            patch("backend.agents.config_agent.settings") as mock_settings,
        ):
            mock_settings.anthropic_api_key = "fake-key"
            mock_settings.config_agent_dry_run_default = True
            mock_settings.config_agent_require_approval = True

            mock_client = MagicMock()
            mock_client.messages.create = AsyncMock(return_value=mock_claude_response)
            mock_anthropic_module.AsyncAnthropic.return_value = mock_client

            from backend.agents.config_agent import ConfigAgent

            agent = ConfigAgent()

            result = await agent.generate_config(suggestion, dry_run=True)

            assert isinstance(result, dict)
            assert result.get("dry_run") is True
            assert result.get("applied") is False
            assert len(result.get("commands", [])) > 0

    @pytest.mark.asyncio
    async def test_generate_config_live_blocked_by_require_approval(self):
        suggestion = {
            "requires_config_change": True,
            "target": "SW-HQ-INT-01",
            "action": "Test action",
            "approved": False,
        }
        mock_claude_response = MagicMock(
            content=[
                MagicMock(
                    text='{"commands": ["no shutdown"], "verification_commands": [], "rollback_commands": [], "warnings": []}'
                )
            ]
        )
        with (
            patch("backend.agents.config_agent.anthropic") as mock_anthropic_module,
            patch("backend.agents.config_agent.settings") as mock_settings,
        ):
            mock_settings.anthropic_api_key = "fake-key"
            mock_settings.config_agent_dry_run_default = False
            mock_settings.config_agent_require_approval = True

            mock_client = MagicMock()
            mock_client.messages.create = AsyncMock(return_value=mock_claude_response)
            mock_anthropic_module.AsyncAnthropic.return_value = mock_client

            from backend.agents.config_agent import ConfigAgent

            agent = ConfigAgent()

            with pytest.raises(PermissionError, match="approval"):
                await agent.generate_config(suggestion, dry_run=False)

    def test_parse_json_response_handles_markdown_fence(self):
        from backend.agents.config_agent import ConfigAgent

        text = '```json\n{"commands": ["no shutdown"], "warnings": []}\n```'
        result = ConfigAgent._parse_json_response(text)
        assert "commands" in result
        assert result["commands"] == ["no shutdown"]

    def test_parse_json_response_fallback_on_garbage(self):
        from backend.agents.config_agent import ConfigAgent

        result = ConfigAgent._parse_json_response("not json")
        # Must return dict with empty commands, never raise
        assert isinstance(result, dict)
        assert "commands" in result


class TestTopologyAgent:
    @pytest.mark.asyncio
    async def test_build_context_returns_dict(self):
        from backend.agents.topology_agent import TopologyAgent

        agent = TopologyAgent()

        # Mock the DB session — execute().scalars().all() returns []
        def make_scalar_result(items):
            scalar_result = MagicMock()
            scalar_result.all.return_value = items
            exec_result = MagicMock()
            exec_result.scalars.return_value = scalar_result
            return exec_result

        mock_db = AsyncMock()
        mock_db.execute = AsyncMock(return_value=make_scalar_result([]))

        result = await agent.build_context(mock_db)
        assert isinstance(result, dict)

    @pytest.mark.asyncio
    async def test_build_context_returns_required_keys(self):
        from backend.agents.topology_agent import TopologyAgent

        agent = TopologyAgent()

        def make_scalar_result(items):
            scalar_result = MagicMock()
            scalar_result.all.return_value = items
            exec_result = MagicMock()
            exec_result.scalars.return_value = scalar_result
            return exec_result

        mock_db = AsyncMock()
        mock_db.execute = AsyncMock(return_value=make_scalar_result([]))

        result = await agent.build_context(mock_db)
        # graph_builder returns: version, sites, nodes, edges, summary
        for key in ("sites", "nodes", "edges", "summary"):
            assert key in result

    @pytest.mark.asyncio
    async def test_build_context_annotates_sites_with_observability(self):
        """Sites in the result should have an 'observability' key added."""
        from backend.agents.topology_agent import TopologyAgent
        from unittest.mock import MagicMock, AsyncMock

        agent = TopologyAgent()

        # Build a mock site with mpls_aviat wan_type
        mock_site = MagicMock()
        mock_site.id = "HQ"
        mock_site.name = "HQ"
        mock_site.role = "hub"
        mock_site.wan_type = "mpls_aviat"
        mock_site.observable_boundary = None

        call_count = 0

        async def mock_execute(query):
            nonlocal call_count
            scalar_result = MagicMock()
            if call_count == 0:
                scalar_result.all.return_value = [mock_site]
            else:
                scalar_result.all.return_value = []
            call_count += 1
            exec_result = MagicMock()
            exec_result.scalars.return_value = scalar_result
            return exec_result

        mock_db = AsyncMock()
        mock_db.execute = mock_execute

        result = await agent.build_context(mock_db)
        # The first (only) site must now have observability metadata
        if result["sites"]:
            assert "observability" in result["sites"][0]


class TestMetricsAgent:
    @pytest.mark.asyncio
    async def test_collect_metrics_returns_dict(self, sample_topology):
        from backend.agents.metrics_agent import MetricsAgent

        agent = MetricsAgent()

        with (
            patch.object(agent, "_collect_cisco", new_callable=AsyncMock) as mock_cisco,
            patch.object(agent, "_collect_aviat", new_callable=AsyncMock) as mock_aviat,
        ):
            mock_cisco.return_value = {"source": "snmp", "cpu_utilization_pct": 40.0}
            mock_aviat.return_value = {
                "source": "aviat_api",
                "link_metrics": {"signal_dbm": -65.0},
            }

            result = await agent.collect_metrics(sample_topology)
            assert isinstance(result, dict)

    @pytest.mark.asyncio
    async def test_collect_metrics_includes_all_nodes(self, sample_topology):
        from backend.agents.metrics_agent import MetricsAgent

        agent = MetricsAgent()

        with (
            patch.object(agent, "_collect_cisco", new_callable=AsyncMock) as mock_cisco,
            patch.object(agent, "_collect_aviat", new_callable=AsyncMock) as mock_aviat,
        ):
            mock_cisco.return_value = {"source": "snmp"}
            mock_aviat.return_value = {"source": "aviat_api"}

            result = await agent.collect_metrics(sample_topology)
            # sample_topology has 2 nodes: SW-HQ-INT-01 (Cisco) and CTR-HQ-01 (Aviat)
            assert "SW-HQ-INT-01" in result
            assert "CTR-HQ-01" in result

    @pytest.mark.asyncio
    async def test_cisco_node_calls_snmp_collector(self, sample_topology):
        from backend.agents.metrics_agent import MetricsAgent

        agent = MetricsAgent()

        with (
            patch.object(agent, "_collect_cisco", new_callable=AsyncMock) as mock_cisco,
            patch.object(agent, "_collect_aviat", new_callable=AsyncMock) as mock_aviat,
        ):
            mock_cisco.return_value = {"source": "snmp"}
            mock_aviat.return_value = {"source": "aviat_api"}

            await agent.collect_metrics(sample_topology)
            # SW-HQ-INT-01 is vendor=Cisco → _collect_cisco should be called
            mock_cisco.assert_called_once()

    @pytest.mark.asyncio
    async def test_aviat_node_calls_aviat_collector(self, sample_topology):
        from backend.agents.metrics_agent import MetricsAgent

        agent = MetricsAgent()

        with (
            patch.object(agent, "_collect_cisco", new_callable=AsyncMock) as mock_cisco,
            patch.object(agent, "_collect_aviat", new_callable=AsyncMock) as mock_aviat,
        ):
            mock_cisco.return_value = {"source": "snmp"}
            mock_aviat.return_value = {"source": "aviat_api"}

            await agent.collect_metrics(sample_topology)
            # CTR-HQ-01 is node_type=aviat_ctr → _collect_aviat should be called
            mock_aviat.assert_called_once()

    @pytest.mark.asyncio
    async def test_sdwan_cpe_gets_inferred_metrics(self):
        from backend.agents.metrics_agent import MetricsAgent

        agent = MetricsAgent()

        topology_with_sdwan = {
            "nodes": [
                {
                    "id": "SDWAN-CPE-F",
                    "site_id": "SEDE-F",
                    "label": "SDWAN-CPE-F",
                    "node_type": "sdwan_cpe",
                    "vendor": "unknown",
                    "observable": False,
                    "wan_facing": True,
                    "meta": {},
                }
            ],
            "sites": [],
            "edges": [],
        }

        result = await agent.collect_metrics(topology_with_sdwan)
        assert isinstance(result, dict)
        assert "SDWAN-CPE-F" in result
        # SD-WAN node should have source=inferred_sdwan and observable=False
        cpe_metrics = result["SDWAN-CPE-F"]
        assert cpe_metrics.get("source") == "inferred_sdwan"
        assert cpe_metrics.get("observable") is False

    @pytest.mark.asyncio
    async def test_collect_metrics_empty_topology(self):
        from backend.agents.metrics_agent import MetricsAgent

        agent = MetricsAgent()

        result = await agent.collect_metrics({"nodes": [], "sites": [], "edges": []})
        assert result == {}

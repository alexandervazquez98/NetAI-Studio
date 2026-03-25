import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock
import sys
import os

# ── Path setup ────────────────────────────────────────────────────────────────
# When pytest runs from backend/, we need the parent dir so that
# `import backend.xxx` works, AND we add backend/ itself so that
# `import config`, `import database` etc. work directly inside agents/routers.
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_project_dir = os.path.dirname(_backend_dir)

for _p in (_project_dir, _backend_dir):
    if _p not in sys.path:
        sys.path.insert(0, _p)

# ── Fixtures ──────────────────────────────────────────────────────────────────


@pytest.fixture
def mock_anthropic_response():
    """Returns a fake Anthropic message response with valid analyst JSON."""
    return MagicMock(
        content=[
            MagicMock(
                text="""{
            "summary": "Red operando normalmente. Señal de CTR-HQ-01 en nivel crítico.",
            "alerts": [
                {
                    "severity": "critical",
                    "node": "CTR-HQ-01",
                    "site": "HQ",
                    "description": "Señal de microondas por debajo del umbral",
                    "impact": "Riesgo de corte WAN",
                    "metric": "-80dBm",
                    "threshold": "-70dBm"
                }
            ],
            "suggestions": [
                {
                    "priority": "immediate",
                    "target": "CTR-HQ-01",
                    "action": "Verificar alineación de antena",
                    "reasoning": "Señal < -70dBm indica desalineación o interferencia",
                    "requires_config_change": false,
                    "estimated_impact": "Restaurar margen de señal adecuado"
                }
            ],
            "limitations": []
        }"""
            )
        ]
    )


@pytest.fixture
def sample_topology():
    """Returns a minimal valid network_graph dict (flat list format used by agents)."""
    return {
        "version": "1.0",
        "sites": [
            {
                "id": "HQ",
                "name": "HQ",
                "role": "hub",
                "wan_type": "mpls_aviat",
                "observable_boundary": None,
            }
        ],
        "nodes": [
            {
                "id": "SW-HQ-INT-01",
                "site_id": "HQ",
                "label": "SW-HQ-INT-01",
                "node_type": "core_internal",
                "vendor": "Cisco",
                "management_ip": "10.0.0.1",
                "role": None,
                "zone": None,
                "observable": True,
                "wan_facing": False,
                "signal_dbm": None,
                "port_count": None,
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
                "role": None,
                "zone": None,
                "observable": True,
                "wan_facing": True,
                "signal_dbm": -80.0,
                "port_count": None,
                "meta": {},
                "position": {"x": 100, "y": 0},
            },
        ],
        "edges": [],
        "summary": {
            "total_sites": 1,
            "total_nodes": 2,
            "total_edges": 0,
            "observable_nodes": 2,
            "wan_facing_nodes": 1,
        },
    }


@pytest.fixture
def sample_metrics():
    """Returns a minimal metrics dict (keyed by node_id)."""
    return {
        "SW-HQ-INT-01": {
            "source": "snmp",
            "cpu_utilization_pct": 45.0,
            "interface_stats": {
                "GigabitEthernet0/1": {
                    "status": "up",
                    "in_octets": 1000,
                    "out_octets": 800,
                }
            },
        },
        "CTR-HQ-01": {
            "source": "aviat_api",
            "link_metrics": {
                "signal_dbm": -80.0,
                "utilization_pct": 65.0,
                "latency_ms": 12.0,
                "availability_30d": 99.5,
            },
        },
    }

from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

BACKEND_URL = os.environ.get("BACKEND_URL", "http://backend:8000")

# Thresholds
WAN_UTIL_WARNING = 80.0
WAN_UTIL_CRITICAL = 95.0
AVIAT_SIGNAL_CRITICAL = -70.0


async def get_wan_link_metrics(site_id: str) -> Dict[str, Any]:
    """
    Return WAN link metrics for a site.

    For MPLS/Aviat sites:
      Returns capacity_mbps, utilization_pct, signal_dbm, latency_ms, availability_30d.

    For SD-WAN sites:
      Returns inferred metrics from SW-EXT uplink counters with observable=False
      and a not_available list.

    Never invents metrics — returns null with explanation if data unavailable.
    """
    # Fetch topology to determine site type
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(f"{BACKEND_URL}/api/graph/export")
            response.raise_for_status()
            graph: Dict[str, Any] = response.json()
    except Exception as exc:
        logger.error("get_wan_link_metrics: topology fetch failed: %s", exc)
        return {"error": str(exc), "site_id": site_id}

    sites: List[Dict] = graph.get("sites", [])
    nodes: List[Dict] = graph.get("nodes", [])

    # Find the site
    site = next((s for s in sites if s["id"] == site_id or s["name"] == site_id), None)
    if not site:
        return {"error": f"Site '{site_id}' not found", "site_id": site_id}

    wan_type = (site.get("wan_type") or "").lower()
    site_nodes = [n for n in nodes if n.get("site_id") == site["id"]]

    if wan_type == "sdwan":
        return await _sdwan_metrics(site, site_nodes)
    else:
        return await _mpls_aviat_metrics(site, site_nodes)


async def _mpls_aviat_metrics(
    site: Dict[str, Any], site_nodes: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Collect metrics for MPLS/Aviat sites from the Aviat API."""
    aviat_nodes = [n for n in site_nodes if n.get("node_type") == "aviat_ctr"]

    if not aviat_nodes:
        return {
            "site_id": site["id"],
            "site_name": site.get("name"),
            "wan_type": "mpls_aviat",
            "observable": True,
            "error": "No Aviat CTR node found for this site",
            "metrics": None,
        }

    node = aviat_nodes[0]
    ip = node.get("management_ip")
    meta = node.get("meta") or {}
    base_url = meta.get("aviat_api_url") or (f"http://{ip}" if ip else None)

    if not base_url:
        return {
            "site_id": site["id"],
            "site_name": site.get("name"),
            "wan_type": "mpls_aviat",
            "observable": True,
            "node": node.get("label"),
            "error": "Aviat node has no management_ip or api_url configured",
            "metrics": {
                "capacity_mbps": None,
                "utilization_pct": None,
                "signal_dbm": node.get("signal_dbm"),  # May be stored in DB
                "latency_ms": None,
                "availability_30d": None,
            },
        }

    # Try to get live data from Aviat REST API
    try:
        async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
            auth = (
                meta.get("aviat_username", "admin"),
                meta.get("aviat_password", "admin"),
            )
            resp = await client.get(
                f"{base_url}/api/v1/nodes/{node['id']}/link-metrics",
                auth=auth,
            )
            resp.raise_for_status()
            api_data = resp.json()
        metrics = {
            "capacity_mbps": api_data.get("capacity_mbps"),
            "utilization_pct": api_data.get("utilization_pct"),
            "signal_dbm": api_data.get("rsl_dbm") or node.get("signal_dbm"),
            "latency_ms": api_data.get("latency_ms"),
            "availability_30d": api_data.get("availability_30d"),
            "source": "aviat_api",
        }
    except Exception as exc:
        logger.warning("Aviat API error for site %s: %s", site.get("name"), exc)
        # Graceful fallback: use whatever is stored in the topology DB
        metrics = {
            "capacity_mbps": meta.get("capacity_mbps"),
            "utilization_pct": meta.get("wan_utilization_pct"),
            "signal_dbm": node.get("signal_dbm"),
            "latency_ms": None,
            "availability_30d": None,
            "source": "topology_db_fallback",
            "error": str(exc),
        }

    return {
        "site_id": site["id"],
        "site_name": site.get("name"),
        "wan_type": "mpls_aviat",
        "observable": True,
        "node": node.get("label"),
        "metrics": metrics,
    }


async def _sdwan_metrics(
    site: Dict[str, Any], site_nodes: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Return inferred metrics for SD-WAN sites from SW-EXT uplink counters."""
    ext_switches = [n for n in site_nodes if n.get("node_type") == "core_external"]

    inferred_metrics = None
    if ext_switches:
        sw_ext = ext_switches[0]
        meta = sw_ext.get("meta") or {}
        uplink_counters = meta.get("uplink_counters", {})
        if uplink_counters:
            # Basic inference from counters
            in_octets = uplink_counters.get("in_octets")
            out_octets = uplink_counters.get("out_octets")
            capacity_mbps = uplink_counters.get("capacity_mbps")
            interval_s = uplink_counters.get("interval_seconds", 300)

            def octets_to_mbps(octets, interval):
                if octets is not None and interval > 0:
                    return round((octets * 8) / (interval * 1_000_000), 2)
                return None

            out_mbps = octets_to_mbps(out_octets, interval_s)
            in_mbps = octets_to_mbps(in_octets, interval_s)
            util_pct = (
                round((out_mbps / capacity_mbps) * 100, 1)
                if (out_mbps and capacity_mbps)
                else None
            )

            inferred_metrics = {
                "in_mbps": in_mbps,
                "out_mbps": out_mbps,
                "utilization_pct": util_pct,
                "signal_dbm": None,
                "latency_ms": None,
                "availability_30d": None,
                "source": "sw_ext_uplink_counters",
            }

    return {
        "site_id": site["id"],
        "site_name": site.get("name"),
        "wan_type": "sdwan",
        "observable": False,
        "not_available": [
            "tunnel_state",
            "wan_latency_ms",
            "path_selection",
            "signal_dbm",
            "availability_30d",
            "cpe_health",
        ],
        "limitations": [
            "SD-WAN CPE managed by third party — no direct API access.",
            "WAN metrics inferred from SW-EXT uplink counters only.",
            "Latency, jitter, and path decisions are not observable.",
        ],
        "metrics": inferred_metrics,
    }

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
CPU_WARNING = 70.0


async def get_anomalies(severity: str = "all") -> List[Dict[str, Any]]:
    """
    Detect active network anomalies across the entire topology.

    Detection rules:
    - WAN utilization > 80%  → warning
    - WAN utilization > 95%  → critical
    - Aviat signal < -70dBm  → critical
    - CPU > 70%              → warning
    - Interfaces down        → critical/warning depending on role
    - Nodes without WAN redundancy → info

    Each anomaly: { node, site, metric, value, threshold, severity, estimated_impact }

    severity filter: "all" | "critical" | "warning" | "info"
    """
    # Fetch topology
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            topo_resp = await client.get(f"{BACKEND_URL}/api/graph/export")
            topo_resp.raise_for_status()
            graph: Dict[str, Any] = topo_resp.json()
    except Exception as exc:
        logger.error("get_anomalies: topology fetch failed: %s", exc)
        return [{"error": str(exc), "severity": "error"}]

    sites: List[Dict] = graph.get("sites", [])
    nodes: List[Dict] = graph.get("nodes", [])
    edges: List[Dict] = graph.get("edges", [])

    site_map = {s["id"]: s for s in sites}
    anomalies: List[Dict[str, Any]] = []

    for node in nodes:
        node_id = node["id"]
        node_label = node.get("label", node_id)
        site = site_map.get(node.get("site_id", ""), {})
        site_name = site.get("name", "unknown")
        node_type = (node.get("node_type") or "").lower()
        meta = node.get("meta") or {}

        # --- Aviat signal level ---
        signal_dbm = node.get("signal_dbm")
        if signal_dbm is not None and (node_type == "aviat_ctr"):
            if signal_dbm < AVIAT_SIGNAL_CRITICAL:
                anomalies.append(
                    {
                        "node": node_label,
                        "site": site_name,
                        "metric": "signal_dbm",
                        "value": signal_dbm,
                        "threshold": f"< {AVIAT_SIGNAL_CRITICAL} dBm",
                        "severity": "critical",
                        "estimated_impact": (
                            f"Aviat link at {site_name} is at risk of degradation or imminent failure. "
                            "This is the sole WAN gateway — a failure means complete site outage."
                        ),
                    }
                )

        # --- WAN utilization (from stored metrics) ---
        util_pct = meta.get("wan_utilization_pct")
        capacity_mbps = meta.get("capacity_mbps")
        if util_pct is not None and node.get("wan_facing"):
            if util_pct > WAN_UTIL_CRITICAL:
                anomalies.append(
                    {
                        "node": node_label,
                        "site": site_name,
                        "metric": "wan_utilization_pct",
                        "value": util_pct,
                        "threshold": f"> {WAN_UTIL_CRITICAL}%",
                        "severity": "critical",
                        "estimated_impact": (
                            f"WAN link at {site_name} is critically congested ({util_pct:.1f}%). "
                            "Immediate action required to avoid service degradation."
                        ),
                    }
                )
            elif util_pct > WAN_UTIL_WARNING:
                anomalies.append(
                    {
                        "node": node_label,
                        "site": site_name,
                        "metric": "wan_utilization_pct",
                        "value": util_pct,
                        "threshold": f"> {WAN_UTIL_WARNING}%",
                        "severity": "warning",
                        "estimated_impact": (
                            f"WAN link at {site_name} is approaching congestion ({util_pct:.1f}%). "
                            "Monitor and consider traffic shaping."
                        ),
                    }
                )

        # --- CPU utilization ---
        cpu_pct = meta.get("cpu_utilization_pct")
        if cpu_pct is not None and cpu_pct > CPU_WARNING:
            anomalies.append(
                {
                    "node": node_label,
                    "site": site_name,
                    "metric": "cpu_utilization_pct",
                    "value": cpu_pct,
                    "threshold": f"> {CPU_WARNING}%",
                    "severity": "warning",
                    "estimated_impact": (
                        f"High CPU on {node_label} ({cpu_pct:.1f}%) may affect "
                        "routing convergence and packet processing."
                    ),
                }
            )

        # --- Interface status ---
        interfaces_down = meta.get("interfaces_down", [])
        for iface in interfaces_down:
            is_uplink = iface.get("is_uplink", False)
            sev = "critical" if is_uplink else "warning"
            anomalies.append(
                {
                    "node": node_label,
                    "site": site_name,
                    "metric": "interface_status",
                    "value": "down",
                    "threshold": "operational",
                    "interface": iface.get("name"),
                    "severity": sev,
                    "estimated_impact": (
                        f"Interface {iface.get('name')} on {node_label} is down. "
                        + (
                            "This is an uplink — connectivity impact likely."
                            if is_uplink
                            else ""
                        )
                    ),
                }
            )

    # --- WAN redundancy check (info-level) ---
    for site in sites:
        wan_type = (site.get("wan_type") or "").lower()
        if wan_type == "mpls_aviat":
            site_nodes = [n for n in nodes if n.get("site_id") == site["id"]]
            aviat_nodes = [n for n in site_nodes if n.get("node_type") == "aviat_ctr"]
            if len(aviat_nodes) == 1:
                anomalies.append(
                    {
                        "node": aviat_nodes[0].get("label"),
                        "site": site.get("name"),
                        "metric": "wan_redundancy",
                        "value": "single_path",
                        "threshold": "redundant",
                        "severity": "info",
                        "estimated_impact": (
                            f"Site {site.get('name')} has a single WAN gateway (Aviat CTR). "
                            "Any failure results in total site outage."
                        ),
                    }
                )

    # Filter by severity
    if severity != "all":
        anomalies = [a for a in anomalies if a.get("severity") == severity]

    # Sort: critical first, then warning, then info
    order = {"critical": 0, "warning": 1, "info": 2}
    anomalies.sort(key=lambda a: order.get(a.get("severity", "info"), 3))

    return anomalies

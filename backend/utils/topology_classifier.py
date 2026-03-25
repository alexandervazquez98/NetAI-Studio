from __future__ import annotations

from typing import Any, Dict, Optional


def classify_node_role(node_type: str, wan_facing: bool, zone: str) -> str:
    """
    Return a human-readable role string based on node properties.

    node_type options: core_internal | core_external | aviat_ctr | sdwan_cpe | access_switch
    zone options: internal | external | wan | dmz | etc.
    """
    node_type = (node_type or "").lower()
    zone = (zone or "").lower()

    if node_type == "aviat_ctr":
        return "WAN Gateway (Aviat Microwave)"
    if node_type == "sdwan_cpe":
        return "SD-WAN Edge (CPE)"
    if node_type == "core_external":
        if wan_facing:
            return "Core External Switch (WAN Uplink)"
        return "Core External Switch"
    if node_type == "core_internal":
        return "Core Internal Switch"
    if node_type == "access_switch":
        if zone == "external":
            return "Access Switch (External Zone)"
        return "Access Switch"
    return f"Unknown Node ({node_type})"


def classify_site_observability(wan_type: str) -> Dict[str, Any]:
    """
    Return observability context for a site based on its WAN type.

    wan_type options: mpls_aviat | sdwan
    """
    wan_type = (wan_type or "").lower()

    if wan_type == "mpls_aviat":
        return {
            "wan_type": "mpls_aviat",
            "observability": "full",
            "accessible": ["snmp", "ssh", "aviat_api"],
            "not_accessible": [],
            "limitations": [],
            "description": (
                "Full observability: SNMP, SSH, and Aviat API available. "
                "Can monitor WAN link signal, utilization, routes, and VRFs."
            ),
        }
    elif wan_type == "sdwan":
        return {
            "wan_type": "sdwan",
            "observability": "partial",
            "accessible": ["snmp_lan_side", "ssh_lan_side"],
            "not_accessible": [
                "tunnel_state",
                "wan_latency",
                "path_selection",
                "cpe_config",
            ],
            "limitations": [
                "SD-WAN CPE is managed by a third party — no direct API access.",
                "WAN latency and tunnel state are not visible.",
                "Path selection decisions cannot be observed or influenced.",
                "WAN utilization can only be inferred from SW-EXT uplink counters.",
            ],
            "description": (
                "Partial observability: Only LAN-side switches are accessible. "
                "WAN metrics must be inferred from uplink counters on SW-EXT."
            ),
        }
    else:
        return {
            "wan_type": wan_type,
            "observability": "unknown",
            "accessible": [],
            "not_accessible": [],
            "limitations": [f"Unknown WAN type: {wan_type}"],
            "description": f"Observability unknown for WAN type: {wan_type}",
        }


def infer_sdwan_metrics_from_uplink(uplink_counters: Dict[str, Any]) -> Dict[str, Any]:
    """
    Infer WAN metrics from SW-EXT uplink port counters for SD-WAN sites.

    uplink_counters should contain:
      - in_octets: bytes received on the WAN-facing port
      - out_octets: bytes sent on the WAN-facing port
      - capacity_mbps: link capacity in Mbps (if known)
      - interval_seconds: sampling interval used to compute rates

    Returns inferred metrics with a clear `inferred=True` flag and limitations.
    """
    in_octets: Optional[int] = uplink_counters.get("in_octets")
    out_octets: Optional[int] = uplink_counters.get("out_octets")
    capacity_mbps: Optional[float] = uplink_counters.get("capacity_mbps")
    interval_seconds: int = uplink_counters.get("interval_seconds", 300)

    result: Dict[str, Any] = {
        "inferred": True,
        "source": "sw_ext_uplink_counters",
        "not_available": [
            "tunnel_state",
            "wan_latency_ms",
            "path_selection",
            "signal_dbm",
            "availability_30d",
        ],
        "limitations": [
            "Metrics inferred from SW-EXT uplink counters; actual WAN path not visible.",
            "Latency, jitter, and packet loss are not measurable from this vantage point.",
            "CPE health and SD-WAN path selection cannot be determined.",
        ],
    }

    if in_octets is not None and interval_seconds > 0:
        in_mbps = (in_octets * 8) / (interval_seconds * 1_000_000)
        result["in_mbps"] = round(in_mbps, 2)
    else:
        result["in_mbps"] = None

    if out_octets is not None and interval_seconds > 0:
        out_mbps = (out_octets * 8) / (interval_seconds * 1_000_000)
        result["out_mbps"] = round(out_mbps, 2)
    else:
        result["out_mbps"] = None

    if capacity_mbps and result.get("out_mbps") is not None:
        result["utilization_pct"] = round((result["out_mbps"] / capacity_mbps) * 100, 1)
    else:
        result["utilization_pct"] = None

    return result

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from backend.models.graph import NetworkEdge, NetworkNode, Site

logger = logging.getLogger(__name__)


def build_network_graph_json(
    sites: List[Site],
    nodes: List[NetworkNode],
    edges: List[NetworkEdge],
) -> Dict[str, Any]:
    """
    Convert SQLAlchemy model instances into the network_graph JSON structure
    consumed by AI agents and the MCP topology tool.
    """
    sites_index: Dict[str, Dict] = {}
    for site in sites:
        sites_index[site.id] = {
            "id": site.id,
            "name": site.name,
            "role": site.role,
            "wan_type": site.wan_type,
            "observable_boundary": site.observable_boundary,
            "nodes": [],
        }

    nodes_index: Dict[str, Dict] = {}
    for node in nodes:
        node_dict = {
            "id": node.id,
            "site_id": node.site_id,
            "label": node.label,
            "node_type": node.node_type,
            "vendor": node.vendor,
            "management_ip": node.management_ip,
            "role": node.role,
            "zone": node.zone,
            "observable": node.observable,
            "wan_facing": node.wan_facing,
            "signal_dbm": node.signal_dbm,
            "port_count": node.port_count,
            "meta": node.meta or {},
            "position": {"x": node.position_x, "y": node.position_y},
        }
        nodes_index[node.id] = node_dict
        if node.site_id in sites_index:
            sites_index[node.site_id]["nodes"].append(node.id)

    edges_list: List[Dict] = []
    for edge in edges:
        edges_list.append(
            {
                "id": edge.id,
                "source": edge.source_id,
                "target": edge.target_id,
                "edge_type": edge.edge_type,
                "vrf": edge.vrf,
                "capacity_mbps": edge.capacity_mbps,
                "meta": edge.meta or {},
            }
        )

    return {
        "version": "1.0",
        "sites": list(sites_index.values()),
        "nodes": list(nodes_index.values()),
        "edges": edges_list,
        "summary": {
            "total_sites": len(sites),
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "observable_nodes": sum(1 for n in nodes if n.observable),
            "wan_facing_nodes": sum(1 for n in nodes if n.wan_facing),
        },
    }

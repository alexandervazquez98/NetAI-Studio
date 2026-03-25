from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

BACKEND_URL = os.environ.get("BACKEND_URL", "http://backend:8000")


async def get_topology_context(
    scope: str = "full_summary",
    target: Optional[str] = None,
    include_metrics: bool = False,
    max_nodes: int = 30,
) -> Dict[str, Any]:
    """
    Returns the relevant subgraph for analysis.

    scope:
      - "full_summary"     → top-level summary of all sites (default)
      - "site"             → all nodes in target site
      - "path"             → nodes/edges on the path between two nodes (target="node_a:node_b")
      - "node_neighbors"  → direct neighbors of target node

    target: site name or node ID (depends on scope).
    include_metrics: if True, attach latest metrics from the backend.
    max_nodes: cap the number of nodes returned to avoid context overflow.
    """
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(f"{BACKEND_URL}/api/graph/export")
            response.raise_for_status()
            full_graph: Dict[str, Any] = response.json()
    except Exception as exc:
        logger.error("get_topology_context: backend request failed: %s", exc)
        return {"error": str(exc), "scope": scope}

    sites: List[Dict] = full_graph.get("sites", [])
    nodes: List[Dict] = full_graph.get("nodes", [])
    edges: List[Dict] = full_graph.get("edges", [])

    # --- Filter by scope ---
    if scope == "full_summary":
        # Return a lightweight summary (site names + node counts)
        result_sites = []
        for site in sites:
            site_nodes = [n for n in nodes if n.get("site_id") == site["id"]]
            result_sites.append(
                {
                    "id": site["id"],
                    "name": site["name"],
                    "wan_type": site.get("wan_type"),
                    "role": site.get("role"),
                    "observability": site.get("observability", {}),
                    "node_count": len(site_nodes),
                    "wan_nodes": [
                        n["label"] for n in site_nodes if n.get("wan_facing")
                    ],
                }
            )
        return {
            "scope": "full_summary",
            "sites": result_sites,
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "summary": full_graph.get("summary", {}),
        }

    elif scope == "site" and target:
        # Find site by name or id
        site = next(
            (s for s in sites if s["name"] == target or s["id"] == target), None
        )
        if not site:
            return {"error": f"Site '{target}' not found", "scope": scope}

        site_nodes = [n for n in nodes if n.get("site_id") == site["id"]]
        node_ids = {n["id"] for n in site_nodes}
        site_edges = [
            e
            for e in edges
            if e.get("source") in node_ids or e.get("target") in node_ids
        ]

        # Respect max_nodes cap
        if len(site_nodes) > max_nodes:
            logger.warning(
                "Site '%s' has %d nodes, capping to %d",
                target,
                len(site_nodes),
                max_nodes,
            )
            site_nodes = site_nodes[:max_nodes]

        return {
            "scope": "site",
            "site": site,
            "nodes": site_nodes,
            "edges": site_edges,
        }

    elif scope == "node_neighbors" and target:
        node = next(
            (n for n in nodes if n["id"] == target or n["label"] == target), None
        )
        if not node:
            return {"error": f"Node '{target}' not found", "scope": scope}

        neighbor_edges = [
            e
            for e in edges
            if e.get("source") == node["id"] or e.get("target") == node["id"]
        ]
        neighbor_ids = set()
        for e in neighbor_edges:
            neighbor_ids.add(e["source"])
            neighbor_ids.add(e["target"])
        neighbor_ids.discard(node["id"])

        neighbor_nodes = [n for n in nodes if n["id"] in neighbor_ids]
        return {
            "scope": "node_neighbors",
            "node": node,
            "neighbors": neighbor_nodes[:max_nodes],
            "edges": neighbor_edges,
        }

    elif scope == "path" and target and ":" in target:
        src_label, dst_label = target.split(":", 1)
        src = next(
            (n for n in nodes if n["label"] == src_label or n["id"] == src_label), None
        )
        dst = next(
            (n for n in nodes if n["label"] == dst_label or n["id"] == dst_label), None
        )
        if not src or not dst:
            return {
                "error": f"Could not find nodes for path: {src_label} -> {dst_label}",
                "scope": scope,
            }
        # Simple adjacency traversal (BFS) for path
        path_nodes, path_edges = _bfs_path(src["id"], dst["id"], nodes, edges)
        return {
            "scope": "path",
            "source": src_label,
            "destination": dst_label,
            "path_nodes": path_nodes[:max_nodes],
            "path_edges": path_edges,
        }

    # Fallback: return full graph capped
    return {
        "scope": "full",
        "sites": sites,
        "nodes": nodes[:max_nodes],
        "edges": edges,
        "truncated": len(nodes) > max_nodes,
    }


def _bfs_path(
    start_id: str,
    end_id: str,
    nodes: List[Dict],
    edges: List[Dict],
) -> tuple[List[Dict], List[Dict]]:
    """BFS to find shortest path between two nodes."""
    from collections import deque

    # Build adjacency list
    adj: Dict[str, List[tuple[str, Dict]]] = {}
    for e in edges:
        src, tgt = e.get("source", ""), e.get("target", "")
        adj.setdefault(src, []).append((tgt, e))
        adj.setdefault(tgt, []).append((src, e))

    node_map = {n["id"]: n for n in nodes}

    queue: deque[tuple[str, List[str], List[Dict]]] = deque(
        [(start_id, [start_id], [])]
    )
    visited = {start_id}

    while queue:
        current, path_ids, path_edges = queue.popleft()
        if current == end_id:
            return [node_map[i] for i in path_ids if i in node_map], path_edges

        for neighbor_id, edge in adj.get(current, []):
            if neighbor_id not in visited:
                visited.add(neighbor_id)
                queue.append(
                    (neighbor_id, path_ids + [neighbor_id], path_edges + [edge])
                )

    return [], []

from __future__ import annotations

import logging
from typing import Any, Dict, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.graph import NetworkEdge, NetworkNode, Site
from backend.utils.graph_builder import build_network_graph_json

logger = logging.getLogger(__name__)


class TopologyAgent:
    """
    Queries all topology data from the database and builds a structured
    context dict ready for consumption by the AnalystAgent and MCP tools.
    """

    async def build_context(self, db: AsyncSession) -> Dict[str, Any]:
        """
        Queries all sites, nodes, edges from DB.
        Returns a network_graph dict plus per-site observability metadata.
        """
        try:
            sites = (await db.execute(select(Site))).scalars().all()
            nodes = (await db.execute(select(NetworkNode))).scalars().all()
            edges = (await db.execute(select(NetworkEdge))).scalars().all()
        except Exception as exc:
            logger.error("TopologyAgent: DB query failed: %s", exc)
            raise

        graph = build_network_graph_json(sites, nodes, edges)

        # Annotate each site with observability metadata
        from backend.utils.topology_classifier import classify_site_observability

        for site_dict in graph["sites"]:
            obs = classify_site_observability(site_dict.get("wan_type", ""))
            site_dict["observability"] = obs

        logger.info(
            "TopologyAgent: built context — %d sites, %d nodes, %d edges",
            len(sites),
            len(nodes),
            len(edges),
        )
        return graph
